module.exports = (function() {

    var util = require('util');
    var $ = require('jquery');
    var extend = require('extend');

    var Experiment = require('../../experiment');
    var Player = require('../../../index');


    function ProgressiveBasicExperiment() {
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
    }

    util.inherits(ProgressiveBasicExperiment, Experiment);

    extend(ProgressiveBasicExperiment.prototype, {
        conf: {
            tileSize: 50
        },
        // load: function() {
        //     Experiment.prototype.load.call(this);
        // },
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

            return keyframes;
        },
        _keyframeHandler: function(keyframe) {
            if(this._player.direction === this._player.directions.BACKWARD) {
                keyframe = this._reverseKeyframe(keyframe);
            }

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
            }

            return reversed;
        },
        _createTile: function(index, color) {
            var tile = document.createElement('div');

            $(tile).css({
                width: this.conf.tileSize + 'px',
                height: this.conf.tileSize + 'px',
                backgroundColor: '#' + color
            })
            .attr('data-index', index)
            .addClass('experiment__stage__tile');

            return tile;
        }
    });


    return ProgressiveBasicExperiment;

})();