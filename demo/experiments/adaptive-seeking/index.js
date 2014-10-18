module.exports = (function() {

    var fs = require('fs');
    var util = require('util');
    var $ = require('jquery');
    var extend = require('extend');
    var TweenJs = require('tween.js');
    var lodash = require('lodash');

    var Experiment = require('../../experiment');
    var Player = require('../../../index');

    var template = fs.readFileSync(__dirname + '/ui.tpl');


    function AdaptiveSeeking() {
        Experiment.apply(this, arguments);

        $(this._stage).css({
            width: (this.conf.tileSize * 10) + 'px',
            height: (this.conf.tileSize * 10) + 'px'
        });

        this._playerOptions = {
            seekingMode: Player.seeking.PLAY_FRAMES,
            seekingSpeed: 1024,
            speed: 8
        };

        this._uiOptions = {
            partial: template.toString(),
            direction: Player.directions.FORWARD,
            timelineDebounceTime: 40
        };

        this._tweens = { };
    }

    util.inherits(AdaptiveSeeking, Experiment);

    extend(AdaptiveSeeking.prototype, {
        conf: {
            ease: true,
            tileSize: 50,
            framesCount: 2000,
            tilesPerFrame: 5,
            adaptiveSeeking: false
        },
        load: function() {
            if(this.conf.adaptiveSeeking) {
                this._playerOptions.seekingSpeed = this._adaptiveSeeking();
            } else {
                this._playerOptions.seekingSpeed = 1024;
            }

            Experiment.prototype.load.call(this);

            this._ui.view.set('ease', this.conf.ease);
            this._ui.view.observe('ease', function(value) {
                this.conf.ease = value;
            }.bind(this));

            this._ui.view.set('backward', this._uiOptions.direction === Player.directions.BACKWARD);
            this._ui.view.observe('backward', function(value) {
                if(value) {
                    this._uiOptions.direction = Player.directions.BACKWARD;
                } else {
                    this._uiOptions.direction = Player.directions.FORWARD;
                }

                if(this._player.isPlaying && (this._player.direction !== this._uiOptions.direction)) {
                    this._player.pause();
                    this._player.play(undefined, this._uiOptions.direction);
                }
            }.bind(this));

            this._ui.view.set('seekingSpeed', this.conf.adaptiveSeeking ? 'dynamic' : this._playerOptions.seekingSpeed);
            this._ui.view.set('seekingFps', NaN);

            this._ui.view.set('adaptiveSeeking', this.conf.adaptiveSeeking);
            this._ui.view.observe('adaptiveSeeking', function(value) {
                if(value !== this.conf.adaptiveSeeking) {
                    this.conf.adaptiveSeeking = value;

                    this._reload();
                }
            }.bind(this));


            this._stage.classList.add('experiment__stage--loader-on');
            this._ui.view.set('showLoader', true);
            this._ui.view.observe('showLoader', function(value) {
                if(value) {
                    this._stage.classList.add('experiment__stage--loader-on');
                } else {
                    this._stage.classList.remove('experiment__stage--loader-on');
                }
            }.bind(this));

            this._stage.classList.remove('is-seeking');
            this._player
                .on('seeking', function() {
                    this._stage.classList.add('is-seeking');
                }.bind(this))
                .on('seeked', function() {
                    this._stage.classList.remove('is-seeking');
                }.bind(this));
        },
        _reload: function() {
            this.unload();
            this.load();
        },
        _createKeyframes: function() {
            function _pad(number, digits) {
                return new Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
            }

            var keyframes = [ ];
            var framesCount = this.conf.framesCount;
            var tilesPerFrame = this.conf.tilesPerFrame;

            for (var i = 0; i < framesCount; i++) {
                for(var j = 0; j < tilesPerFrame; j++) {
                    var createKeyframe = {
                        index: (i * framesCount) + j,
                        time: (i * 1000),
                        type: 'create',
                        color: [
                            _pad(Math.round((255 / (framesCount * tilesPerFrame)) * (tilesPerFrame * i + j)).toString(16), 2),
                            '00',
                            _pad(Math.round(255 - (255 / (framesCount * tilesPerFrame)) * (tilesPerFrame * i + j)).toString(16), 2)
                        ].join('')
                    };

                    keyframes.push(createKeyframe);

                    var changeKeyframe = {
                        index: (i * framesCount) + j,
                        time: createKeyframe.time + 1000,
                        type: 'change',
                        width: this._getTileSize()
                    };

                    keyframes.push(changeKeyframe);
                }
            }

            return (this._keyframes = keyframes);
        },
        _frameHandler: function(keyframes, nextKeyframe, currentRecordingTime) {
            if(this._player.isSeeking) {
                this._ui.view.set('seekingFps', 1000 * 1000 / this._player._averageFrameDuration);
            }

            var toForward = this._player.direction === this._player.directions.FORWARD;

            if(!toForward) {
                keyframes = keyframes.map(this._reverseKeyframe, this);

                if(nextKeyframe) {
                    nextKeyframe = this._reverseKeyframe(nextKeyframe);
                }
            }

            keyframes.forEach(this._keyframeHandler, this);

            if(this.conf.ease) {
                var lastTileKeyframes = [ ];
                var changeKeyframes = [ ];

                if(toForward) {
                    var tileKeyframes = keyframes.filter(function(keyframe) {
                        return (keyframe.type !== 'change');
                    });
                    if(tileKeyframes.length) {
                        lastTileKeyframes = tileKeyframes.filter(function(keyframe) {
                            return (tileKeyframes[tileKeyframes.length - 1].time === keyframe.time);
                        });
                        changeKeyframes = this._keyframes.filter(function(keyframe) {
                            return (
                                (keyframe.type === 'change') &&
                                (keyframes.indexOf(keyframe) === -1) &&
                                (lastTileKeyframes.map(function(keyframe) { return keyframe.index; }).indexOf(keyframe.index) !== -1)
                            );
                        });
                    }
                } else {
                    var tileKeyframes = keyframes.filter(function(keyframe) {
                        return (keyframe.type === 'change');
                    });
                    if(tileKeyframes.length) {
                        changeKeyframes = tileKeyframes.filter(function(keyframe) {
                            return (tileKeyframes[tileKeyframes.length - 1].time === keyframe.time);
                        });
                        lastTileKeyframes = this._keyframes.filter(function(keyframe) {
                            return (
                                (keyframe.type !== 'change') &&
                                (keyframes.indexOf(keyframe) === -1) &&
                                (changeKeyframes.map(function(keyframe) { return keyframe.index; }).indexOf(keyframe.index) !== -1)
                            );
                        });
                    }
                }

                lastTileKeyframes.forEach(function(lastTileKeyframe) {
                    var changeKeyframe = changeKeyframes.filter(function(keyframe) {
                        return (keyframe.index === lastTileKeyframe.index);
                    })[0];

                    if(lastTileKeyframe && changeKeyframe) {
                        var tile = this._stage.querySelector('[data-index="'+ lastTileKeyframe.index +'"]');

                        if(tile) {
                            if(this._tweens[changeKeyframe.index]) {
                                this._tweens[changeKeyframe.index].stop();
                                delete this._tweens[changeKeyframe.index];
                            }

                            var self = this;
                            this._tweens[changeKeyframe.index] = new TweenJs.Tween({
                                width: toForward ? this._reverseKeyframe(changeKeyframe).width : changeKeyframe.width
                            })
                            .to({
                                width: toForward ? changeKeyframe.width : this._reverseKeyframe(changeKeyframe).width
                            }, Math.abs(changeKeyframe.time - lastTileKeyframe.time))
                            // .easing(TweenJs.Easing.Elastic.InOut)
                            .onUpdate(function() {
                                self._updateTile(tile, this.width);
                            })
                            .onStop(function() {
                                self._updateTile(tile, changeKeyframe.width);  
                            })
                            .start(lastTileKeyframe.time);
                        } else {
                            console.warn('no tile with index ' + lastTileKeyframe.index + ' on a stage');
                        }
                    }
                }, this);
            }

            TweenJs.update(currentRecordingTime);
        },
        _keyframeHandler: function(keyframe) {
            var tile;
            switch(keyframe.type) {
                case 'create':
                    tile = this._createTile(keyframe.index, keyframe.color);

                    this._stage.appendChild(tile);
                break;
                case 'removal':
                    tile = this._stage.querySelector('[data-index="'+ keyframe.index +'"]');

                    if(tile) {
                        this._stage.removeChild(tile);
                    } else {
                        console.warn('no tile with index ' + keyframe.index + ' on a stage');
                    }
                break;
                case 'change':
                    tile = this._stage.querySelector('[data-index="'+ keyframe.index +'"]');

                    if(tile) {
                        this._updateTile(tile, keyframe.width);
                    } else {
                        console.warn('no tile with index ' + keyframe.index + ' on a stage');
                    }
                break;
                default:
            }
        },
        // private
        _reverseKeyframe: function(keyframe) {
            var reversed = extend({ }, keyframe);

            if(keyframe.type === 'create') {
                reversed.type = 'removal';

                delete reversed.color;
            } else if(keyframe.type === 'change') {
                reversed.width = this._getTileSize() - keyframe.width;
            }

            return reversed;
        },
        _createTile: function(index, color) {
            var tile = document.createElement('div');

            $(tile).css({
                width: 0,
                height: this._getTileSize() + 'px',
                backgroundColor: '#' + color
            })
            .attr('data-index', index)
            .addClass('experiment__stage__tile');

            return tile;
        },
        _updateTile: function(tile, width) {
            tile.style.width = width + 'px';
        },
        _getTileSize: function() {
            return parseFloat(Math.sqrt(Math.pow(this.conf.tileSize * 10, 2) / (this.conf.framesCount * this.conf.tilesPerFrame)).toFixed(2), 10);
        },
        _adaptiveSeeking: function() {
            var self = this;

            return function() {
                var speed = lodash.random(32, 64);

                self._ui.view.set('seekingSpeed', speed);

                return speed;
            };
        }
    });


    return AdaptiveSeeking;

})();