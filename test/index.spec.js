/* global jasmine, describe, xdescribe, it, xit, expect, beforeEach, afterEach */
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10e10; // really big number, because Infinity doesn't work

var lodash = require('lodash');
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


describe('Player istance test', function() {
    var player;

    beforeEach(function() {
        player = new Player([ ], function() { });
    });

    afterEach(function() {
        player = null;
    });


    it('Should be an object with `play` and `stop` methods', function() {
        expect(typeof player).toBe('object');

        expect(player.play).toBeDefined();
        expect(typeof player.play).toBe('function');
        expect(player.stop).toBeDefined();
        expect(typeof player.stop).toBe('function');
    });

});


describe('Player.prototype.play test', function() {
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
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframe, nextKeyframe, currentTime) {
            // console.log('fps', fps);
            
            // for(var i = 0, maxi = Math.floor(Math.random() * 1000000); i < maxi; i++) {
            //     Math.pow(i, i);
            // }
            
            drawingFnCalls.push({
                realTime: Date.now(),
                frameTime: keyframe.time
            });
        });
        player = new Player(exampleFrames, drawingFn);
        player.on('start', function() {
            playingStart = Date.now();
        });
        player.on('end', done);
        player.play();
    });

    afterEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);
        
        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
    });

    it('Should call drawer function once for each frame and in order', function() {
        expect(drawingFn.calls.count()).toEqual(exampleFrames.length);
        drawingFn.calls.allArgs().forEach(function(args, index) {
            expect(args[0]).toBe(exampleFrames[index]);
        });
    });

});


describe('Player.prototype.play with variuous speeds test', function() {
    var speed = 1;
    var maxTimeDifference = 1000 / 60;
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
                return previousTime + (1000 / 60)/* + Math.floor(Math.random() * (1000 / 60))*/;
            }
        });
    
        drawingFnCalls = [ ];
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframe, nextKeyframe, index, frameTime) {
            var call = {
                realTime: frameTime,
                frameTime: keyframe.time,
                timeDiff: Math.abs(parseFloat((keyframe.time - (frameTime - playingStart) * speed).toFixed(3), 10)),
                index: index
            };
            
            // print current FPS
            // console.log((1000000 / player._averageFrameDuration).toFixed(3));
            
            drawingFnCalls.push(call);
        });
    });

    afterEach(function() {
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
                time: Math.round(frames[i - 1] ? frames[i - 1].time + Math.floor(Math.random() * difference) : 0)
            };
        }

        return frames;
    }
    
    
    function _testSpeed(testedSpeed, exampleFrames) {
        return function(done) {
            player = new Player(exampleFrames, drawingFn);
            player.on('start', function(startTime) {
                playingStart = startTime;
            });
        
            speed = testedSpeed;
            
            player._speed = speed;
            
            player.play();
            
            player.on('end', function() {
                // console.warn('max time difference for speed ' + speed + ':',  _maxTimeDiff(drawingFnCalls));
                expect(drawingFn.calls.count()).toEqual(exampleFrames.length);
                // max time difference is one frame +- some margin
                expect(_maxTimeDiff(drawingFnCalls)).not.toBeGreaterThan(Math.round(maxTimeDifference * speed * 1.1));
                done();
            });
        };
    }

    it('Should play 23.976fps recording with normal speed', _testSpeed(1, _createFrames(100, (1000/24.976))));
    it('Should play 25fps recording with normal speed', _testSpeed(1, _createFrames(100, (1000/25))));
    it('Should play 30fps recording with normal speed', _testSpeed(1, _createFrames(100, (1000/30))));
    it('Should play 60fps recording with normal speed', _testSpeed(1, _createFrames(100, (1000/60))));
    
    it('Should play 23.976fps recording with double speed', _testSpeed(2, _createFrames(100, (1000/24.976))));
    it('Should play 25fps recording with double speed', _testSpeed(2, _createFrames(100, (1000/25))));
    it('Should play 30fps recording with double speed', _testSpeed(2, _createFrames(100, (1000/30))));
    it('Should play 60fps recording with double speed', _testSpeed(2, _createFrames(100, (1000/60))));
    
    it('Should play 23.976fps recording with x4 speed', _testSpeed(4, _createFrames(100, (1000/24.976))));
    it('Should play 25fps recording with x4 speed', _testSpeed(4, _createFrames(100, (1000/25))));
    it('Should play 30fps recording with x4 speed', _testSpeed(4, _createFrames(100, (1000/30))));
    it('Should play 60fps recording with x4 speed', _testSpeed(4, _createFrames(100, (1000/60))));
    
    it('Should play 23.976fps recording with super high speed', _testSpeed(64, _createFrames(100, (1000/24.976))));
    it('Should play 25fps recording with super high speed', _testSpeed(64, _createFrames(100, (1000/25))));
    it('Should play 30fps recording with super high speed', _testSpeed(64, _createFrames(100, (1000/30))));
    it('Should play 60fps recording with super high speed', _testSpeed(64, _createFrames(100, (1000/60))));
    
    it('Should play 23.976fps recording with slow speed', _testSpeed(0.5, _createFrames(100, (1000/24.976))));
    it('Should play 25fps recording with slow speed', _testSpeed(0.5, _createFrames(100, (1000/25))));
    it('Should play 30fps recording with slow speed', _testSpeed(0.5, _createFrames(100, (1000/30))));
    it('Should play 60fps recording with slow speed', _testSpeed(0.5, _createFrames(100, (1000/60))));
    
    it('Should play 23.976fps recording with super slow speed', _testSpeed(0.1, _createFrames(100, (1000/24.976))));
    it('Should play 25fps recording with super slow speed', _testSpeed(0.1, _createFrames(100, (1000/25))));
    it('Should play 30fps recording with super slow speed', _testSpeed(0.1, _createFrames(100, (1000/30))));
    it('Should play 60fps recording with super slow speed', _testSpeed(0.1, _createFrames(100, (1000/60))));

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
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframe, nextKeyframe, currentTime) {
            drawingFnCalls.push({
                realTime: Date.now(),
                frameTime: keyframe.time
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
        }, 10);
    });

    afterEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);
        
        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
    });

    it('Should call drawer function once for some but not all frames and in order', function() {
        expect(drawingFn.calls.count()).not.toEqual(exampleFrames.length);
        
        drawingFn.calls.allArgs().forEach(function(args, index) {
            expect(args[0]).toBe(exampleFrames[index]);
        });
    });
    
    it('Should call drawer function once for all left frames after resuming playing', function(done) {
        player.play();
        
        player.on('end', function() {
            expect(drawingFn.calls.count()).toEqual(exampleFrames.length);
            drawingFn.calls.allArgs().forEach(function(args, index) {
                expect(args[0]).toBe(exampleFrames[index]);
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
        drawingFn = jasmine.createSpy('drawingFn').and.callFake(function(keyframe, nextKeyframe, currentTime) {
            drawingFnCalls.push({
                realTime: Date.now(),
                frameTime: keyframe.time
            });
        });
        player = new Player(exampleFrames, drawingFn);
        player.on('start', function() {
            playingStart = Date.now();
        });
        player.play();
        
        setTimeout(function() {
            player.stop();
            
            done();
        }, 10);
    });

    afterEach(function() {
        requestAnimationFrameMock.setMode(requestAnimationFrameMock.modes.MANUAL);
        
        player = null;
        drawingFn = null;
        playingStart = null;
        drawingFnCalls = null;
    });

    it('Should call drawer function once for some but not all frames and in order', function() {
        expect(drawingFn.calls.count()).not.toEqual(exampleFrames.length);
        
        drawingFn.calls.allArgs().forEach(function(args, index) {
            expect(args[0]).toBe(exampleFrames[index]);
        });
    });
    
    it('Should start playing from start of the recording after calling play', function(done) {
        drawingFn.calls.reset();
        
        player.play();
        
        player.on('end', function() {
            expect(drawingFn.calls.argsFor(0)[0]).toBe(exampleFrames[0]);
            expect(drawingFn.calls.count()).toEqual(exampleFrames.length);
            
            done();
        });
    });

});