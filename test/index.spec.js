/* global jasmine, describe, describe, it, xit, expect, beforeEach, afterEach */
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10e5; // really big number, because Infinity doesn't work

var proxyquire = require('proxyquireify')(require);

var requestAnimationFrameMock = require('request-animation-frame-mock');

var Player = proxyquire('../index', {
    'request-animation-frame': requestAnimationFrameMock.mock
});


/* TO DO:
 *  - playing from time in PLAY_FRAMES mode synchronization test
 *  - playing when seeking in PLAY_FRAMES mode synchronization test
 *  - signals test
 */


describe('Player class test', function() {

    it('Should be a function and should be instantiated', function() {
        expect(typeof Player).toBe('function');

        expect(function() {
            new Player([ { time: 0 } ], function() { });
        }).not.toThrow();
    });

    it('Should throw an error if the first argument is not an non-empty array or the second one is not a function', function() {
        expect(function() {
            new Player(undefined, function() { });
        }).toThrow();

        expect(function() {
            new Player(null, function() { });
        }).toThrow();

        expect(function() {
            new Player({ }, function() { });
        }).toThrow();

        expect(function() {
            new Player([ ], function() { });
        }).toThrow();

        expect(function() {
            new Player([ { time: 0} ], { });
        }).toThrow();
    });

});


describe('Player instance test', function() {
    var player;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        player = new Player([{
            time: 0
        }], function() { });
    });

    afterEach(function() {
        player.destroy();
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

        expect(player.abort).toBeDefined();
        expect(typeof player.abort).toBe('function');
        expect(player.abort).toBe(player.stop);

        expect(player.seek).toBeDefined();
        expect(typeof player.seek).toBe('function');

        expect(player.fastSeek).toBeDefined();
        expect(typeof player.fastSeek).toBe('function');
        expect(player.fastSeek).toBe(player.seek);

        expect(player.destroy).toBeDefined();
        expect(typeof player.destroy).toBe('function');

        expect(player.dispose).toBeDefined();
        expect(typeof player.dispose).toBe('function');
        expect(player.dispose).toBe(player.destroy);
    });


    describe('Getters and setters', function() {

        describe('speeds', function() {
            var drawingFn;

            beforeEach(function() {
                drawingFn = jasmine.createSpy('drawingFn');

                player.destroy();
                player = new Player([{
                    time: 0
                }, {
                    time: 20
                }, {
                    time: 40
                }, {
                    time: 60
                }, {
                    time: 80
                }, {
                    time: 100
                }, {
                    time: 120
                }], drawingFn, {
                    speed: 2,
                    seekingSpeed: 20,
                    seekingMode: Player.seeking.PLAY_FRAMES
                });
            });

            afterEach(function() {
                drawingFn = null;
            });


            it('Should allow to set speeds by configuration object passed to constructor', function() {
                expect(player.speed).toEqual(2);
                expect(player.seekingSpeed).toEqual(20);
            });

            it('Should allow to get and set current playing speed', function() {
                player.speed = 10;

                expect(player.speed).toEqual(10);
            });

            it('Should allow to get and set seeking speed', function() {
                player.seekingSpeed = 100;

                expect(player.seekingSpeed).toEqual(100);
            });

            it('Should allow to get current speed when playing', function() {
                player.speed = 100;

                player.play();

                expect(player.currentSpeed).toEqual(100);
            });

            it('Should allow to get current speed when seeking', function() {
                player.seekingSpeed = 100;

                player.seek(100);

                expect(player.currentSpeed).toEqual(100);
            });

            it('Should allow to get and set playing and seeking speed without breaking each other', function() {
                player.speed = 10;
                player.seekingSpeed = 100;
                player.speed = 20;

                expect(player.speed).toEqual(20);
                expect(player.seekingSpeed).toEqual(100);
            });

            it('Should allow to set new speed during playing', function() {
                player.speed = 1;
                player.play();

                // initial frame
                requestAnimationFrameMock.trigger(1000);

                // first frame
                requestAnimationFrameMock.trigger(1020);
                expect(drawingFn.calls.count()).toBe(1);
                expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);

                expect(function() {
                    player.speed = 2;
                }).not.toThrow();

                // next key frames
                requestAnimationFrameMock.trigger(1040);
                expect(drawingFn.calls.count()).toBe(2);
                expect(drawingFn.calls.argsFor(1)[0].length).toBe(2);
            });

            it('Should allow to set new seeking speed during seeking', function() {
                player.seekingSpeed = 1;
                player.seek(100);

                // initial frame
                requestAnimationFrameMock.trigger(1000);

                // first frame
                requestAnimationFrameMock.trigger(1020);
                expect(drawingFn.calls.count()).toBe(1);
                expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);

                expect(function() {
                    player.seekingSpeed = function() {
                        return 2;
                    };
                }).not.toThrow();

                // next key frames
                requestAnimationFrameMock.trigger(1040);
                expect(drawingFn.calls.count()).toBe(2);
                expect(drawingFn.calls.argsFor(1)[0].length).toBe(2);

                expect(function() {
                    player.seekingSpeed = 3;
                }).not.toThrow();

                // next key frames
                requestAnimationFrameMock.trigger(1060);
                expect(drawingFn.calls.count()).toBe(3);
                expect(drawingFn.calls.argsFor(2)[0].length).toBe(3);
            });

            it('Should allow to set new speed during seeking', function() {
                player.speed = 1;
                player.seek(100);

                // initial frame
                requestAnimationFrameMock.trigger(1000);

                // first frame
                requestAnimationFrameMock.trigger(1020);

                // next key frames
                requestAnimationFrameMock.trigger(1040);

                expect(function() {
                    player.speed = 2;
                }).not.toThrow();

                // frames to the end of seeking
                for(var i = 0; i < 101; i++) {
                    requestAnimationFrameMock.trigger(1060 + (i * 20));
                }

                expect(player.currentSpeed).toEqual(2);
            });


            describe('error handling', function() {

                it('Should throw if speed is not a positive, finite number', function() {

                    expect(function() {
                        player.speed = 2;
                    }).not.toThrow();

                    expect(function() {
                        player.speed = 0.0000001;
                    }).not.toThrow();

                    expect(function() {
                        player.speed = 50.312;
                    }).not.toThrow();

                    expect(function() {
                        player.speed = 0;
                    }).toThrow();

                    expect(function() {
                        player.speed = -1;
                    }).toThrow();

                    expect(function() {
                        player.speed = Infinity;
                    }).toThrow();

                    expect(function() {
                        player.speed = undefined;
                    }).toThrow();

                    expect(function() {
                        player.speed = null;
                    }).toThrow();

                    expect(function() {
                        player.speed = '0b01';
                    }).toThrow();

                    expect(function() {
                        player.speed = function() { return 1; };
                    }).toThrow();

                });

                it('Should throw if seekingSpeed is not a positive, finite number or function', function() {

                    expect(function() {
                        player.seekingSpeed = 2;
                    }).not.toThrow();

                    expect(function() {
                        player.seekingSpeed = 0.0000001;
                    }).not.toThrow();

                    expect(function() {
                        player.seekingSpeed = 50.312;
                    }).not.toThrow();

                    expect(function() {
                        player.seekingSpeed = function() { return 1; };
                    }).not.toThrow();
                    
                    expect(function() {
                        player.seekingSpeed = 0;
                    }).toThrow();

                    expect(function() {
                        player.seekingSpeed = -1;
                    }).toThrow();

                    expect(function() {
                        player.seekingSpeed = Infinity;
                    }).toThrow();

                    expect(function() {
                        player.seekingSpeed = undefined;
                    }).toThrow();

                    expect(function() {
                        player.seekingSpeed = null;
                    }).toThrow();

                    expect(function() {
                        player.seekingSpeed = '0b01';
                    }).toThrow();

                });

            });

        });

        describe('seeking mode', function() {
            var drawingFn;

            beforeEach(function() {
                drawingFn = jasmine.createSpy('drawingFn');

                player.destroy();
                player = new Player([{
                    time: 0
                }, {
                    time: 20
                }, {
                    time: 40
                }, {
                    time: 60
                }, {
                    time: 80
                }, {
                    time: 100
                }, {
                    time: 120
                }], drawingFn, {
                    seekingMode: Player.seeking.PLAY_FRAMES
                });
            });

            afterEach(function() {
                drawingFn = null;
            });


            it('Should allow to set seeking mode by configuration object passed to constructor', function() {
                expect(player.seekingMode).toBe(Player.seeking.PLAY_FRAMES);
            });

            it('Should allow to set seeking mode by property', function() {
                player.seekingMode = Player.seeking.OMIT_FRAMES;

                expect(player.seekingMode).toBe(Player.seeking.OMIT_FRAMES);
            });

            it('Should allow to set seeking mode to values from seeking enum', function() {
                expect(function() {
                    player.seekingMode = Player.seeking.OMIT_FRAMES;
                }).not.toThrow();
                expect(player.seekingMode).toBe(Player.seeking.OMIT_FRAMES);
                
                expect(function() {
                    player.seekingMode = Player.seeking.PLAY_FRAMES;
                }).not.toThrow();
                expect(player.seekingMode).toBe(Player.seeking.PLAY_FRAMES);
            });

            describe('error handling', function() {

                it('Should throw if trying to change seeking mode to value beyond the seeking enum', function() {
                    expect(function() {
                        player.seekingMode = Player.seeking.XXX_MODE;
                    }).toThrow();

                    expect(function() {
                        player.seekingMode = 30;
                    }).toThrow();

                    expect(function() {
                        player.seekingMode = 'f4nCy M0d3';
                    }).toThrow();
                });

                it('Should throw if trying to change seeking mode during seeking', function() {
                    player.seekingSpeed = 1;
                    player.seek(100);

                    requestAnimationFrameMock.trigger(1000);
                    requestAnimationFrameMock.trigger(1020);

                    expect(function() {
                        player.seekingMode = Player.seeking.OMIT_FRAMES;
                    }).toThrow();
                });

            });

        });

        describe('getters', function() {

            it('Should set a bunch of getters', function() {
                expect(player.hasOwnProperty('direction')).toBeTruthy();
                expect(player.hasOwnProperty('state')).toBeTruthy();
                expect(player.hasOwnProperty('isPlaying')).toBeTruthy();
                expect(player.hasOwnProperty('isPaused')).toBeTruthy();
                expect(player.hasOwnProperty('isStopped')).toBeTruthy();
                expect(player.hasOwnProperty('isSeeking')).toBeTruthy();
                expect(player.hasOwnProperty('fps')).toBeTruthy();
                expect(player.hasOwnProperty('lastKeyframeTime')).toBeTruthy();
            });

            it('Should throw if trying set a value of getter property', function() {
                expect(function() {
                    player.direction = Player.directions.BACKWARD;
                }).toThrow();

                expect(function() {
                    player.state = Player.states.PAUSED;
                }).toThrow();

                expect(function() {
                    player.state = Player.states.PAUSED;
                }).toThrow();

                expect(function() {
                    player.isPlaying = true;
                }).toThrow();

                expect(function() {
                    player.isPaused = false;
                }).toThrow();

                expect(function() {
                    player.isStopped = true;
                }).toThrow();

                expect(function() {
                    player.isSeeking = false;
                }).toThrow();

                expect(function() {
                    player.fps = 45.12;
                }).toThrow();

                expect(function() {
                    player.lastKeyframeTime = 100123;
                }).toThrow();
            });


            describe('direction', function() {

                it('Should allow to set direction mode to value from direction enum', function() {
                    expect(function() {
                        player.play(undefined, Player.directions.BACKWARD);
                    }).not.toThrow();
                    expect(player.direction).toBe(Player.directions.BACKWARD);
                    
                    expect(function() {
                        player.play(undefined, Player.directions.FORWARD);
                    }).not.toThrow();
                    expect(player.direction).toBe(Player.directions.FORWARD);
                });

                describe('error handling', function() {

                    it('Should throw if trying to change direction mode to value beyond the direction enum', function() {
                        expect(function() {
                            player.play(undefined, null);
                        }).toThrow();

                        expect(function() {
                            player.play(undefined, 30);
                        }).toThrow();

                        expect(function() {
                            player.play(undefined, 'to the Sun!');
                        }).toThrow();
                    });

                });

            });

            
            describe('states', function() {

                it('Should have state STOPPED and isStopped true initially', function() {
                    expect(player.state).toBe(Player.states.STOPPED);
                    expect(player.isStopped).toBeTruthy();

                    expect(player.state).not.toBe(Player.states.PLAYING);
                    expect(player.isPlaying).toBeFalsy();

                    expect(player.state).not.toBe(Player.states.PAUSED);
                    expect(player.isPaused).toBeFalsy();

                    expect(player.isSeeking).toBeFalsy();
                });

                it('Should set state to PLAYING and isPlaying to true after calling method play', function() {
                    expect(player.state).not.toBe(Player.states.PLAYING);
                    expect(player.isPlaying).toBeFalsy();

                    player.play();

                    expect(player.state).toBe(Player.states.PLAYING);
                    expect(player.isPlaying).toBeTruthy();
                });

                it('Should set state to PAUSED and isPaused to true after calling method pause after play', function() {
                    player.play();

                    expect(player.state).not.toBe(Player.states.PAUSED);
                    expect(player.isPaused).toBeFalsy();

                    player.pause();

                    expect(player.state).toBe(Player.states.PAUSED);
                    expect(player.isPaused).toBeTruthy();
                });

                it('Should set state to STOPPED and isStopped to true after calling method stop after play', function() {
                    player.play();

                    expect(player.state).not.toBe(Player.states.STOPPED);
                    expect(player.isStopped).toBeFalsy();

                    player.stop();

                    expect(player.state).toBe(Player.states.STOPPED);
                    expect(player.isStopped).toBeTruthy();
                });

                it('Should set state to STOPPED and isStopped to true after calling method stop after pause', function() {
                    player.play();
                    player.pause();

                    expect(player.state).not.toBe(Player.states.STOPPED);
                    expect(player.isStopped).toBeFalsy();

                    player.stop();

                    expect(player.state).toBe(Player.states.STOPPED);
                    expect(player.isStopped).toBeTruthy();
                });


                describe('isSeeking', function() {

                    beforeEach(function() {
                        player.destroy();
                        player = new Player([{
                            time: 0
                        }, {
                            time: 100
                        }, {
                            time: 120
                        }], function() { });
                    });

                    it('Should set isSeeking to true after calling seek method', function() {
                        expect(player.isSeeking).toBeFalsy();

                        player.seek(100);

                        expect(player.isSeeking).toBeTruthy();
                    });

                    it('Should set isSeeking to false after finish seeking', function() {
                        player.seek(100);

                        // initial frame
                        requestAnimationFrameMock.trigger(1000);
                        // keyframes
                        requestAnimationFrameMock.trigger(1020);

                        expect(player.isSeeking).toBeFalsy();
                    });


                    describe('coexistence with different states in PLAY_FRAMES mode', function() {

                        beforeEach(function() {
                            player.seekingMode = Player.seeking.PLAY_FRAMES;
                        });


                        it('Should be true if seek method was called during playing and keep playing state after seeking ends', function() {
                            player.play();

                            expect(player.state).toBe(Player.states.PLAYING);

                            requestAnimationFrameMock.trigger(1000);
                            requestAnimationFrameMock.trigger(1020);

                            player.seek(100);

                            expect(player.isSeeking).toBeTruthy();
                            expect(player.state).toBe(Player.states.PLAYING);

                            requestAnimationFrameMock.trigger(1040);

                            expect(player.isSeeking).toBeFalsy();
                            expect(player.state).toBe(Player.states.PLAYING);
                        });

                        it('Should be true if seek method was called when not playing and keep paused state after seeking end', function() {
                            expect(player.state).toBe(Player.states.STOPPED);

                            player.seek(100);

                            expect(player.isSeeking).toBeTruthy();
                            expect(player.state).toBe(Player.states.PAUSED);

                            requestAnimationFrameMock.trigger(1000);
                            requestAnimationFrameMock.trigger(1020);

                            expect(player.isSeeking).toBeFalsy();
                            expect(player.state).toBe(Player.states.PAUSED);

                            player.play();

                            expect(player.state).toBe(Player.states.PLAYING);

                            requestAnimationFrameMock.trigger(1040);
                            requestAnimationFrameMock.trigger(1060);

                            player.pause();

                            expect(player.state).toBe(Player.states.PAUSED);

                            player.seek(20);

                            requestAnimationFrameMock.trigger(1080);
                            requestAnimationFrameMock.trigger(1100);

                            expect(player.isSeeking).toBeFalsy();
                            expect(player.state).toBe(Player.states.PAUSED);
                        });

                        it('Should be false if recording was stopped', function() {
                            player.seek(100);

                            expect(player.isSeeking).toBeTruthy();
                            expect(player.state).toBe(Player.states.PAUSED);

                            requestAnimationFrameMock.trigger(1000);
                            requestAnimationFrameMock.trigger(1020);

                            player.stop();

                            expect(player.state).toBe(Player.states.STOPPED);
                            expect(player.isSeeking).toBeFalsy();
                        });

                    });

                });

            });
            
        });

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
        player.on('abort', stopHandler);

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
        player.on('playing', function(time) {
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
        player.on('ended', function() {
            expect(drawingFnCalls.length).toEqual(exampleFrames.length);
            drawingFn.calls.allArgs().forEach(function(args, index) {
                expect(args[0][0]).toBe(exampleFrames[index]);
            });

            done();
        });

        player.play();
    });

    it('Should call drawer function with no offset for the first keyframe if keyframes times are equal to frame times ', function(done) {
        player.on('ended', function() {
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

        player.on('ended', function() {
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
        player.on('ended', function() {
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

        player.on('ended', function() {
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
            player.on('playing', function(startTime) {
                playingStart = startTime;
            });

            speed = testedSpeed;

            player.speed = speed;

            player.play();

            player.on('ended', function() {
                expect(drawingFnCalls.length).toEqual(framesCount);

                // max time difference is two frames
                expect(_maxTimeDiff(drawingFnCalls)).not.toBeGreaterThan(Math.round((1000 / framerate) * speed * 2));

                done();
            });
        };
    }

    it('Should play 23.976fps recording with normal speed', _testSpeed(1, 23.976, 100));
    it('Should play 25fps recording with normal speed', _testSpeed(1, 25, 100));
    it('Should play 30fps recording with normal speed', _testSpeed(1, 30, 100));
    it('Should play 60fps recording with normal speed', _testSpeed(1, 60, 100));

    it('Should play 23.976fps recording with double speed', _testSpeed(2, 23.976, 100));
    it('Should play 25fps recording with double speed', _testSpeed(2, 25, 100));
    it('Should play 30fps recording with double speed', _testSpeed(2, 30, 100));
    it('Should play 60fps recording with double speed', _testSpeed(2, 60, 100));

    it('Should play 23.976fps recording with x4 speed', _testSpeed(4, 23.976, 100));
    it('Should play 25fps recording with x4 speed', _testSpeed(4, 25, 100));
    it('Should play 30fps recording with x4 speed', _testSpeed(4, 30, 100));
    it('Should play 60fps recording with x4 speed', _testSpeed(4, 60, 100));

    it('Should play 23.976fps recording with super high speed', _testSpeed(64, 23.976, 100));
    it('Should play 25fps recording with super high speed', _testSpeed(64, 25, 100));
    it('Should play 30fps recording with super high speed', _testSpeed(64, 30, 100));
    it('Should play 60fps recording with super high speed', _testSpeed(64, 60, 100));

    it('Should play 23.976fps recording with slow speed', _testSpeed(0.5, 23.976, 100));
    it('Should play 25fps recording with slow speed', _testSpeed(0.5, 25, 100));
    it('Should play 30fps recording with slow speed', _testSpeed(0.5, 30, 100));
    it('Should play 60fps recording with slow speed', _testSpeed(0.5, 60, 100));

    it('Should play 23.976fps recording with super slow speed', _testSpeed(0.1, 23.976, 100));
    it('Should play 25fps recording with super slow speed', _testSpeed(0.1, 25, 100));
    it('Should play 30fps recording with super slow speed', _testSpeed(0.1, 30, 100));
    it('Should play 60fps recording with super slow speed', _testSpeed(0.1, 60, 100));

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
        player.on('playing', function() {
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

        player.on('ended', function() {
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
        player.on('abort', stopHandler);

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

        player.on('ended', function() {
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
            player.on('playing', function(startTime) {
                playingStart = startTime;
            });

            player.play();

            player.on('ended', function() {
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
    var lastKeyframeTime;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframes, nextKeyframe, currentRecordingTime, frameTime) {
            keyframes.forEach(function(keyframe, index) {
                var call = {
                    realTime: frameTime,
                    frameTime: keyframe.time,
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
        lastKeyframeTime = null;
    });

    function _maxTimeDiff(drawingFnCalls) {
        return drawingFnCalls.filter(function(call) {
            return (call.index === 0);
        }).map(function(call, index) {
            return Math.abs(parseFloat((lastKeyframeTime - call.frameTime - (call.realTime - playingStart)).toFixed(3), 10));
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
            lastKeyframeTime = exampleFrames[exampleFrames.length - 1].time;

            player.play(exampleFrames[exampleFrames.length - 1].time, player.directions.BACKWARD);
            player.on('playing', function(time) {
                playingStart = time;
            });

            player.on('ended', function() {
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
            expect(drawingFn.calls.count()).toEqual(framesCount / (framesDiff / keyframesDiff));

            drawingFn.calls.allArgs().map(function(args) {
                return args[0]; // keyframes
            }).forEach(function(keyframes) {
                expect(keyframes.length).toEqual(2);
            });

            // expect(drawingFn.calls.argsFor(drawingFn.calls.count() - 1)[0].length).toEqual(1);
        }));

    it('Should play exactly two keyframes per frame if time difference between ' +
        'keyframes is four as less than difference between frames',
        _test(10, 40, function(keyframesDiff, framesDiff) {
            expect(drawingFn.calls.count()).toEqual(framesCount / (framesDiff / keyframesDiff));

            drawingFn.calls.allArgs().map(function(args) {
                return args[0]; // keyframes
            }).forEach(function(keyframes) {
                expect(keyframes.length).toEqual(4);
            });
        }));

    it('Should play exactly one keyframe per each two frames if time difference ' +
        'between keyframes is twice as great than difference between frames',
        _test(20, 10, function(keyframesDiff, framesDiff, exampleFrames) {
        // -1 because in call preceding the 400 last keyframe is emitted
        expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)) - 1);

        drawingFn.calls.allArgs().map(function(args) {
            return args[0]; // keyframes
        }).forEach(function(keyframes, index) {
            if((index % 2) === 0) {
                expect(keyframes.length).toEqual(1);

                expect(keyframes[0]).toBe(exampleFrames[exampleFrames.length - 1 - Math.floor(index / 2)]);
            } else {
                expect(keyframes.length).toEqual(0);
            }
        });
    }));

    it('Should play exactly one keyframe per each four frames if time difference ' +
        'between keyframes is four as great than difference between frames',
        _test(40, 10, function(keyframesDiff, framesDiff, exampleFrames) {
        // -3 is because in call preceding the 400 last keyframe is emitted
        expect(drawingFn.calls.count()).toEqual((framesCount / (framesDiff / keyframesDiff)) - 3);

        // slice 4 because we omit the first frames made by seeking
        drawingFn.calls.allArgs().map(function(args) {
            return args[0]; // keyframes
        }).forEach(function(keyframes, index) {
            if((index % 4) === 0) {
                expect(keyframes.length).toEqual(1);

                expect(keyframes[0]).toBe(exampleFrames[exampleFrames.length - 1 - Math.floor(index / 4)]);
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


describe('Player synchronization when playing from time test', function() {
    var player;
    var drawingFn;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        drawingFn = jasmine.createSpy('drawingFn');
    });

    afterEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);
        player.destroy();

        player = null;
        drawingFn = null;
    });


    it('Should start playing from desired time when it is time of one of keyframes', function() {
        var startFrameIndex = 3;
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
        }, {
            time: 45
        }, {
            time: 53
        }, {
            time: 62
        }];

        player = new Player(exampleFrames, drawingFn);

        player.play(exampleFrames[startFrameIndex].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[startFrameIndex]);
        expect(drawingFn.calls.argsFor(0)[0][1]).toBe(exampleFrames[startFrameIndex + 1]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[startFrameIndex + 2]);
        expect(drawingFn.calls.argsFor(1)[0][1]).toBe(exampleFrames[startFrameIndex + 3]);

        // the last keyframe emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[startFrameIndex + 4]);
    });

    it('Should start playing from desired time when it is not a time of any keyframe', function() {
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
        }, {
            time: 45
        }, {
            time: 53
        }, {
            time: 62
        }];

        player = new Player(exampleFrames, drawingFn);

        player.play(15);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[2]);
        expect(drawingFn.calls.argsFor(0)[0][1]).toBe(exampleFrames[3]);
        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(3);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[4]);
        expect(drawingFn.calls.argsFor(1)[0][1]).toBe(exampleFrames[5]);
        expect(drawingFn.calls.argsFor(1)[0][2]).toBe(exampleFrames[6]);

        // the last keyframe emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[7]);
    });

    it('Should start playing from desired time when it is time of one of keyframes BACKWARD', function() {
        var startFrameIndex = 5;
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
        }, {
            time: 45
        }, {
            time: 53
        }, {
            time: 62
        }];

        player = new Player(exampleFrames, drawingFn);

        player.play(exampleFrames[startFrameIndex].time, player.directions.BACKWARD);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[startFrameIndex]);
        expect(drawingFn.calls.argsFor(0)[0][1]).toBe(exampleFrames[startFrameIndex - 1]);

        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(3);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[startFrameIndex - 2]);
        expect(drawingFn.calls.argsFor(1)[0][1]).toBe(exampleFrames[startFrameIndex - 3]);
        expect(drawingFn.calls.argsFor(1)[0][2]).toBe(exampleFrames[startFrameIndex - 4]);

        // the last keyframe emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[startFrameIndex - 5]);
    });

    it('Should start playing from desired time when it is not a time of any keyframe', function() {
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
        }, {
            time: 45
        }, {
            time: 53
        }, {
            time: 62
        }];

        player = new Player(exampleFrames, drawingFn);

        player.play(49, player.directions.BACKWARD);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(2);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[5]);
        expect(drawingFn.calls.argsFor(0)[0][1]).toBe(exampleFrames[4]);
        // next keyframes emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(3);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[3]);
        expect(drawingFn.calls.argsFor(1)[0][1]).toBe(exampleFrames[2]);
        expect(drawingFn.calls.argsFor(1)[0][2]).toBe(exampleFrames[1]);

        // the last keyframe emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[0]);
    });

});


describe('Player synchronization when seeking', function() {
    var player;
    var drawingFn;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        drawingFn = jasmine.createSpy('drawingFn');
    });

    afterEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);
        player.destroy();

        player = null;
        drawingFn = null;
    });


    it('Should start playing from current time when recording was seeking when paused', function() {
        var startFrameIndex = 3;
        var frameTime = 20;
        var exampleFrames = [{
            time: 0
        }, {
            time: 20
        }, {
            time: 40
        }, {
            time: 60
        }, {
            time: 80
        }, {
            time: 100
        }, {
            time: 120
        }, {
            time: 140
        }];

        player = new Player(exampleFrames, drawingFn);

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted before seeking
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[0]);

        player.pause();

        // no frames emitted after pause
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);

        player.seek(exampleFrames[4].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);

        // one keyframe emitted after seeking
        requestAnimationFrameMock.trigger(1000 + (4 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[4]);

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000 + (4 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);

        // keyframe emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (5 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[5]);
    });


    it('Should start playing from current time when recording was seeking when paused and play was called long time after seek end',
    function() {
        var startFrameIndex = 3;
        var frameTime = 20;
        var exampleFrames = [{
            time: 0
        }, {
            time: 20
        }, {
            time: 40
        }, {
            time: 60
        }, {
            time: 80
        }, {
            time: 100
        }, {
            time: 120
        }, {
            time: 140
        }];

        player = new Player(exampleFrames, drawingFn);

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // first keyframes emitted before seeking
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[0]);

        player.pause();

        // no frames emitted after pause
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);

        player.seek(exampleFrames[4].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);

        // one keyframe emitted after seeking
        requestAnimationFrameMock.trigger(1000 + (4 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[4]);

        player.play();

        // initial frame
        // notice time difference between this and previous frame
        requestAnimationFrameMock.trigger(1000 + (104 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);

        // keyframe emitted in normal way
        requestAnimationFrameMock.trigger(1000 + (105 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(2)[0][0]).toBe(exampleFrames[5]);
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

    it('Should seek when playing is stopped and make it paused', function() {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);

        expect(player.isStopped).toBeTruthy();
        expect(player.isPaused).toBeFalsy();

        player.seek(exampleFrames[80].time);

        expect(player.isPaused).toBeTruthy();
    });

    it('Should seek when playing is paused and keep it paused after emitting desired frame', function(done) {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);

        player.play();

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // next keyframes emitted from seeked position
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[0]);

        player.pause();
        player.seek(exampleFrames[80].time);

        // next keyframes emitted from seeked position
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(1)[0][0]).toBe(exampleFrames[80]);

        setTimeout(function() {
            expect(drawingFn.calls.count()).toBe(2);

            done();
        }, 100);
    });

    it('Should emit exactly one frame the closest to desired time when seeking in default mode', function(done) {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);

        player.seek(exampleFrames[80].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // next keyframes emitted from seeked position
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[80]);

        setTimeout(function() {
            expect(drawingFn.calls.count()).toBe(1);

            done();
        }, 100);
    });

    it('Should emit exactly one frame the closest to desired time when seeking in default mode', function(done) {
        var frameTime = 20;
        var exampleFrames = _createFrames(100, frameTime);

        player = new Player(exampleFrames, drawingFn);

        player.seek(exampleFrames[80].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(drawingFn.calls.count()).toBe(0);

        // next keyframes emitted from seeked position
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0][0]).toBe(exampleFrames[80]);

        setTimeout(function() {
            expect(drawingFn.calls.count()).toBe(1);

            done();
        }, 100);
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
        player.on('ended', function() {
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
        player.on('ended', function() {
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
        player.on('seeked', function() {
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
        player.on('seeked', function() {
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

        player.on('abort', function() {
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


describe('Player seekingSpeed as a function', function() {
    var frameTime;
    var player;
    var drawingFn;
    var seekingSpeedFn;
    var seekingSpeed;
    var keyframes;

    beforeEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        frameTime = 20;
        drawingFn = jasmine.createSpy('drawingFn');
        seekingSpeed = 100;
        seekingSpeedFn = jasmine.createSpy('seekingSpeedFn').and.callFake(function() {
            return seekingSpeed;
        });
        keyframes = _createFrames(100, frameTime);
    });

    afterEach(function() {
        player.destroy();
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);

        player = null;
        drawingFn = null;
        playingStart = null;
        seekingSpeedFn = null;
        seekingSpeed = null;
        frameTime = null;
        keyframes = null;
    });


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


    it('Should call seeking speed function with player instance as argument', function() {
        player = new Player(keyframes, drawingFn, {
            seekingMode: Player.seeking.PLAY_FRAMES,
            seekingSpeed: seekingSpeedFn
        });

        player.seek(keyframes[keyframes.length - 1].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000);
        expect(seekingSpeedFn.calls.count()).toBe(1);
        expect(seekingSpeedFn.calls.argsFor(0)[0]).toBe(player);
    });


    it('Should seek with constant speed', function() {
        seekingSpeed = 10;
        
        player = new Player(keyframes, drawingFn, {
            seekingMode: Player.seeking.PLAY_FRAMES,
            seekingSpeed: seekingSpeedFn
        });

        player.seek(keyframes[keyframes.length - 1].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000);

        // first set of keyframes
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(10);

        // second set
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(10);

        // the third
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(10);
    });


    it('Should seek with variable speed', function() {
        player = new Player(keyframes, drawingFn, {
            seekingMode: Player.seeking.PLAY_FRAMES,
            seekingSpeed: seekingSpeedFn
        });

        player.seek(keyframes[keyframes.length - 1].time);

        // initial frame
        requestAnimationFrameMock.trigger(1000);

        // first set of keyframes
        seekingSpeed = 10;
        requestAnimationFrameMock.trigger(1000 + (1 * frameTime));
        expect(drawingFn.calls.count()).toBe(1);
        expect(drawingFn.calls.argsFor(0)[0].length).toBe(10);

        // second set
        seekingSpeed = 5;
        requestAnimationFrameMock.trigger(1000 + (2 * frameTime));
        expect(drawingFn.calls.count()).toBe(2);
        expect(drawingFn.calls.argsFor(1)[0].length).toBe(5);

        // the third
        seekingSpeed = 20;
        requestAnimationFrameMock.trigger(1000 + (3 * frameTime));
        expect(drawingFn.calls.count()).toBe(3);
        expect(drawingFn.calls.argsFor(2)[0].length).toBe(20);
    });

});
