module.exports = (function() {

    var requestAnimationFrame = require('request-animation-frame').requestAnimationFrame;
    var cancelAnimationFrame = require('request-animation-frame').cancelAnimationFrame;
    var extend = require('extend');
    var EventEmitter = require('events').EventEmitter;
    var util = require('util');


    function Player(keyframes, drawer, options) {
        if(!keyframes || !Array.isArray(keyframes)) {
            throw new Error('keyframes must be an array');
        }

        if(!drawer || ('function' !== typeof drawer)) {
            throw new Error('drawer must be a function');
        }

        // rewrite options >>
        this.defaults = {
            speed: 1,
            seekingSpeed: 100,
            seekingMode: this.seeking.OMIT_FRAMES,
            lastFramesForAverage: 5
        };

        options = extend({ }, this.defaults, options);

        this._speed = options.speed;
        this._seekingMode = options.seekingMode;
        this._seekingSpeed = options.seekingSpeed;
        this._lastFramesForAverage = options.lastFramesForAverage;
        // << rewrite options

        // sort keyframes descending by time
        this._keyframes = keyframes.sort(function(a, b) {
            return (a.time - b.time);
        });

        this._drawer = drawer;

        this._frame = this._frame.bind(this);

        this._desiredFrameRate = 60;
        this._maxFrameTime = (1000 / this._desiredFrameRate * 2);
        this._lastRecordingTime = -1;
        this._lastFramesDuration = [ ];
        this._averageFrameDuration = this._toUs(1000 / this._desiredFrameRate);
        this._framesCount = 0;
        this._lastFrameTime = 0;

        this._isDestroyed = false;

        this._direction = this.directions.FORWARD;

        this._state = this.states.STOPPED;

        // public properties (with getters and/or setters)
        Object.defineProperties(this, {
            speed: this._createSpeedProperty({
                publicName: 'speed',
                privateName: '_speed'
            }),
            seekingSpeed: this._createSpeedProperty({
                publicName: 'seekingSpeed',
                privateName: '_seekingSpeed'
            }),
            seekingMode: this._createSettingProperty({
                publicName: 'seekingMode',
                privateName: '_seekingMode',
                enumName: 'seeking'
            }),
            direction: this._createGetter({
                publicName: 'direction',
                privateName: '_direction'
            }),
            state: this._createGetter({
                publicName: 'state',
                privateName: '_state'
            }),
            isStopped: this._createGetter({
                publicName: 'isStopped',
                get: function() {
                    return (this._state === this.states.STOPPED);
                }
            }),
            isPlaying: this._createGetter({
                publicName: 'isPlaying',
                get: function() {
                    return (this._state === this.states.PLAYING);
                }
            }),
            isPaused: this._createGetter({
                publicName: 'isPaused',
                get: function() {
                    return (this._state === this.states.PAUSED);
                }
            }),
            isSeeking: this._createGetter({
                publicName: 'isSeeking',
                get: function() {
                    return this._isSeeking;
                }
            }),
            fps: this._createGetter({
                publicName: 'fps',
                get: function() {
                    return ((1000 * 1000) / (this._isSeeking ? this._previousAverageFrameDuration : this._averageFrameDuration));
                }
            })
        });
    }

    util.inherits(Player, EventEmitter);

    extend(Player.prototype, {
        seeking: {
            PLAY_FRAMES: 1,
            OMIT_FRAMES: 2
        },
        directions: {
            FORWARD: 1,
            BACKWARD: 2
        },
        states: {
            STOPPED: 1,
            PLAYING: 2,
            PAUSED: 3
        },
        destroy: function() {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            this.stop();
            this.removeAllListeners();

            delete this._keyframes;
            delete this._drawer;
            delete this._lastFramesDuration;

            if(this._requestedFrame) {
                cancelAnimationFrame(this._requestedFrame);

                delete this._requestedFrame;
            }

            this._isDestroyed = true;
        },
        /* @function play - start playing of the recording or resume it when it's paused
         * @param {number} [fromTime=0] - a positive integer, time in milliseconds, starting point of playing
         * @param {*} [direction=directions.FORWARD] - direction of playing
         *
         * @property {object} directions - map of possible directions of playing
         * @property {object} directions.FORWARD - indicates playing from the first to the last frame
         * @property {object} directions.BACKWARD - indicates playing from the last to the first frame
         */
        play: function(fromTime, direction) {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            if('undefined' !== typeof direction) {
                if(direction === this.directions.FORWARD) {
                    this._direction = this.directions.FORWARD;
                } else if(direction === this.directions.BACKWARD) {
                    this._direction = this.directions.BACKWARD;
                } else {
                    throw new TypeError('direction must be value form "directions" ENUM');
                }
            }


            if(this._state === this.states.PAUSED) {
                this._lastFrameTime = 0;
                this._nextFrameDesiredTime = 0;

                this.emit('resume');
            }
            
            if(this._state !== this.states.PLAYING) {
                if(this._isSeeking) {
                    this._finishSeeking();
                }
                
                this._state = this.states.PLAYING;
                this._requestedFrame = requestAnimationFrame(this._frame);

                var toForward = (this._direction === this.directions.FORWARD);

                this._playingStartTime = 0;
                this._recordingStartTime = this._lastRecordingTime;
                this._recordingEndTime = (toForward ? this._toUs(this._keyframes[this._keyframes.length - 1].time) : 0);

                this._lastFrameTime = 0;
                this._nextFrameDesiredTime = 0;

                this.emit('play');
            }

            if('undefined' !== typeof fromTime) {
                this.seek(fromTime);
            }
        },
        pause: function() {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            if(this._state === this.states.PLAYING) {
                this._state = this.states.PAUSED;

                this.emit('pause');
            }
        },
        stop: function() {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            // it seems like sometimes frame is requested but isPlaying flag is not set
            if(this._state !== this.states.STOPPED) {
                this._state = this.states.STOPPED;

                cancelAnimationFrame(this._requestedFrame);

                this._lastRecordingTime = -1;

                this.emit('stop');
            }
        },
        /* @function seek - Allows to move video to specified time; if video is stopped, it make it paused on specified time
         * @param {number} toTime - A positive integer, time in milliseconds, desired recording time
         *
         * @property {object} seeking - map of available modes of seeking
         * @property {object} seeking.PLAY_FRAMES - indicates seeking with playing all frames between current and desired time
         * @property {object} seeking.OMIT_FRAMES - indicates seeking without playing frames between current and desired time
         *
         * @property {*} [seekingMode=seeking.OMIT_FRAMES] - current seeking mode
         * @property {number} [seekingSpeed=100] - indicates speed of playing speed in PLAY_FRAMES mode
         *
         */
        seek: function(toTime) {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            var recordingEndTime = this._toUs(toTime);

            var diff = recordingEndTime - this._lastRecordingTime;
            var dir;
            if(diff < 0) {
                dir = this.directions.BACKWARD;
            } else if(diff > 0) {
                dir = this.directions.FORWARD;
            } else {
            // start only if seeking makes sense (diff !== 0)
                return;
            }

            if(this._state === this.states.STOPPED) {
                this._state = this.states.PAUSED;
            }

            if(this._seekingMode === this.seeking.PLAY_FRAMES) {
                // try to emit all frames from current to desired time with high speed
                // and continue playing from that point
                if(!this._isSeeking) {
                    this._isSeeking = true;

                    // store settings for normal playing
                    this._previousSpeed = this._speed;
                    this._previousAverageFrameDuration = this._averageFrameDuration;
                    this._previousDirection = this._direction;
                    this._previousRecordingEndTime = this._recordingEndTime;

                    this._speed = this._seekingSpeed;
                    // try to scale current average frame duration to new speed
                    this._averageFrameDuration = (this._averageFrameDuration * (this._seekingSpeed / this._speed));
                    this._resetAverageFrameDuration();

                    if(this._state === this.states.PAUSED) {
                        this._requestedFrame = requestAnimationFrame(this._frame);
                    }
                }

                this._direction = dir;
                this._recordingEndTime = recordingEndTime;

                this.emit('seekstart');
            } else {
                // simply jump to desired time
                this._lastRecordingTime = this._toUs(toTime);

                this.emit('seek', toTime);
            }
        },
        _frame: function(ct) {
            if((this._state === this.states.PAUSED) && !this._isSeeking) {
                return;
            }

            var currentTime = this._toUs(ct);

            if(!this._lastFrameTime) {
                // the first keyframe is empty
                this._lastFrameTime = currentTime;

                this._nextFrameDesiredTime = currentTime + this._averageFrameDuration;

                this._requestedFrame = requestAnimationFrame(this._frame);
            } else {
                var toForward = (this._direction === this.directions.FORWARD);

                // emit start signal on first "real" keyframe of playing
                if(!this._playingStartTime) {
                    this._playingStartTime = currentTime;

                    this.emit('start', this._toMs(this._playingStartTime));
                }

                var lastFrameDuration = currentTime - this._lastFrameTime;
                this._framesCount++;

                this._averageFrameDuration = this._getAverageFrameDuration(lastFrameDuration);

                var frameStartTime = this._nextFrameDesiredTime;
                var frameDuration = Math.max(currentTime - frameStartTime, Math.round(this._averageFrameDuration));

                var startKeyframeTime = this._lastRecordingTime;
                var endKeyframeTime = startKeyframeTime + (this._adaptToSpeed(frameDuration) * (toForward ? 1 : -1));

                // take desired recordingEndTime into account
                if(toForward) {
                    if(endKeyframeTime > this._recordingEndTime) {
                        endKeyframeTime = this._recordingEndTime + 1;
                    }
                } else {
                    if(endKeyframeTime < this._recordingEndTime) {
                        endKeyframeTime = this._recordingEndTime - 1;
                    }
                }

                var frameRange = Math.abs(startKeyframeTime - endKeyframeTime);
                var keyframes = this._getKeyframesForTimeRange(startKeyframeTime, endKeyframeTime, toForward);
                var lastKeyframe = keyframes[keyframes.length - 1];
                var lastIndex = this._keyframes.indexOf(keyframes[keyframes.length - 1]);
                var nextKeyframe = this._keyframes[lastIndex + (toForward ? 1 : -1)];

                this._drawer(keyframes, nextKeyframe, this._toMs(startKeyframeTime + (frameRange / 2) * (toForward ? 1 : -1)), this._toMs(currentTime));

                this._nextFrameDesiredTime = currentTime + frameDuration;
                this._lastFrameTime = currentTime;

                if((lastKeyframe &&
                        (toForward ?
                            this._toUs(lastKeyframe.time) < this._recordingEndTime :
                            this._toUs(lastKeyframe.time) > this._recordingEndTime
                        )
                    ) || (
                        !lastKeyframe && (this._lastRecordingTime !== endKeyframeTime)
                    )
                ) {
                // if some keyframes for the frame were found and the last is before desired recording end time
                // continue playing
                    if((this._state === this.states.PLAYING) || this._isSeeking) {
                        this._requestedFrame = requestAnimationFrame(this._frame);
                    } else {
                    // or if isPaused flag was set in the meantime, send the signal
                        this.emit('pause');
                    }
                } else if(this._isSeeking) {
                // if that was seeking, finish it
                    this._finishSeeking();

                    if(this._state === this.states.PLAYING) {
                    // if recording was played when seek signal came, continue playing
                        this._requestedFrame = requestAnimationFrame(this._frame);
                    }

                    // start playing from frame after next one
                    // rendering frames for recording played with very high speed (what usually happens when seeking)
                    // can take huge amounts of time, but we don't want to take it into account when after seeking we start "normal" playing
                    this._lastFrameTime = 0;
                } else {
                // or just send end signal
                    this._state = this.states.STOPPED;

                    this.emit('end');
                }

                // it has to be here until we check current value of this._lastRecordingTime above
                this._lastRecordingTime = endKeyframeTime;
            }
        },
        _getKeyframesForTimeRange: function(st, et, toForward) {
            var startTime = this._toMs(st);
            var endTime = this._toMs(et);

            if(toForward) {
                return this._keyframes.filter(function(keyframe) {
                    return (keyframe.time >= startTime) && (keyframe.time < endTime);
                });
            } else {
                return this._keyframes.filter(function(keyframe) {
                    return (keyframe.time > endTime) && (keyframe.time <= startTime);
                }).reverse();
            }
        },
        _getAverageFrameDuration: function(lastFrameDuration) {
            if(lastFrameDuration) {
                this._lastFramesDuration.push(lastFrameDuration);
            }

            if(this._lastFramesDuration.length > this._lastFramesForAverage) {
                this._lastFramesDuration.shift();
            }

            if(this._lastFramesDuration.length) {
                return (this._lastFramesDuration.reduce(function(prev, current) {
                    return (prev + current);
                }) / this._lastFramesDuration.length);
            } else {
                return this._averageFrameDuration;
            }
        },
        _resetAverageFrameDuration: function(lastFrameDuration) {
            while(this._lastFramesDuration.length) {
                this._lastFramesDuration.pop();
            }

            if(lastFrameDuration) {
                this._lastFramesDuration.push(lastFrameDuration);
            }

            return lastFrameDuration;
        },
        _adaptToSpeed: function(value) {
            return Math.round(value * this._speed, 10);
        },
        _toUs: function(milliseconds) {
            return Math.round(milliseconds * 10e2);
        },
        _toMs: function(microseconds) {
            return (Math.round(microseconds) / 10e2);
        },
        _finishSeeking: function() {
            this._isSeeking = false;

            this._averageFrameDuration = this._resetAverageFrameDuration(this._previousAverageFrameDuration);
            delete this._previousAverageFrameDuration;

            this._recordingEndTime = this._previousRecordingEndTime;
            delete this._previousRecordingEndTime;

            this._direction = this._previousDirection;
            delete this._previousDirection;

            this._speed = this._previousSpeed;
            delete this._previousSpeed;

            this.emit('seekend');
        },
        _createSpeedProperty: function(conf) {
            var setVal = this[conf.privateName];

            return {
                get: function() {
                    return setVal;
                },
                set: function(value) {
                    if(this._isSeeking) {
                        throw new Error('you can not set new speed during seeking, sorry');
                    }

                    var parsed = parseFloat(value, 10);

                    if(!isNaN(parsed) && isFinite(parsed)) {
                        if(parsed > 0) {
                            this[conf.privateName] = setVal = parsed;

                            return parsed;
                        }
                    } else {
                        throw new TypeError(conf.publicName + ' must be a number');
                    }
                }
            };
        },
        _createSettingProperty: function(conf) {
            var enumValues = Object.keys(this[conf.enumName]).map(function(key) {
                return this[conf.enumName][key];
            }, this);

            return {
                get: function() {
                    return this[conf.privateName];
                },
                set: function(value) {
                    if(enumValues.indexOf(value) !== -1) {
                        this[conf.privateName] = value;

                        return value;
                    } else {
                        throw new TypeError(conf.publicName + ' must have value from "' + conf.enumName + '" ENUM');
                    }
                }
            };
        },
        _createGetter: function(conf) {
            return {
                get:  (('function' === typeof conf.get) ? conf.get : function() {
                    return this[conf.privateName];
                }),
                set: (('function' === typeof conf.set) ? conf.set : function() {
                    throw new Error('you can not set read-only property ' + conf.publicName);
                })
            };
        }
    });


    return Player;

})();