var lodash = require('lodash');
var Player = require('../index');

var keyframes = [ ];

for (var i = 0; i < 100; i++) {
    keyframes[i] = {
        index: i,
        time: (keyframes[i - 1] ? keyframes[i - 1].time : 0) + Math.floor(lodash.random(1, 100))
    };
}

var player = new Player(keyframes, function(keyframe) {
    console.log(keyframe);
});

player.play();