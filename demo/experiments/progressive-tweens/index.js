module.exports = (function() {

    var fs = require('fs');
    var util = require('util');
    var $ = require('jquery');
    var extend = require('extend');
    var TweenJs = require('tween.js');

    var Experiment = require('../../experiment');
    var Player = require('../../../index');

    var template = fs.readFileSync(__dirname + '/ui.tpl');


    function ProgressiveTweens() {
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
            direction: Player.directions.FORWARD
        };

        this._tweens = { };
    }

    util.inherits(ProgressiveTweens, Experiment);

    extend(ProgressiveTweens.prototype, {
        conf: {
            ease: true,
            tileSize: 50
        },
        load: function() {
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
        },
        // unload: function() {
        //     Experiment.prototype.unload.call(this);
        // },
        _createKeyframes: function() {
            function _pad(number, digits) {
                return new Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
            }

            var keyframes = [ ];

            for (var i = 0; i < 100; i++) {
                var createKeyframe = {
                    index: i,
                    time: i * 1000,
                    type: 'create',
                    color: _pad(Math.round(255 / 100 * i).toString(16), 2) + '00' + _pad(Math.round(255 - 255 / 100 * i).toString(16), 2)
                };

                keyframes.push(createKeyframe);

                var changeKeyframe = {
                    index: i,
                    time: createKeyframe.time + 1000,
                    type: 'change',
                    width: this.conf.tileSize
                };

                keyframes.push(changeKeyframe);
            }

            return (this._keyframes = keyframes);
        },
        _frameHandler: function(keyframes, nextKeyframe, currentRecordingTime) {
            var toForward = this._player.direction === this._player.directions.FORWARD;

            if(!toForward) {
                keyframes = keyframes.map(this._reverseKeyframe, this);

                if(nextKeyframe) {
                    nextKeyframe = this._reverseKeyframe(nextKeyframe);
                }
            }

            keyframes.forEach(this._keyframeHandler, this);

            if(this.conf.ease) {
                var lastTileKeyframe;
                var changeKeyframe;

                if(toForward) {
                    var tileKeyframes = keyframes.filter(function(keyframe) {
                        return (keyframe.type !== 'change');
                    });
                    lastTileKeyframe =  tileKeyframes[tileKeyframes.length - 1];
                    if(lastTileKeyframe) {
                        changeKeyframe = this._keyframes.filter(function(keyframe) {
                            return (
                                (lastTileKeyframe.index === keyframe.index) &&
                                (keyframe.type === 'change') &&
                                (keyframe.time > lastTileKeyframe.time) &&
                                (keyframes.indexOf(keyframe) === -1)
                            );
                        })[0];
                    }
                } else {
                    changeKeyframe = this._keyframes.filter(function(keyframe) {
                        return (
                            (keyframe.type === 'change') &&
                            (keyframe.time < currentRecordingTime)
                        );
                    }).reverse()[0];

                    if(changeKeyframe) {
                        lastTileKeyframe = this._keyframes.filter(function(keyframe) {
                            return (
                                (changeKeyframe.index === keyframe.index) &&
                                (keyframe.type !== 'change') &&
                                (keyframe.time < changeKeyframe.time)
                            );
                        })[0];
                    }
                }

                if(lastTileKeyframe && changeKeyframe) {
                    var tile = this._stage.querySelector('[data-index="'+ lastTileKeyframe.index +'"]');

                    if(tile) {
                        if(this._tweens[changeKeyframe.index]) {
                            this._tweens[changeKeyframe.index].stop();
                            delete this._tweens[changeKeyframe.index];
                        }

                        var self = this;
                        this._tweens[changeKeyframe.index] = new TweenJs.Tween({
                            width: this._reverseKeyframe(changeKeyframe).width
                        })
                        .to({
                            width: changeKeyframe.width
                        }, Math.abs(changeKeyframe.time - lastTileKeyframe.time))
                        // .easing(TweenJs.Easing.Elastic.InOut)
                        .onUpdate(function() {
                            self._updateTile(tile, this.width);
                        })
                        .onStop(function() {
                            self._updateTile(tile, changeKeyframe.width);  
                        })
                        .start((toForward ? lastTileKeyframe : changeKeyframe).time);
                    } else {
                        console.warn('no tile with index ' + lastTileKeyframe.index + ' on a stage');
                    }
                }
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
                reversed.width = this.conf.tileSize - keyframe.width;
            }

            return reversed;
        },
        _createTile: function(index, color) {
            var tile = document.createElement('div');

            $(tile).css({
                width: 0,
                height: this.conf.tileSize + 'px',
                backgroundColor: '#' + color
            })
            .attr('data-index', index)
            .addClass('experiment__stage__tile');

            return tile;
        },
        _updateTile: function(tile, width) {
            tile.style.width = width + 'px';
        }
    });


    return ProgressiveTweens;

})();