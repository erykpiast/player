module.exports = (function() {

    var requestAnimationFrame = require('request-animation-frame').requestAnimationFrame;
    var cancelAnimationFrame = require('request-animation-frame').cancelAnimationFrame;
    var extend = require('extend');
    var EventEmitter = require('events').EventEmitter;
    var util = require('util');


    /**
     * @constructor Player - creates new instance of player for given recording
     * @param {array} keyframes - an array of objects representing keyframes of recording
     * @param {function} drawer - function called on each recording frame
     * @param {object} options  - configuration object
     *     @property {string} [options.timeKey='time'] - name of keyframe property containing the time in milliseconds
     *     @property {number,enum} [options.seekingMode=seeking.OMIT_FRAMES]  - mode of seeking (one of those from Player.seeking)
     *     @property {number} [options.speed=1] - initial speed of playing
     *     @property {number,enum|function} [options.seekingSpeed=100] - speed of seeking in PLAY_FRAMES mode
     *         if function, have to return number
     *     @property {number} [options.lastFramesForAverage=5] - number of last frames to taking into account in measuring FPS value
     *
     * @fires Player#play - when the second frame after calling play method is emitted and recording is paused
     * @fires Player#playing - when the second frame after calling play method is emitted whatever the state of recording is
     * @fires Player#pause - when current status is PLAYING and pause method is called
     * @fires Player#waiting - when recording has to be seeked before playing
     * @fires Player#abort - when recording state is PLAYING or PAUSED and stop method is called
     * @fires Player#seeking - when seeking is started
     * @fires Player#seeked - when seeking is finished
     * @fires Player#ratechange - when speed is changed
     */
    function Player(keyframes, drawer, options) {
        if(!keyframes || !Array.isArray(keyframes) || !keyframes.length) {
            throw new Error('keyframes must be not empty array');
        }

        if(!drawer || ('function' !== typeof drawer)) {
            throw new Error('drawer must be a function');
        }

        /**
         * @property {object} this.defaults - default settings
         * @access public
         */
        this.defaults = {
            timeKey: 'time',
            speed: 1,
            seekingSpeed: 100,
            seekingMode: this.seeking.OMIT_FRAMES,
            lastFramesForAverage: 5
        };
        options = extend({ }, this.defaults, options);

        /**
         * @property {string} this._timeKey - chosen time key
         * @access protected
         */
        this._timeKey = options.timeKey;
        /**
         * @property {number} this._lastFramesForAverage - chosen amount of last frames times for calculating average time
         * @access protected
         */
        this._lastFramesForAverage = options.lastFramesForAverage;

        // sort keyframes descending by time
        /**
         * @property {array} this._keyframes - collection of passed keyframes sorted by this._timeKey
         * @access protected
         */
        this._keyframes = keyframes.slice().sort(function(a, b) {
            return (a[options.timeKey] - b[options.timeKey]);
        });

        /**
         * @property {function} this._drawer - passed frame handler
         * @access protected
         */
        this._drawer = drawer;

        /**
         * @property {function} this._frame - this.prototype.frame function bound to current instance
         * @access protected
         */
        this._frame = this._frame.bind(this);

        /**
         * @property {number} this._desiredFrameRate
         * @access protected
         */
        this._desiredFrameRate = 60;
        /**
         * @property {number} this._maxFrameTime - used to define time range to take keyframes for current frame
         * @access protected
         */
        this._maxFrameTime = (1000 / this._desiredFrameRate * 2);
        /**
         * @property {number} this._lastRecordingTime - recording time set in last frame call
         * @access protected
         */
        this._lastRecordingTime = -1;
        /**
         * @property {array} this._lastFrameDuration - collection of last frames durations, time of the latest frame is the last
         * @property {number,milliseconds} this._lastFrameDuration[n] - duration of frame
         * @access protected
         */
        this._lastFramesDuration = [ ];
        /**
         * @property {number} this._averageFrameDuration
         * @access protected
         */
        this._averageFrameDuration = this._toUs(1000 / this._desiredFrameRate);
        /**
         * @property {number} this._framesCount - for testing
         * @access protected
         */
        this._framesCount = 0;
        /**
         * @property {number} this._lastFrameTime - time of last calling of frame handler
         * @access protected
         */
        this._lastFrameTime = 0;

        /**
         * @property {boolean} this._isDestroyed - indicates if instance was destroyed (destroy function was called)
         * @access protected
         */
        this._isDestroyed = false;

        /**
         * @property {number,enum} this._direction - current direction of playing
         * @access protected
         */
        this._direction = this.directions.FORWARD;

        /**
         * @property {number,enum} this._state - current state of instance
         * @access protected
         */
        this._state = this.states.STOPPED;

        // public properties (with getters and/or setters)
        Object.defineProperties(this, {
            /**
             * @property {number,function} this._currentSpeed - current speed of playing (or seeking in PLAY_FRAMES mode)
             * @access protected
             */
            _currentSpeed: this._createSpeedProperty({
                privateName: '_currentSpeed',
                publicName: '_currentSpeed'
            }),
            /**
             * @property {number} this.currentSpeed - current speed of playing (or seeking in PLAY_FRAMES mode)
             * @access public
             */
            currentSpeed: this._createGetter({
                privateName: '_currentSpeed',
                publicName: 'currentSpeed'
            }),
            /**
             * @property {number,function} this._speed - desired speed of playing (it can differ from currentSpeed when seeking in PLAY_FRAMES mode)
             * @access protected
             */
            _speed: this._createSpeedProperty({
                privateName: '_speed',
                publicName: '_speed'
            }),
            /**
             * @property {number} this.speed - desired speed of playing (it can differ from currentSpeed when seeking in PLAY_FRAMES mode)
             * @access public
             */
            speed: this._createSpeedProperty({
                privateName: '_speed',
                publicName: 'speed'
            }),
            /**
             * @property {number} this.seekingSpeed - current speed of seeking
             * @access public
             */
            seekingSpeed: this._createSpeedProperty({
                privateName: '_seekingSpeed',
                publicName: 'seekingSpeed'
            }),
            /**
             * @property {number,enum} this.seekingMode - current mode of seeking
             * @access public
             */
            seekingMode: this._createSettingProperty({
                publicName: 'seekingMode',
                privateName: '_seekingMode',
                enumName: 'seeking'
            }),
            /**
             * @property {number,enum} this.direction - current direction of playing
             * @access public
             * @readonly
             */
            direction: this._createGetter({
                publicName: 'direction',
                privateName: '_direction'
            }),
            /**
             * @property {number,enum} this.state - current state of player
             * @access public
             * @readonly
             */
            state: this._createGetter({
                publicName: 'state',
                privateName: '_state'
            }),
            /**
             * @property {boolean} this.isStopped - true if current state of player is STOPPED
             * @access public
             * @readonly
             */
            isStopped: this._createGetter({
                publicName: 'isStopped',
                get: function() {
                    return (this._state === this.states.STOPPED);
                }
            }),
            /**
             * @property {boolean} this.isPlaying - true if current state of player is PLAYING
             * @access public
             * @readonly
             */
            isPlaying: this._createGetter({
                publicName: 'isPlaying',
                get: function() {
                    return (this._state === this.states.PLAYING);
                }
            }),
            /**
             * @property {boolean} this.isPaused - true if current state of player is PAUSED
             * @access public
             * @readonly
             */
            isPaused: this._createGetter({
                publicName: 'isPaused',
                get: function() {
                    return (this._state === this.states.PAUSED);
                }
            }),
            /**
             * @property {boolean} this.isSeeking - true if seeking is happening
             * @access public
             * @readonly
             */
            isSeeking: this._createGetter({
                publicName: 'isSeeking',
                get: function() {
                    return this._isSeeking;
                }
            }),
            /**
             * @property {number} this.fps - current average frames per second, NOT UPDATED when seeking in PLAY_FRAMES mode
             * @access public
             * @readonly
             */
            fps: this._createGetter({
                publicName: 'fps',
                get: function() {
                    return ((1000 * 1000) / (this._isSeeking ? this._previousAverageFrameDuration : this._averageFrameDuration));
                }
            }),
            /**
             * @property {number} this.fps - current average frames per second
             * @access public
             * @readonly
             */
            currentFps: this._createGetter({
                publicName: 'currentFps',
                get: function() {
                    return ((1000 * 1000) / this._averageFrameDuration);
                }
            }),
            /**
             * @property {number,milliseconds} this.lastKeyframeTime - timeKey property of last keyframe on keyframes list
             * @access public
             * @readonly
             */
            lastKeyframeTime: this._createGetter({
                publicName: 'lastKeyframeTime',
                get: function() {
                    return this._keyframes[this._keyframes.length - 1][this._timeKey];
                }
            })
        });

        // rewrite options >>
        // it's important to do it after getters/setters definitions
        this.speed = options.speed;
        this.seekingMode = options.seekingMode;
        this.seekingSpeed = options.seekingSpeed;
        // << rewrite options
    }

    util.inherits(Player, EventEmitter);

    extend(Player, {
        /*
         * @enum seeking - available modes of seeking
         * @property {number} seeking.PLAY_FRAMES - indicates seeking with playing all frames between current and desired time
         * @property {number} seeking.OMIT_FRAMES - indicates seeking without playing frames between current and desired time
         */
        seeking: {
            PLAY_FRAMES: 1,
            OMIT_FRAMES: 2
        },
        /* @enum directions - possible directions of playing
         * @property {number} directions.FORWARD - indicates playing from the first to the last frame
         * @property {number} directions.BACKWARD - indicates playing from the last to the first frame
         */
        directions: {
            FORWARD: 1,
            BACKWARD: 2
        },
        /* @enum states - possible states of player
         * @property {number} states.PLAYING - `play` method was called and `pause` nor `stop` were not
         * @property {number} states.PAUSED - `pause` method was called after `play` method and then `pause` nor `stop` were not
         * @property {number} states.STOPPED - `stop` method was called and then `pause` nor `call` were not
         */
        states: {
            STOPPED: 1,
            PLAYING: 2,
            PAUSED: 3
        }
    });

    extend(Player.prototype, {
        seeking: Player.seeking,
        directions: Player.directions,
        states: Player.states,
        /**
         * @method destroy - destroy all private properties
         * @access public
         */
        destroy: function() {
            this._ensureAvailability();

            this.stop();
            this.removeAllListeners();

            if(this._requestedFrame) {
                cancelAnimationFrame(this._requestedFrame);
            }

            Object.keys(this).forEach(function(key) {
                delete this[key];
            }, this);

            this._isDestroyed = true;
        },
        /**
         * @method play - start playing of the recording or resume it when it's paused
         * @access public
         * @param {number} [fromTime=0] - a positive integer, time in milliseconds, starting point of playing
         * @param {string,enum} [direction=directions.FORWARD] - direction of playing
         */
        play: function(fromTime, direction) {
            this._ensureAvailability();

            if('undefined' !== typeof direction) {
                if(direction === this.directions.FORWARD) {
                    this._direction = this.directions.FORWARD;
                } else if(direction === this.directions.BACKWARD) {
                    this._direction = this.directions.BACKWARD;
                } else {
                    throw new TypeError('direction must be value form "directions" ENUM');
                }
            }

            if(this._state !== this.states.PLAYING) {
                if(this._isSeeking) {
                    this._finishSeeking();
                }

                this._state = this.states.PLAYING;

                this._playingStartTime = 0;
                this._recordingStartTime = this._lastRecordingTime;
                this._recordingEndTime = (
                    this._direction === this.directions.FORWARD ?
                    this._toUs(this._keyframes[this._keyframes.length - 1][this._timeKey]) :
                    0
                );
            }

            this._startPlayingIfPaused();

            // if fromTime is defined but not if recording was not played ever and desired time is 0
            // (seeking doesn't make sense but technically difference between current and desired time is not 0)
            if(('undefined' !== typeof fromTime) &&
                (fromTime !== null) &&
                    !((this._lastRecordingTime === -1) &&
                        (fromTime === 0)
                    )
            ) {
                /**
                 * @event waiting - when recording has to be seeked before playing
                 */
                this.emit('waiting');

                this.seek(fromTime);
            }
        },
        /**
         * @method pause - pause playing in next frame
         * @access public
         */
        pause: function() {
            this._ensureAvailability();

            if(this._state === this.states.PLAYING) {
                this._state = this.states.PAUSED;

                /* @event pause - fired when current status is PLAYING and pause method is called
                 */
                this.emit('pause');
            }
        },
        /**
         * @method stop - stop playing immediately, cancel scheduled frame
         * @access public
         */
        stop: function() {
            this._ensureAvailability();

            // it seems like sometimes frame is requested but isPlaying flag is not set
            if(this._state !== this.states.STOPPED) {
                this._state = this.states.STOPPED;

                if(this._isSeeking) {
                    this._finishSeeking();
                }

                cancelAnimationFrame(this._requestedFrame);
                this._requestedFrame = null;

                this._lastRecordingTime = -1;

                /**
                 * @event abort - fired when recording state is PLAYING or PAUSED and stop method is called
                 */
                this.emit('abort');
            }
        },
        /**
         * @method seek - Allows to move video to specified time; if video is stopped, it make it paused on specified time
         * @access public
         * @param {number,milliseconds} toTime - A positive integer, time in milliseconds, desired recording time
         */
        seek: function(toTime) {
            this._ensureAvailability();

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
                    this._previousAverageFrameDuration = this._averageFrameDuration;
                    this._previousDirection = this._direction;
                    this._previousRecordingEndTime = this._recordingEndTime;

                    this._currentSpeed = this._seekingSpeed;

                    // try to scale current average frame duration to new speed
                    this._averageFrameDuration = (this._averageFrameDuration * (this.seekingSpeed / this._speed));
                    this._resetAverageFrameDuration();
                }

                this._direction = dir;
                this._recordingEndTime = recordingEndTime;
            } else {
                this._isSeeking = true;

                // simply jump to desired time
                this._lastRecordingTime = this._toUs(toTime);
            }

            this._startPlayingIfPaused();

            /**
             * @event seeking - fired when seeking is started
             */
            this.emit('seeking');
        },
        /**
         * @method frame - frame handler, function passed to requestAnimationFrames
         * @access protected
         * @param {number,milliseconds} ct - current time
         */
        _frame: function(ct) {
            this._requestedFrame = null;
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
                // when seeking in default mode the signal can be emitted on the first frame
                // in PLAY_FRAMES mode we want to emit it after seeking, on the first frame of playing
                if(!this._playingStartTime &&
                    (this._state === this.states.PLAYING) &&
                    (!this._isSeeking || (this._seekingMode === this.seeking.OMIT_FRAMES))
                ) {
                    this._playingStartTime = currentTime;

                    /**
                     * @event playing - fired when the second frame after calling play method is emitted
                     * @type {number,milliseconds} - current time
                     */
                    this.emit('playing', this._toMs(currentTime));

                    /**
                     * @event play - fired when the second frame after calling play method is emitted and recording was paused
                     * @type {number,milliseconds} - current time
                     */
                    if(this._state === this.states.PAUSED) {
                        this.emit('play', this._toMs(currentTime));
                    }
                }

                var lastFrameDuration = currentTime - this._lastFrameTime;
                this._framesCount++;

                this._averageFrameDuration = this._getAverageFrameDuration(lastFrameDuration);

                var frameStartTime = this._nextFrameDesiredTime;
                var frameDuration = Math.max(currentTime - frameStartTime, Math.round(this._averageFrameDuration));

                var startKeyframeTime = this._lastRecordingTime;
                var endKeyframeTime;
                // when seeking in default mode when recording is paused we want to emit only one frame, the closest to desired time
                if(this._isSeeking &&
                    (this._seekingMode === this.seeking.OMIT_FRAMES) &&
                    (this._state !== this.states.PLAYING)
                ) {
                    endKeyframeTime = this._lastRecordingTime + (toForward ? 1 : -1);
                } else {
                    endKeyframeTime = startKeyframeTime + (this._adaptToSpeed(frameDuration) * (toForward ? 1 : -1));
                }

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

                var keyframes = this._getKeyframesForTimeRange(startKeyframeTime, endKeyframeTime, toForward);
                var lastKeyframe = keyframes[keyframes.length - 1];
                var nextKeyframe = this._getNextKeyframe(endKeyframeTime, toForward);
                this._currentRecordingTime = this._toMs(endKeyframeTime);

                try {
                    this._drawer(keyframes, nextKeyframe, this._currentRecordingTime, this._toMs(currentTime));
                } catch(err) {
                    /**
                     * @event error - fired when error occurred in drawer function
                     * @type {object,Error}
                     */
                    this.emit('error', err);
                }

                this._nextFrameDesiredTime = currentTime + frameDuration;
                this._lastFrameTime = currentTime;

                if(!this._isSeeking) {
                    /**
                     * @event timeupdate - fired when playing and frame is emitted
                     * @type {number,milliseconds} - current time of recording
                     */
                    this.emit('timeupdate', this._currentRecordingTime);
                }

                if((lastKeyframe &&
                        (toForward ?
                            this._toUs(lastKeyframe[this._timeKey]) < this._recordingEndTime :
                            this._toUs(lastKeyframe[this._timeKey]) > this._recordingEndTime
                        )
                    ) || (
                        !lastKeyframe && (this._lastRecordingTime !== endKeyframeTime)
                    )
                ) {
                // if some keyframes for the frame were found and the last is before desired recording end time
                // continue playing
                    if(this._isSeeking && (this._seekingMode === this.seeking.OMIT_FRAMES)) {
                        this._finishSeeking();
                    } if((this._state === this.states.PLAYING) || this._isSeeking) {
                        this._requestedFrame = requestAnimationFrame(this._frame);
                    } else {
                    // or if isPaused flag was set in the meantime, send the signal
                        /**
                         * @event pause - fired recording is paused
                         */
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

                    /**
                     * @event ended - fired the last event was passed to drawer function
                     */
                    this.emit('ended');
                }

                // it has to be here until we check current value of this._lastRecordingTime above
                this._lastRecordingTime = endKeyframeTime;
            }
        },
        /**
         * @method _getKeyframesForTimeRange - returns collection of events for specified time range
         * @access protected
         * @param  {number,microseconds} st - start of the range
         * @param  {number,microseconds} et - end of the range
         * @param  {boolean} toForward - true if playing forward
         * @return {array} - collection of events for specified time range
         */
        _getKeyframesForTimeRange: function(st, et, toForward) {
            var startTime = this._toMs(st);
            var endTime = this._toMs(et);

            if(toForward) {
                return this._keyframes.filter(function(keyframe) {
                    return (keyframe[this._timeKey] >= startTime) && (keyframe[this._timeKey] < endTime);
                }, this);
            } else {
                return this._keyframes.filter(function(keyframe) {
                    return (keyframe[this._timeKey] > endTime) && (keyframe[this._timeKey] <= startTime);
                }, this).reverse();
            }
        },
        /**
         * @method _getNextKeyframe - returns the closest keyframe after specified time
         * @access protected
         * @param  {number,microseconds} t - time
         * @param  {boolean} toForward - true if playing forward
         * @return {object} the closest keyframe after specified time
         */
        _getNextKeyframe: function(t, toForward) {
            var time = this._toMs(t);

            if(toForward) {
                var low = 0;
                while(this._keyframes[low] && (this._keyframes[low][this._timeKey] <= time)) {
                    low++;
                }

                return this._keyframes[low];
            } else {
                var high = this._keyframes.length - 1;
                while(this._keyframes[high] && (this._keyframes[high][this._timeKey] >= time)) {
                    high--;
                }

                return this._keyframes[high];
            }
        },
        /**
         * @method  _getAverageFrameDuration - returns average duration of frame calculated from times of last
         *          X frames (X is lastFramesForAverage value)
         * @access protected
         * @param  {number,milliseconds} [lastFrameDuration] - duration of the last frame to add to average
         * @return {number,milliseconds} average frame duration
         */
        _getAverageFrameDuration: function(lastFrameDuration) {
            if(lastFrameDuration) {
                this._lastFramesDuration.push(lastFrameDuration);
            }

            if(this._lastFramesDuration.length > this._lastFramesForAverage) {
                this._lastFramesDuration.shift();
            }

            if(this._lastFramesDuration.length) {
                var max = Math.max.apply(Math, this._lastFramesDuration);

                var filtered = this._lastFramesDuration.slice();
                filtered.splice(this._lastFramesDuration.indexOf(max), 1);

                if (filtered.length) {
                    return filtered.reduce(function(prev, current) {
                        return (prev + current);
                    }) / filtered.length;
                } else {
                    return max;
                }
            } else {
                return this._averageFrameDuration;
            }
        },
        /**
         * @method  _resetAverageFrameDuration - resets average duration of frame, clears durations of last frames
         * @access protected
         * @param  {number,milliseconds} [lastFrameDuration] - duration of the last frame to set
         * @return {number,milliseconds} average frame duration
         */
        _resetAverageFrameDuration: function(lastFrameDuration) {
            while(this._lastFramesDuration.length) {
                this._lastFramesDuration.pop();
            }

            if(lastFrameDuration) {
                this._lastFramesDuration.push(lastFrameDuration);
            }

            return lastFrameDuration;
        },
        /**
         * @method _adaptToSpeed - adapts time value to current speed
         * @access protected
         * @param {number,microseconds} value - value to adapt
         * @return {number,microseconds} time adapted to current speed
         */
        _adaptToSpeed: function(value) {
            return Math.round(value * this._currentSpeed, 10);
        },
        /**
         * @method _toUs - converts milliseconds to microseconds
         * @access protected
         * @param  {number,milliseconds} milliseconds - value to convert
         * @return {number,microseconds} microseconds
         */
        _toUs: function(milliseconds) {
            return Math.round(milliseconds * 10e2);
        },
        /**
         * @method _toMs - converts microseconds to milliseconds
         * @access protected
         * @param  {number,microseconds} microseconds - value to convert
         * @return {number,milliseconds} milliseconds
         */
        _toMs: function(microseconds) {
            return (Math.round(microseconds) / 10e2);
        },
        /**
         * @method _finishSeeking - restoring playing settings after seeking, useful especially in PLAY_FRAMES mode
         * @access protected
         */
        _finishSeeking: function() {
            this._isSeeking = false;

            if('undefined' !== typeof this._previousAverageFrameDuration) {
                this._averageFrameDuration = this._resetAverageFrameDuration(this._previousAverageFrameDuration);
                delete this._previousAverageFrameDuration;
            }

            if('undefined' !== typeof this._previousRecordingEndTime) {
                this._recordingEndTime = this._previousRecordingEndTime;
                delete this._previousRecordingEndTime;
            }

            if('undefined' !== typeof this._previousDirection) {
                this._direction = this._previousDirection;
                delete this._previousDirection;
            }

            this._currentSpeed = this._speed;

            /**
             * @event seeked - fired when seeking is finished
             */
            this.emit('seeked', this._currentRecordingTime);
            /**
             * @event timeupdate - fired when seeking is finished
             */
            this.emit('timeupdate', this._currentRecordingTime);
        },
        /**
         * @method _startPlayingIfPaused - mixin for schedule frame when recording is stopped or paused
         * @access protected
         */
        _startPlayingIfPaused: function() {
            if(!this._requestedFrame) {
                this._lastFrameTime = 0;
                this._nextFrameDesiredTime = 0;
                this._requestedFrame = requestAnimationFrame(this._frame);
            }
        },
        /**
         * @method _ensureAvailability - throws error if instance was destroyed
         * @access protected
         */
        _ensureAvailability: function() {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }
        },
        /**
         * @method _createSpeedProperty - helper for creating property for storing speed
         *         property created with this function returns value of privateName property (value returned by function if it's function)
         *         and throws error when trying to set value not complying requirements
         * @access protected
         * @param  {object} conf - configuration
         *      @property {string} conf.privateName - name of private (protected) property
         *      @property {string} conf.publicName - name of public property
         * @return {object} ECMA5 property descriptor
         */
        _createSpeedProperty: function(conf) {
            var setVal = this[conf.privateName];

            return {
                get: function() {
                    if('function' === typeof setVal) {
                        return setVal(this);
                    } else {
                        return setVal;
                    }
                },
                set: function(value) {
                    // speed can be positive integer or function if it's seekingSpeed (or internal _currentSpeed)
                    if(('function' === typeof value) && (conf.publicName !== 'speed')) {
                        if(value !== setVal) {
                            this[conf.privateName] = setVal = value;
                        }
                    } else {
                        var parsed = parseFloat(value, 10);

                        if(!isNaN(parsed) && isFinite(parsed) && (parsed > 0)) {
                            if(parsed !== setVal) {
                                this[conf.privateName] = setVal = parsed;

                                if(conf.publicName === 'speed') {
                                    this.emit('ratechange', setVal);
                                }
                            }
                        } else {
                            if(conf.publicName === 'speed') {
                                throw new TypeError(conf.publicName + ' must be a positive number');
                            } else {
                                throw new TypeError(conf.publicName + ' must be a function or positive number');
                            }
                        }
                    }

                    if(this._isSeeking) {
                        if(conf.publicName === 'seekingSpeed') {
                            this._currentSpeed = setVal;
                        }
                    } else {
                        if(conf.publicName === 'speed') {
                            this._currentSpeed = setVal;
                        }
                    }

                    return setVal;
                }
            };
        },
        /**
         * @method _createSettingProperty - helper for creating setters based on enums
         *         property created with this function returns value of privateName property
         *         and throws error when trying to set value not present in enum
         * @access protected
         * @param  {object} conf - configuration
         *      @property {string} conf.privateName - name of private (protected) property
         *      @property {string} conf.publicName - name of public property
         * @return {object} ECMA5 property descriptor
         */
        _createSettingProperty: function(conf) {
            var enumValues = Object.keys(this[conf.enumName]).map(function(key) {
                return this[conf.enumName][key];
            }, this);

            return {
                get: function() {
                    return this[conf.privateName];
                },
                set: function(value) {
                    if((conf.publicName === 'seekingMode') && this._isSeeking) {
                        throw new Error('you can not change seeking mode during seeking');
                    } else if(enumValues.indexOf(value) !== -1) {
                        this[conf.privateName] = value;

                        return value;
                    } else {
                        throw new TypeError(conf.publicName + ' must have value from "' + conf.enumName + '" ENUM');
                    }
                }
            };
        },
        /**
         * @method _createGetter - helper for creating getters
         *         with default config, property created with this function returns value of privateName property
         *         and throws error when trying to set it
         * @access protected
         * @param  {object} conf - configuration
         *      @property {string} conf.privateName - name of private (protected) property to get
         *      @property {string} conf.publicName - name of public property
         *      @property {function} [conf.get] - custom getter function
         *      @property {function} [conf.set] - custom setter function
         * @return {object} ECMA5 property descriptor
         */
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


    Player.prototype.abort = Player.prototype.stop;
    Player.prototype.fastSeek = Player.prototype.seek;
    Player.prototype.dispose = Player.prototype.destroy;


    return Player;

})();
