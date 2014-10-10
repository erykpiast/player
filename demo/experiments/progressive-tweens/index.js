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
            speed: 1
        };

        this._experimentSpecificUi = template.toString();
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
                var keyframe = keyframes[i] = {
                    index: i,
                    time: keyframes[i - 1] ? keyframes[i - 1].time + 1000 : 0
                };
                keyframe.type = 'create';
                keyframe.color = _pad(Math.round(255 / 100 * i).toString(16), 2) + '00' + _pad(Math.round(255 - 255 / 100 * i).toString(16), 2);
            }

            return (this._keyframes = keyframes);
        },
        _frameHandler: function(keyframes, nextKeyframe, currentRecordingTime) {
            if(this._player.direction === this._player.directions.BACKWARD) {
                keyframes = keyframes.map(this._reverseKeyframe, this);

                nextKeyframe = this._reverseKeyframe(nextKeyframe);
            }

            keyframes.forEach(this._keyframeHandler, this);


            var diff = Math.abs(currentRecordingTime - nextKeyframe.time);
            if(diff <= 1000) {
                var tile = this._stage.querySelector('[data-index="'+ nextKeyframe.index +'"]');

                if(tile) {
                    if(this.conf.ease) {
                        if(this._tween) {
                            // this._tween.stop();
                        }

                        var self = this;
                        this._tween = new TweenJs.Tween({
                            width: this._reverseKeyframe(nextKeyframe).width
                        })
                        .to({
                            width: nextKeyframe.width
                        }, diff)
                        // .easing(TweenJs.Easing.Elastic.InOut)
                        .onUpdate(function() {
                            self._updateTile(tile, this.width);
                        })
                        .start(nextKeyframe.time);
                    } else {
                        this._updateTile(tile, nextKeyframe.width);
                    }
                } else {
                    console.warn('no tile with index ' + nextKeyframe.index + ' on a stage');
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