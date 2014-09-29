module.exports = (function() {

    var requestAnimationFrame = require('request-animation-frame').requestAnimationFrame;
    var cancelAnimationFrame = require('request-animation-frame').cancelAnimationFrame;
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
        this._averageFrameDuration =  this._toUs(1000 / this._desiredFrameRate);
        this._framesCount = 0;
        this._lastFrameTime = 0;
    }

    util.inherits(Player, EventEmitter);

    extend(Player.prototype, {
        destroy: function() {

        },
        play: function(fromTime, toTime) {
            if(!this._isPlaying || ('undefined' !== typeof fromTime)) {
                this._isPaused = false;
                this._isPlaying = true;

                this._recordingStartTime = this._toUs(fromTime) || 0;
                this._lastRecordingTime = this._recordingStartTime;
                this._playingStartTime = 0;

                this._lastFrameTime = 0;
                this._nextFrameDesiredTime = 0;

                this._requestedFrame = requestAnimationFrame(this._frame);
            } else if(this._isPaused) {
                this._isPaused = false;
                
                this._lastFrameTime = 0;
                this._nextFrameDesiredTime = 0;
                
                this._requestedFrame = requestAnimationFrame(this._frame);
            }
        },
        pause: function() {
            if(this._isPlaying && !this._isPaused) {
                this._isPaused = true;
            }
        },
        stop: function() {
            if(this._isPlaying) {
                this._isPlaying = false;
                this._isPaused = false;
                
                cancelAnimationFrame(this._requestedFrame);
            }
        },
        _frame: function(ct) {
            var currentTime = this._toUs(ct);
            
            if(!this._lastFrameTime) {
                // the first keyframe is empty
                this._lastFrameTime = currentTime;

                this._nextFrameDesiredTime = currentTime + this._averageFrameDuration;

                this._requestedFrame = requestAnimationFrame(this._frame);
            } else {
                // emit start signal on first "real" keyframe
                if(!this._playingStartTime) {
                    this.emit('start', this._toMs(this._playingStartTime = currentTime));
                }
                
                var lastFrameDuration = currentTime - this._lastFrameTime;
                this._framesCount++;
                this._averageFrameDuration += (lastFrameDuration - this._averageFrameDuration) / this._framesCount;

                var frameStartTime = this._nextFrameDesiredTime;
                var frameDuration = Math.max(currentTime - frameStartTime, Math.round(this._averageFrameDuration));

                var startKeyframeTime = this._lastRecordingTime;
                var endKeyframeTime = startKeyframeTime + this._adaptToSpeed(frameDuration);
                
                this._nextFrameDesiredTime = currentTime + frameDuration;
                this._lastFrameTime = currentTime;
                this._lastRecordingTime = endKeyframeTime;

                var keyframes = this._getKeyframesForTimeRange(startKeyframeTime, endKeyframeTime);
                var lastIndex = this._keyframes.indexOf(keyframes[keyframes.length - 1]);
                var nextKeyframe = this._keyframes[lastIndex + 1];

                keyframes.forEach(function(keyframe, index, keyframes) {
                    this._drawer(keyframe, keyframe[index + 1] || nextKeyframe, index, this._toMs(currentTime));
                }, this);
                
                if(keyframes[keyframes.length - 1] !== this._keyframes[this._keyframes.length - 1]) {
                    if(!this._isPaused) {
                        this._requestedFrame = requestAnimationFrame(this._frame);
                    } else {
                        this.emit('pause');
                    }
                } else {
                    this.emit('end');
                }
            }
        },
        _getKeyframesForTimeRange: function(st, et) {
            var startTime = this._toMs(st);
            var endTime = this._toMs(et);
            
            return this._keyframes.filter(function(keyframe) {
                return (keyframe.time >= startTime) && (keyframe.time < endTime);
            });
        },
        _adaptToSpeed: function(value) {
            return Math.round(value * this._speed, 10);
        },
        _toUs: function(milliseconds) {
            return parseInt(milliseconds * 10e2, 10);
        },
        _toMs: function(microseconds) {
            return parseFloat((microseconds / 10e2).toFixed(3), 10);
        }
    });


    return Player;

})();