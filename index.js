module.exports = (function() {

    var requestAnimationFrame = require('request-animation-frame').requestAnimationFrame;
    var now = require('performance-now');
    var extend = require('extend');
    var EventEmitter = require('events').EventEmitter;
    var util = require('util');


    function Player(keyframes, drawer) {
        if(!keyframes || !Array.isArray(keyframes)) {
            throw new Error('keyframes must be an array');
        }
        
        if(!drawer || ('function' !== typeof drawer)) {
            throw new Error('drawer must be a function');
        }
        
        
        this._keyframes = keyframes.sort(function(a, b) {
            return (a.time - b.time);
        });

        this._drawer = drawer;

        this._frame = this._frame.bind(this);

        this._speed = 1;
        this._desiredFrameRate = 60;
        this._maxFrameTime = (1000 / this._desiredFrameRate * 2);
        this._lastRecordingTime = -1;
        this._averageFrameDuration = (1000 / this._desiredFrameRate);
        this._framesCount = 0;
        this._lastFrameTime = 0;

        this._playingStartTime = 0;
        this._playingEndTime = 0;
    }

    util.inherits(Player, EventEmitter);

    extend(Player.prototype, {
        destroy: function() {

        },
        play: function(fromTime, toTime) {
            if(!this._isPlaying) {
                this._isPlaying = true;

                this._recordingStartTime = fromTime || 0;
                this._lastRecordingTime = this._recordingStartTime;

                this._lastFrameTime = 0;
                this._nextFrameDesiredTime = 0;
                this._playingStartTime = 0;

                requestAnimationFrame(this._frame);
            }
        },
        stop: function() {
            if(this._isPlaying) {
                this._isPlaying = false;
            }
        },
        _frame: function(currentTime) {
            if(!this._lastFrameTime) {
                this._lastFrameTime = currentTime;
                this._playingStartTime = currentTime;

                this._nextFrameDesiredTime = currentTime + this._averageFrameDuration;

                requestAnimationFrame(this._frame);
                
                this.emit('start');
            } else {
                var lastFrameDuration = currentTime - this._lastFrameTime;
                this._framesCount++;
                this._averageFrameDuration += (lastFrameDuration - this._averageFrameDuration) / this._framesCount;

                var frameStartTime = this._nextFrameDesiredTime;
                var frameDuration = Math.max(currentTime - this._nextFrameDesiredTime, this._averageFrameDuration);

                var startKeyframeTime = this._lastRecordingTime;
                var endKeyframeTime = startKeyframeTime + (frameDuration * this._speed);

                this._nextFrameDesiredTime = frameStartTime + frameDuration;
                this._lastFrameTime = currentTime;
                this._lastRecordingTime = endKeyframeTime;

                var keyframes = this._getKeyframesForTimeRange(startKeyframeTime, endKeyframeTime);

                // console.log('fps', 1000 / this._averageFrameDuration);

                keyframes.forEach(function(keyframe) {
                    this._drawer(keyframe);
                }, this);
                
                if(keyframes[keyframes.length - 1] !== this._keyframes[this._keyframes.length - 1]) {
                    requestAnimationFrame(this._frame);
                } else {
                    this.emit('end');
                }
            }
        },
        _getKeyframesForTimeRange: function(startTime, endTime) {
            return this._keyframes.filter(function(keyframe) {
                return (keyframe.time >= startTime) && (keyframe.time < endTime);
            });
        }
    });


    return Player;

})();