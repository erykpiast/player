module.exports = (function() {

    var fs = require('fs');
    var util = require('util');
    var $ = require('jquery');
    var extend = require('extend');
    var TweenJs = require('tween.js');

    var Experiment = require('../../experiment');
    var Player = require('../../../index');

    var template = fs.readFileSync(__dirname + '/ui.tpl');


    function StreamingTweens() {
        Experiment.apply(this, arguments);

        $(this._stage).css({
            width: (this.conf.ballSize * 10) + 'px',
            height: (this.conf.ballSize * 10) + 'px'
        });

        this._ball = document.createElement('div');
        $(this._ball).css({
            width: this.conf.ballSize + 'px',
            height: this.conf.ballSize + 'px'
        })
        .addClass('experiment__stage__ball');

        this._playerOptions = {
            // seekingMode: Player.seeking.PLAY_FRAMES,
            seekingSpeed: 1024,
            speed: 1/2
        };

        this._uiOptions = {
            partial: template.toString()
        };
    }

    util.inherits(StreamingTweens, Experiment);

    extend(StreamingTweens.prototype, {
        conf: {
            ease: true,
            ballSize: 50
        },
        load: function() {
            Experiment.prototype.load.call(this);

            $(this._ball).css({
                top: '50%',
                left: 0
            });

            this._stage.appendChild(this._ball);

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
            function _trajectory(x) {
                return Math.sin(x);
            }

            var keyframes = [ ];

            for (var i = 0; i <= 100; i++) {
                var keyframe = keyframes[i] = {
                    index: i,
                    time: keyframes[i - 1] ? keyframes[i - 1].time + 100 : 0
                };
                keyframe.x = (i / 100);
                keyframe.y = parseFloat(_trajectory(2 * Math.PI * (i / 100)).toFixed(3), 10);
            }

            return (this._keyframes = keyframes);
        },
        _frameHandler: function(keyframes, nextKeyframe, currentRecordingTime) {
            // keyframes.forEach(function(current, index, keyframes) {
            //     this._keyframeHandler(current, keyframes[index + 1] || nextKeyframe, currentRecordingTime);
            // }, this);
            if(keyframes.length) {
                this._keyframeHandler(
                    keyframes[keyframes.length - 1],
                    nextKeyframe,
                    this._player.direction === this._player.directions.FORWARD
                );
            }

            TweenJs.update(currentRecordingTime);
        },
        _keyframeHandler: function(keyframe, nextKeyframe, toForward) {
            if(this.conf.ease) {
                if(this._tween) {
                    this._tween.stop();
                }

                if(nextKeyframe) {
                    var from = (toForward ? keyframe : nextKeyframe);
                    var to = (toForward ? nextKeyframe : keyframe);

                    var self = this;
                    this._tween = new TweenJs.Tween({
                        x: from.x,
                        y: from.y
                    })
                    .to({
                        x: to.x,
                        y: to.y
                    }, to.time - from.time)
                    // .easing(TweenJs.Easing.Elastic.InOut)
                    .onUpdate(function() {
                        self._updateBall(this.x, this.y);
                    })
                    .start(from.time);
                } else {
                    this._updateBall(keyframe.x, keyframe.y);
                }
            } else {
                this._updateBall(keyframe.x, keyframe.y);
            }
        },
        // private
        _updateBall: function(x, y) {
            this._ball.style.left = (x * 100) + '%';
            this._ball.style.top = (50 + (y * 50)) + '%';
        }
    });


    return StreamingTweens;

})();