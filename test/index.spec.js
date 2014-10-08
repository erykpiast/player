/* global jasmine, describe, describe, it, xit, expect, beforeEach, afterEach */
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10e5; // really big number, because Infinity doesn't work

var proxyquire = require('proxyquireify')(require);

var requestAnimationFrameMock = require('request-animation-frame-mock');

var Player = proxyquire('../index', {
    'request-animation-frame': requestAnimationFrameMock.mock
});


describe('Player class test', function() {

    it('Should be a function and should be instantiated', function() {
        expect(typeof Player).toBe('function');

        expect(function() {
            new Player([ ], function() { });
        }).not.toThrow();
    });

    it('Should throw an error if the first argument is not an array or the second one is not a function', function() {
        expect(function() {
            new Player('', function() { });
        }).toThrow();

        expect(function() {
            new Player([ ], { });
        }).toThrow();
    });

});


describe('Player instance test', function() {
    var player;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        player = new Player([ ], function() { });
    });

    afterEach(function() {
        player = null;
    });


    it('Should be an object with a bunch of methods', function() {
        expect(typeof player).toBe('object');

        expect(player.play).toBeDefined();
        expect(typeof player.play).toBe('function');

        expect(player.pause).toBeDefined();
        expect(typeof player.pause).toBe('function');

        expect(player.stop).toBeDefined();
        expect(typeof player.stop).toBe('function');

        expect(player.seek).toBeDefined();
        expect(typeof player.seek).toBe('function');

        expect(player.destroy).toBeDefined();
        expect(typeof player.destroy).toBe('function');
    });

});


describe('Player destroying test', function() {
    var player;
    var drawingFn;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        drawingFn = jasmine.createSpy('drawingFn');

        player = new Player([ { time: 0 } ], drawingFn);
    });

    afterEach(function() {
        player = null;
        drawingFn = null;
    });

    it('Should allow to clean things by destroy method', function() {
        expect(function() {
            player.destroy();
        }).not.toThrow();
    });

    it('Should stop playing when it is destroyed', function() {
        player.play();

        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        requestAnimationFrameMock.trigger(1020);
        expect(drawingFn.calls.count()).toBe(1);

        player.destroy();

        requestAnimationFrameMock.trigger(1040);
        expect(drawingFn.calls.count()).toBe(1);
    });

    it('Should prevent calling any public method after destroying', function() {
        player.destroy();

        expect(function() {
            player.play();
        }).toThrow();

        expect(function() {
            player.pause();
        }).toThrow();

        expect(function() {
            player.stop();
        }).toThrow();

        expect(function() {
            player.destroy();
        }).toThrow();
    });

    it('Should emit stop signal when player is playing and destroy method is called', function() {
        var stopHandler = jasmine.createSpy('stopHandler');
        player.on('stop', stopHandler);

        player.play();

        player.destroy();

        expect(stopHandler).toHaveBeenCalled();
    });

});


describe('Player.prototype.play test', function() {
    var frameTime = Math.round(1000 / 50);
    var player;
    var drawingFn;
    var exampleFrames = (function(count, difference) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: (frames[i - 1] ? frames[i - 1].time + difference : 0)
            };
        }

        return frames;
    })(100, frameTime);
    var drawingFnCalls;
    var playingStart;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.INTERVAL, {
            setInterval: window.setInterval.bind(window),
            clearInterval: window.clearInterval.bind(window),
            time: 1,
            frameTime: function (previousTime) {
                return previousTime + frameTime;
            }
        });

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes, nextKeyframe, currentRecordingTime, frameTime) {
            keyframes.forEach(function(keyframe, index) {
                var call = {
                    realTime: frameTime,
                    frameTime: keyframe.time,
                    timeDiff: Math.abs(parseFloat((keyframe.time - (frameTime - playingStart)).toFixed(3), 10)),
                    index: index
                };

                drawingFnCalls.push(call);
            });
        });
        player = new Player(exampleFrames, drawingFn);
        player.on('start', function(time) {
            playingStart = time;
        });
    });

    afterEach(function() {
        player.destroy();
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
    });

    it('Should call drawer function once for each frame and in order', function(done) {
        player.on('end', function() {
            expect(drawingFnCalls.length).toEqual(exampleFrames.length);
            drawingFn.calls.allArgs().forEach(function(args, index) {
                expect(args[0][0]).toBe(exampleFrames[index]);
            });

            done();
        });

        player.play();
    });

    it('Should call drawer function with no offset for the first keyframeif keyframes times are equal to frame times ', function(done) {
        player.on('end', function() {
            drawingFnCalls.filter(function(call) {
                return (call.index === 0);
            }).forEach(function(call) {
                expect(call.timeDiff).toBe(0);
            });

            done();
        });

        player.play(0);
    });

    it('Should allow to start playing from specified time', function(done) {
        var startTime = 1000;

        player.on('end', function() {
            var firstKeyframe = drawingFn.calls.argsFor(0)[0][0];
            var firstKeyframeIndex = exampleFrames.indexOf(firstKeyframe);
            var framesToPlay = exampleFrames.slice(firstKeyframeIndex);

            expect(firstKeyframe.time).not.toBeLessThan(startTime);

            expect(drawingFnCalls.length).toEqual(framesToPlay.length);
            drawingFn.calls.allArgs().forEach(function(args, index) {
                expect(args[0][0]).toBe(framesToPlay[index]);
            });

            done();
        });

        player.play(startTime);
    });

    it('Should allow to start playing from end to begin', function(done) {
        player.on('end', function() {
            expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[exampleFrames.length - 1]);

            expect(drawingFnCalls.length).toEqual(exampleFrames.length);
            drawingFn.calls.allArgs().forEach(function(args, index) {
                expect(args[0][0]).toBe(exampleFrames[exampleFrames.length - 1 - index]);
            });

            done();
        });

        player.play(exampleFrames[exampleFrames.length - 1].time, player.directions.BACKWARD);
    });

    it('Should allow to start playing from specified time to begin', function(done) {
        var startTime = 1000;

        player.on('end', function() {
            var firstKeyframe = drawingFn.calls.argsFor(0)[0][0];
            var firstKeyframeIndex = exampleFrames.indexOf(firstKeyframe);
            var framesToPlay = exampleFrames.slice(0, firstKeyframeIndex + 1).reverse();

            expect(firstKeyframe.time).not.toBeGreaterThan(startTime);

            expect(drawingFnCalls.length).toEqual(framesToPlay.length);
            drawingFn.calls.allArgs().forEach(function(args, index) {
                expect(args[0][0]).toBe(framesToPlay[index]);
            });

            done();
        });

        player.play(startTime, player.directions.BACKWARD);
    });

});


describe('Player.prototype.play with various speeds test', function() {
    var speed = 1;
    var player;
    var drawingFn;
    var drawingFnCalls;
    var playingStart;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.INTERVAL, {
            setInterval: window.setInterval.bind(window),
            clearInterval: window.clearInterval.bind(window),
            time: 1,
            frameTime: function (previousTime) {
                return previousTime + (1000 / 60);
            }
        });

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes, nextKeyframe, currentRecordingTime, frameTime) {
            keyframes.forEach(function(keyframe, index) {
                var call = {
                    realTime: frameTime,
                    frameTime: keyframe.time,
                    timeDiff: Math.abs(parseFloat((keyframe.time - (frameTime - playingStart) * speed).toFixed(3), 10)),
                    index: index
                };

                drawingFnCalls.push(call);
            });
        });
    });

    afterEach(function() {
        player.destroy();
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
        speed = 1;
    });

    function _maxTimeDiff(drawingFnCalls) {
        return drawingFnCalls.filter(function(call) {
            return (call.index === 0);
        }).map(function(call) {
            return call.timeDiff;
        }).reduce(function(a,b) {
            return Math.max(Math.abs(a), Math.abs(b));
        });
    }


    function _createFrames(count, difference) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: frames[i - 1] ? frames[i - 1].time + difference : 0
            };
        }

        return frames.map(function(frame) {
            frame.time = Math.round(frame.time);

            return frame;
        });
    }


    function _testSpeed(testedSpeed, framerate, framesCount) {
        return function(done) {
            player = new Player(_createFrames(framesCount, 1000 / framerate), drawingFn);
            player.on('start', function(startTime) {
                playingStart = startTime;
            });

            speed = testedSpeed;

            player._speed = speed;

            player.play();

            player.on('end', function() {
                expect(drawingFnCalls.length).toEqual(framesCount);

                // max time difference is two frames
                expect(_maxTimeDiff(drawingFnCalls)).not.toBeGreaterThan(Math.round((1000 / framerate) * speed * 2));

                done();
            });
        };
    }

    it('Should play 23.976fps recording with normal speed', _testSpeed(1, 23.976, 100));
    xit('Should play 25fps recording with normal speed', _testSpeed(1, 25, 100));
    xit('Should play 30fps recording with normal speed', _testSpeed(1, 30, 100));
    xit('Should play 60fps recording with normal speed', _testSpeed(1, 60, 100));

    it('Should play 23.976fps recording with double speed', _testSpeed(2, 23.976, 100));
    xit('Should play 25fps recording with double speed', _testSpeed(2, 25, 100));
    xit('Should play 30fps recording with double speed', _testSpeed(2, 30, 100));
    xit('Should play 60fps recording with double speed', _testSpeed(2, 60, 100));

    it('Should play 23.976fps recording with x4 speed', _testSpeed(4, 23.976, 100));
    xit('Should play 25fps recording with x4 speed', _testSpeed(4, 25, 100));
    xit('Should play 30fps recording with x4 speed', _testSpeed(4, 30, 100));
    xit('Should play 60fps recording with x4 speed', _testSpeed(4, 60, 100));

    it('Should play 23.976fps recording with super high speed', _testSpeed(64, 23.976, 100));
    xit('Should play 25fps recording with super high speed', _testSpeed(64, 25, 100));
    xit('Should play 30fps recording with super high speed', _testSpeed(64, 30, 100));
    xit('Should play 60fps recording with super high speed', _testSpeed(64, 60, 100));

    it('Should play 23.976fps recording with slow speed', _testSpeed(0.5, 23.976, 100));
    xit('Should play 25fps recording with slow speed', _testSpeed(0.5, 25, 100));
    xit('Should play 30fps recording with slow speed', _testSpeed(0.5, 30, 100));
    xit('Should play 60fps recording with slow speed', _testSpeed(0.5, 60, 100));

    it('Should play 23.976fps recording with super slow speed', _testSpeed(0.1, 23.976, 100));
    xit('Should play 25fps recording with super slow speed', _testSpeed(0.1, 25, 100));
    xit('Should play 30fps recording with super slow speed', _testSpeed(0.1, 30, 100));
    xit('Should play 60fps recording with super slow speed', _testSpeed(0.1, 60, 100));

});


describe('Player.prototype.pause test', function() {
    var player;
    var drawingFn;
    var exampleFrames = (function(count, difference) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: (frames[i - 1] ? frames[i - 1].time : 0) + Math.floor(Math.random() * difference)
            };
        }

        return frames;
    })(100, 100);
    var drawingFnCalls;
    var playingStart;

    beforeEach(function(done) {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.INTERVAL, {
            setInterval: window.setInterval.bind(window),
            clearInterval: window.clearInterval.bind(window),
            time: 1,
            frameTime: function (previousTime) {
                return previousTime + (1000 / 60) + (Math.random() * (1000 / 60));
            }
        });

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes, nextKeyframe, currentRecordingTime, frameTime) {
            keyframes.forEach(function(keyframe, index) {
                var call = {
                    realTime: frameTime,
                    frameTime: keyframe.time,
                    timeDiff: Math.abs(parseFloat((keyframe.time - (frameTime - playingStart)).toFixed(3), 10)),
                    index: index,
                    keyframe: keyframe
                };

                drawingFnCalls.push(call);
            });
        });
        player = new Player(exampleFrames, drawingFn);
        player.on('start', function() {
            playingStart = Date.now();
        });
        player.play();

        setTimeout(function() {
            player.pause();

            done();
        }, 20); // !!! 20 ms is the lowest possible value that works correctly in PhanomJS; don't ask why.
    });

    afterEach(function() {
        player.stop();
        player.destroy();
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
    });

    it('Should call drawer function once for some but not all frames and in order', function() {
        expect(drawingFnCalls.length).not.toEqual(exampleFrames.length);

        drawingFnCalls.forEach(function(call, index) {
            expect(call.keyframe).toBe(exampleFrames[index]);
        });
    });

    it('Should call drawer function once for all left frames after resuming playing', function(done) {
        player.play();

        player.on('end', function() {
            expect(drawingFnCalls.length).toEqual(exampleFrames.length);
            drawingFnCalls.forEach(function(call, index) {
                expect(call.keyframe).toBe(exampleFrames[index]);
            });

            done();
        });
    });

});


describe('Player.prototype.stop test', function() {
    var player;
    var drawingFn;
    var exampleFrames = (function(count, difference) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: (frames[i - 1] ? frames[i - 1].time : 0) + Math.floor(Math.random() * difference)
            };
        }

        return frames;
    })(100, 100);
    var drawingFnCalls;
    var stopHandler;

    beforeEach(function(done) {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.INTERVAL, {
            setInterval: window.setInterval.bind(window),
            clearInterval: window.clearInterval.bind(window),
            time: 1,
            frameTime: function (previousTime) {
                return previousTime + (1000 / 60) + (Math.random() * (1000 / 60));
            }
        });

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes) {
            keyframes.forEach(function(keyframe) {
                drawingFnCalls.push(keyframe);
            });
        });
        stopHandler = jasmine.createSpy('stopHandler');
        player = new Player(exampleFrames, drawingFn);
        player.play();
        player.on('stop', stopHandler);

        setTimeout(function() {
            player.stop();

            done();
        }, 10);
    });

    afterEach(function() {
        player.destroy();
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        player = null;
        drawingFn = null;
        drawingFnCalls = null;
        stopHandler = null;
    });

    it('Should call drawer function once for some but not all frames and in order', function() {
        expect(drawingFnCalls.length).not.toEqual(exampleFrames.length);

        drawingFnCalls.forEach(function(keyframe, index) {
            expect(keyframe).toBe(exampleFrames[index]);
        });
    });

    it('Should start playing from start of the recording after calling play', function(done) {
        drawingFn.calls.reset();
        drawingFnCalls = [ ];

        player.play();

        player.on('end', function() {
            expect(drawingFnCalls[0]).toBe(exampleFrames[0]);
            expect(drawingFnCalls.length).toEqual(exampleFrames.length);

            done();
        });
    });

    it('Should emit stop signal', function() {
        expect(stopHandler).toHaveBeenCalled();
    });

});


describe('Player synchronization test', function() {
    var framesCount = 200;
    var player;
    var drawingFn;
    var drawingFnCalls;
    var playingStart;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes, nextKeyframe, currentRecordingTime, frameTime) {
            keyframes.forEach(function(keyframe, index) {
                var call = {
                    realTime: frameTime,
                    frameTime: keyframe.time,
                    timeDiff: Math.abs(parseFloat((keyframe.time - (frameTime - playingStart)).toFixed(3), 10)),
                    index: index
                };

                drawingFnCalls.push(call);
            });
        });
    });

    afterEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);
        player.destroy();

        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
    });

    function _maxTimeDiff(drawingFnCalls) {
        return drawingFnCalls.filter(function(call) {
            return (call.index === 0);
        }).map(function(call) {
            return call.timeDiff;
        }).reduce(function(a,b) {
            return Math.max(Math.abs(a), Math.abs(b));
        });
    }


    function _createFrames(count, difference) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: (frames[i - 1] ? frames[i - 1].time + difference : 0)
            };
        }

        return frames.map(function(frame) {
            frame.time = Math.round(frame.time);

            return frame;
        });
    }


    function _test(keyframesDiff, framesDiff, mixin) {
        return function(done) {
            var exampleFrames;

            requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.INTERVAL, {
                setInterval: window.setInterval.bind(window),
                clearInterval: window.clearInterval.bind(window),
                time: 1,
                frameTime: function (previousTime) {
                    return previousTime + framesDiff;
                }
            });

            player = new Player(exampleFrames = _createFrames(framesCount, keyframesDiff), drawingFn);
            player.on('start', function(startTime) {
                playingStart = startTime;
            });

            player.play();

            player.on('end', function() {
                expect(drawingFnCalls.length).toEqual(framesCount);
                expect(_maxTimeDiff(drawingFnCalls)).toBe(0);

                if('function' === typeof mixin) {
                    mixin(keyframesDiff, framesDiff, exampleFrames);
                }

                done();
            });
        };
    }


    it('Should play exactly two keyframes per frame if time difference between ' +
        'keyframes is twice as less than difference between frames',
        _test(10, 20, function(keyframesDiff, framesDiff) {
            expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)));

            drawingFn.calls.allArgs().map(function(args) {
                return args[0]; // keyframes
            }).forEach(function(keyframes) {
                expect(keyframes.length).toEqual(2);
            });
        }));

    it('Should play exactly two keyframes per frame if time difference between ' +
        'keyframes is four as less than difference between frames',
        _test(10, 40, function(keyframesDiff, framesDiff) {
            expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)));

            drawingFn.calls.allArgs().map(function(args) {
                return args[0]; // keyframes
            }).forEach(function(keyframes) {
                expect(keyframes.length).toEqual(4);
            });
        }));

    it('Should play exactly one keyframe per each two frames if time difference ' +
        'between keyframes is twice as great than difference between frames',
        _test(20, 10, function(keyframesDiff, framesDiff, exampleFrames) {
        // -1 is because in call preceding the 400 last keyframe is emitted
        expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)) - 1);

        drawingFn.calls.allArgs().map(function(args) {
            return args[0]; // keyframes
        }).forEach(function(keyframes, index) {
            if((index % 2) === 0) {
                expect(keyframes.length).toEqual(1);

                expect(keyframes[0]).toBe(exampleFrames[Math.floor(index / 2)]);
            } else {
                expect(keyframes.length).toEqual(0);
            }
        });
    }));

    it('Should play exactly one keyframe per each four frames if time difference ' +
        'between keyframes is four as great than difference between frames',
        _test(40, 10, function(keyframesDiff, framesDiff, exampleFrames) {
        // -1 is because in call preceding the 400 last keyframe is emitted
        expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)) - 3);

        drawingFn.calls.allArgs().map(function(args) {
            return args[0]; // keyframes
        }).forEach(function(keyframes, index) {
            if((index % 4) === 0) {
                expect(keyframes.length).toEqual(1);

                expect(keyframes[0]).toBe(exampleFrames[Math.floor(index / 4)]);
            } else {
                expect(keyframes.length).toEqual(0);
            }
        });
    }));

    it('Should emit keyframes for estimated frame time starting from frame time', function() {
        var frameTime = 20;
        var exampleFrames = [{
            time: 0
        }, {
            time: 10
        }, {
            time: 20
        }, {
            time: 21
        }, {
            time: 39
        }];

        player = new Player(exampleFrames, drawingFn);

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[0]);
        expect(drawingFn.calls.argsFor(0)[0][1]).toBe(exampleFrames[1]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(3);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[2]);
        expect(drawingFn.calls.argsFor(1)[0][1]).toBe(exampleFrames[3]);
        expect(drawingFn.calls.argsFor(1)[0][2]).toBe(exampleFrames[4]);
    });

    it('Should emit all keyframes for time that passed between current and last frame even if it is bigger than estimated time',
    function() {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[0]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[1]);

        // now two keyframes should be emitted - one for time from 1040 to 1060 and one for 1060 to 1080
        requestAnimationFrameMock.trigger(1000 + (4 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[2]);
        expect(drawingFn.calls.argsFor(2)[0][1]).toBe(exampleFrames[3]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (5 * frameTime));
        expect(drawingFn.calls.count()).toBe(4);
        expect(drawingFn.calls.argsFor(3)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(3)[0][0]).toBe(exampleFrames[4]);
    });

});


describe('Player synchronization test BACKWARD', function() {
    var framesCount = 200;
    var player;
    var drawingFn;
    var drawingFnCalls;
    var playingStart;
    var exampleFrames;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes, nextKeyframe, currentRecordingTime, frameTime) {
            var lastKeyframeTime = exampleFrames[exampleFrames.length - 1].time;

            keyframes.forEach(function(keyframe, index) {
                var call = {
                    realTime: frameTime,
                    frameTime: keyframe.time,
                    timeDiff: Math.abs(parseFloat((lastKeyframeTime - keyframe.time - (frameTime - playingStart)).toFixed(3), 10)),
                    index: index
                };

                drawingFnCalls.push(call);
            });
        });
    });

    afterEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);
        player.destroy();

        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
        exampleFrames = null;
    });

    function _maxTimeDiff(drawingFnCalls) {
        return drawingFnCalls.filter(function(call) {
            return (call.index === 0);
        }).map(function(call) {
            return call.timeDiff;
        }).reduce(function(a,b) {
            return Math.max(Math.abs(a), Math.abs(b));
        });
    }


    function _createFrames(count, difference) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: (frames[i - 1] ? frames[i - 1].time + difference : 0)
            };
        }

        return frames.map(function(frame) {
            frame.time = Math.round(frame.time);

            return frame;
        });
    }


    function _test(keyframesDiff, framesDiff, mixin) {
        return function(done) {
            requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.INTERVAL, {
                setInterval: window.setInterval.bind(window),
                clearInterval: window.clearInterval.bind(window),
                time: 1,
                frameTime: function (previousTime) {
                    return previousTime + framesDiff;
                }
            });

            player = new Player(exampleFrames = _createFrames(framesCount, keyframesDiff), drawingFn);
            player.on('start', function(startTime) {
                playingStart = startTime;
            });

            player.play(exampleFrames[exampleFrames.length - 1].time, player.directions.BACKWARD);

            player.on('end', function() {
                expect(drawingFnCalls.length).toEqual(framesCount);
                expect(_maxTimeDiff(drawingFnCalls)).toBe(0);

                if('function' === typeof mixin) {
                    mixin(keyframesDiff, framesDiff, exampleFrames);
                }

                done();
            });
        };
    }


    it('Should play exactly two keyframes per frame if time difference between ' +
        'keyframes is twice as less than difference between frames',
        _test(10, 20, function(keyframesDiff, framesDiff) {
            expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)));

            drawingFn.calls.allArgs().map(function(args) {
                return args[0]; // keyframes
            }).forEach(function(keyframes) {
                expect(keyframes.length).toEqual(2);
            });
        }));

    it('Should play exactly two keyframes per frame if time difference between ' +
        'keyframes is four as less than difference between frames',
        _test(10, 40, function(keyframesDiff, framesDiff) {
            expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)));

            drawingFn.calls.allArgs().map(function(args) {
                return args[0]; // keyframes
            }).forEach(function(keyframes) {
                expect(keyframes.length).toEqual(4);
            });
        }));

    it('Should play exactly one keyframe per each two frames if time difference ' +
        'between keyframes is twice as great than difference between frames',
        _test(20, 10, function(keyframesDiff, framesDiff, exampleFrames) {
        // -1 is because in call preceding the 400 last keyframe is emitted
        expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)) - 1);

        drawingFn.calls.allArgs().map(function(args) {
            return args[0]; // keyframes
        }).forEach(function(keyframes, index) {
            if((index % 2) === 0) {
                expect(keyframes.length).toEqual(1);

                expect(keyframes[0]).toBe(exampleFrames[exampleFrames.length - 1 -Math.floor(index / 2)]);
            } else {
                expect(keyframes.length).toEqual(0);
            }
        });
    }));

    it('Should play exactly one keyframe per each four frames if time difference ' +
        'between keyframes is four as great than difference between frames',
        _test(40, 10, function(keyframesDiff, framesDiff, exampleFrames) {
        // -1 is because in call preceding the 400 last keyframe is emitted
        expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)) - 3);

        drawingFn.calls.allArgs().map(function(args) {
            return args[0]; // keyframes
        }).forEach(function(keyframes, index) {
            if((index % 4) === 0) {
                expect(keyframes.length).toEqual(1);

                expect(keyframes[0]).toBe(exampleFrames[exampleFrames.length - 1 -Math.floor(index / 4)]);
            } else {
                expect(keyframes.length).toEqual(0);
            }
        });
    }));

    it('Should emit keyframes for estimated frame time starting from frame time', function() {
        var frameTime = 20;
        exampleFrames = [{
            time: 1
        }, {
            time: 19
        }, {
            time: 20
        }, {
            time: 30
        }, {
            time: 40
        }];

        player = new Player(exampleFrames, drawingFn);

        player.play(exampleFrames[exampleFrames.length - 1].time, player.directions.BACKWARD);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[exampleFrames.length - 1]);
        expect(drawingFn.calls.argsFor(0)[0][1]).toBe(exampleFrames[exampleFrames.length - 2]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(3);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[exampleFrames.length - 3]);
        expect(drawingFn.calls.argsFor(1)[0][1]).toBe(exampleFrames[exampleFrames.length - 4]);
        expect(drawingFn.calls.argsFor(1)[0][2]).toBe(exampleFrames[exampleFrames.length - 5]);
    });

    it('Should emit all keyframes for time that passed between current and last frame even if it is bigger than estimated time',
    function() {
        var frameTime = 20;
        exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);

        player.play(exampleFrames[exampleFrames.length - 1].time, player.directions.BACKWARD);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[exampleFrames.length - 1]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[exampleFrames.length - 2]);

        // now two keyframes should be emitted - one for time from 1040 to 1060 and one for 1060 to 1080
        requestAnimationFrameMock.trigger(1000 + (4 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[exampleFrames.length - 3]);
        expect(drawingFn.calls.argsFor(2)[0][1]).toBe(exampleFrames[exampleFrames.length - 4]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (5 * frameTime));
        expect(drawingFn.calls.count()).toBe(4);
        expect(drawingFn.calls.argsFor(3)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(3)[0][0]).toBe(exampleFrames[exampleFrames.length - 5]);
    });

});


describe('Player.prototype.seek test', function() {
    var player;
    var drawingFn;
    var drawingFnCalls;
    var playingStart;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes) {
            keyframes.forEach(function(keyframe) {
                drawingFnCalls.push(keyframe);
            });
        });
    });

    afterEach(function() {
        player.destroy();

        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
    });


    function _createFrames(count, difference) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: (frames[i - 1] ? frames[i - 1].time + difference : 0)
            };
        }

        return frames.map(function(frame) {
            frame.time = Math.round(frame.time);

            return frame;
        });
    }

    it('Should move to desired time after seeking in default mode', function() {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[0]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[1]);

        player.seek(exampleFrames[80].time);

        // next keyframes emitted from seeked position
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[80]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (4 * frameTime));
        expect(drawingFn.calls.count()).toBe(4);
        expect(drawingFn.calls.argsFor(3)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(3)[0][0]).toBe(exampleFrames[81]);
    });

    it('Should move to desired time after seeking in PLAY_FRAMES mode', function() {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);
        player.seekingMode = player.seeking.PLAY_FRAMES;

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[0]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[1]);

        player.seek(exampleFrames[80].time);

        // next keyframes emitted from seeked position
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(79);
        expect(drawingFn.calls.argsFor(2)[0]).toEqual(exampleFrames.slice(2, 81));

        // for empty frame after seeking
        requestAnimationFrameMock.trigger(1000 + (4 * frameTime));

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (5 * frameTime));
        expect(drawingFn.calls.count()).toBe(4);
        expect(drawingFn.calls.argsFor(3)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(3)[0][0]).toBe(exampleFrames[81]);

        expect(drawingFnCalls.length).toBe(82);
    });

    it('Should move to time before current after seeking in PLAY_FRAMES mode', function() {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);
        player.seekingMode = player.seeking.PLAY_FRAMES;

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // play for some time
        for(var i = 1; i < 81; i++) {
            requestAnimationFrameMock.trigger(1000 + (i * frameTime));
            expect(drawingFn.calls.count()).toBe(i);
            expect(drawingFn.calls.argsFor(i - 1)[0].length).toBe(1);
            expect(drawingFn.calls.argsFor(i - 1)[0][0]).toEqual(exampleFrames[i - 1]);
        }

        // seek
        player.seek(exampleFrames[40].time);

        // next keyframes emitted from current to seeked position
        requestAnimationFrameMock.trigger(1000 + (81 * frameTime));
        expect(drawingFn.calls.count()).toBe(81);
        expect(drawingFn.calls.argsFor(80)[0].length).toBe(40);
        expect(drawingFn.calls.argsFor(80)[0]).toEqual(exampleFrames.slice(40, 80).reverse());

        // for empty frame after seeking
        requestAnimationFrameMock.trigger(1000 + (82 * frameTime));

        // next keyframes emitted in normal way from seeked position
        // notice that time passed to requestAnimationFrame callbacks is "normal", I mean
        // generating 40 frames in seeking mode doesn't take more time than usual frame
        requestAnimationFrameMock.trigger(1000 + (83 * frameTime));
        expect(drawingFn.calls.count()).toBe(82);
        expect(drawingFn.calls.argsFor(81)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(81)[0][0]).toBe(exampleFrames[40]);
    });

    it('Should keep playing synchronization after seeking in PLAY_FRAMES mode', function() {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);
        player.seekingMode = player.seeking.PLAY_FRAMES;

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // play for some time
        for(var i = 1; i < 81; i++) {
            requestAnimationFrameMock.trigger(1000 + (i * frameTime));
            expect(drawingFn.calls.count()).toBe(i);
            expect(drawingFn.calls.argsFor(i - 1)[0].length).toBe(1);
            expect(drawingFn.calls.argsFor(i - 1)[0][0]).toEqual(exampleFrames[i - 1]);
        }

        // seek
        player.seek(exampleFrames[40].time);

        // next keyframes emitted from current to seeked position
        requestAnimationFrameMock.trigger(1000 + (81 * frameTime));
        expect(drawingFn.calls.count()).toBe(81);
        expect(drawingFn.calls.argsFor(80)[0].length).toBe(40);
        expect(drawingFn.calls.argsFor(80)[0]).toEqual(exampleFrames.slice(40, 80).reverse());

        // for empty frame after seeking
        requestAnimationFrameMock.trigger(1000 + (101 * frameTime));

        // next keyframes emitted in normal way from seeked position
        // notice that time passed to requestAnimationFrame callbacks is much bigger than for previous call
        // generating 40 keyframes in seeking mode can take much more time than generating usual frame
        // player should still be synchronized and do not emit "missing" keyframes for that huge period
        requestAnimationFrameMock.trigger(1000 + (102 * frameTime));
        expect(drawingFn.calls.count()).toBe(82);
        expect(drawingFn.calls.argsFor(81)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(81)[0][0]).toBe(exampleFrames[40]);

        // next keyframes emitted in normal way from seeked position
        requestAnimationFrameMock.trigger(1000 + (103 * frameTime));
        expect(drawingFn.calls.count()).toBe(83);
        expect(drawingFn.calls.argsFor(82)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(82)[0][0]).toBe(exampleFrames[41]);
    });

    it('Should restore playing settings after seeking in PLAY_FRAMES mode', function() {
        var speed = 2;
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn, {
            speed: speed
        });
        player.seekingMode = player.seeking.PLAY_FRAMES;

        player.play(exampleFrames[exampleFrames.length - 1].time, player.directions.BACKWARD);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // seeking to the last frame
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(exampleFrames.length);
        expect(drawingFn.calls.argsFor(0)[0]).toEqual(exampleFrames);

        // for empty frame after seeking
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));

        // play for some time (40 frames)
        for(var i = 3; i < 43; i++) {
            requestAnimationFrameMock.trigger(1000 + (i * frameTime));
            expect(drawingFn.calls.count()).toBe(i - 1);
            expect(drawingFn.calls.argsFor(i - 2)[0].length).toBe(speed);
            expect(drawingFn.calls.argsFor(i - 2)[0]).toEqual(
                exampleFrames.slice(exampleFrames.length - (i - 3) * speed - 2, exampleFrames.length - (i - 3) * speed).reverse()
            );
        }

        // seek
        player.seek(exampleFrames[80].time);

        // next keyframes emitted from current to seeked position (with opposite direction than normal playing)
        requestAnimationFrameMock.trigger(1000 + (43 * frameTime));
        expect(drawingFn.calls.count()).toBe(42);
        expect(drawingFn.calls.argsFor(41)[0].length).toBe(61);
        expect(drawingFn.calls.argsFor(41)[0]).toEqual(exampleFrames.slice(20, 81));

        // for empty frame after seeking
        requestAnimationFrameMock.trigger(1000 + (44 * frameTime));

        // continue playing with original direction and speed
        requestAnimationFrameMock.trigger(1000 + (45 * frameTime));
        expect(drawingFn.calls.count()).toBe(43);
        expect(drawingFn.calls.argsFor(42)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(42)[0]).toEqual(exampleFrames.slice(79, 81).reverse());

        requestAnimationFrameMock.trigger(1000 + (46 * frameTime));
        expect(drawingFn.calls.count()).toBe(44);
        expect(drawingFn.calls.argsFor(43)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(43)[0]).toEqual(exampleFrames.slice(77, 79).reverse());
    });

});


describe('Player integration test', function() {
    var frameTime = 20;
    var player;
    var drawingFn;
    var drawingFnCalls;
    var playingStart;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.INTERVAL, {
            setInterval: window.setInterval.bind(window),
            clearInterval: window.clearInterval.bind(window),
            time: 1,
            frameTime: function (previousTime) {
                return previousTime + frameTime;
            }
        });

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes) {
            keyframes.forEach(function(keyframe) {
                drawingFnCalls.push(keyframe);
            });
        });
    });

    afterEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);
        player.destroy();

        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
    });


    function _createFrames(count, difference) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: (frames[i - 1] ? frames[i - 1].time + difference : 0)
            };
        }

        return frames.map(function(frame) {
            frame.time = Math.round(frame.time);

            return frame;
        });
    }

    it('Should play video if play, pause and play was called in one tick', function(done) {
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);
        player.on('end', function() {
            expect(drawingFn.calls.count()).toBe(exampleFrames.length);

            done();
        });

        player.play();
        player.pause();
        player.play();
    });

    it('Should play video if play, stop and play was called in one tick', function(done) {
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);
        player.on('end', function() {
            expect(drawingFn.calls.count()).toBe(exampleFrames.length);

            done();
        });

        player.play();
        player.stop();
        player.play();
    });

    it('Should pause video if play, seek (in PLAY_FRAMES mode) and pause was called in one tick', function(done) {
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);
        player.seekingMode = player.seeking.PLAY_FRAMES;
        player.on('seekend', function() {
            expect(drawingFn.calls.count()).toBe(1);
            expect(drawingFn.calls.argsFor(0)[0].length).toBe(40);
            expect(player.isPaused).toBeTruthy();

            setTimeout(function() {
                expect(drawingFn.calls.count()).toBe(1);

                done();
            }, 100);
        });

        player.play();
        player.seek(exampleFrames[39].time);
        player.pause();
    });

    it('Should keep video paused if play, pause and seek (in PLAY_FRAMES mode) was called in one tick', function(done) {
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);
        player.seekingMode = player.seeking.PLAY_FRAMES;
        player.on('seekend', function() {
            expect(drawingFn.calls.count()).toBe(1);
            expect(drawingFn.calls.argsFor(0)[0].length).toBe(40);
            expect(player.isPaused).toBeTruthy();

            setTimeout(function() {
                expect(drawingFn.calls.count()).toBe(1);

                done();
            }, 100);
        });

        player.play();
        player.pause();
        player.seek(exampleFrames[39].time);
    });

    it('Should stop seeking video (in PLAY_FRAMES mode) if stop method was called', function(done) {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);
        player.seekingMode = player.seeking.PLAY_FRAMES;

        player.seek(exampleFrames[39].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000);

        player.on('stop', function() {
            expect(drawingFn.calls.count()).toBe(0);
            expect(player.isStopped).toBeTruthy();

            setTimeout(function() {
                expect(drawingFn.calls.count()).toBe(0);

                done();
            }, 100);
        });

        setTimeout(function() {
            player.stop();
        }, 20);
    });

});