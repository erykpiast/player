/* global jasmine, describe, it, expect, beforeEach, afterEach */

var proxyquire = require('proxyquireify')(require);

var requestAnimationFrameMock = {
    requestAnimationFrame: function(fn) {
        process.nextTick(function() {
            fn();
        });
    }
};

var Player = proxyquire('../index', {
    'events': {
        // 'request-animation-frame': requestAnimationFrameMock
    }
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
        player =null;
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
    var speed = 1;
    var player;
    var drawingFn;
    var exampleFrames = (function(count) {
        var frames = [];

        for(var i = 0; i < count; i++) {
            frames[i] = {
                index: i,
                time: (frames[i - 1] ? frames[i - 1].time : 0) + Math.floor(Math.random() * 100)
            };
        }

        return frames;
    })(100);
    jasmine.DEFAULT_TIMEOUT_INTERVAL = (exampleFrames[exampleFrames.length - 1].time/speed) + 1000;

    beforeEach(function(done) {
        drawingFn = jasmine.createSpy('drawingFn');
        player = new Player(exampleFrames, drawingFn);
        player._speed = speed;
        player.on('end', done);
        player.play();
    });

    afterEach(function() {
        player = null;
        drawingFn = null;
    });

    it('Should call drawer function once for each frame', function() {
        expect(drawingFn.calls.count()).toEqual(exampleFrames.length);
        expect(drawingFn.calls.allArgs().every(function(args, index) {
            return (args[0] === exampleFrames[index]);
        })).toBeTruthy();
    });

});