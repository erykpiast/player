var $ = require('jquery');
var extend = require('extend');

var Player = require('../index');
var UI = require('./ui');

var tileSize = 50;

var keyframes = (function() {
    function _pad(number, digits) {
        return new Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
    }

    var keyframes = [ ];

    for (var i = 0; i < 100; i++) {
        var keyframe = keyframes[i] = {
            index: i,
            time: keyframes[i - 1] ? keyframes[i - 1].time + 1000 : 0
        };
        keyframe.type = 'create';
        keyframe.color = _pad(Math.round(255 / 100 * i).toString(16), 2) + '00' + _pad(Math.round(255 - 255 / 100 * i).toString(16), 2);
    }

    return keyframes;
})();

var stage = (function() {
    var stage = document.createElement('div');

    $(stage).css({
        width: (tileSize * 10) + 'px',
        height: (tileSize * 10) + 'px'
    })
    .addClass('stage');

    return stage;
})();


function _createTile(index, color) {
    var tile = document.createElement('div');

    $(tile).css({
        width: tileSize + 'px',
        height: tileSize + 'px',
        backgroundColor: '#' + color
    })
    .attr('data-index', index)
    .addClass('stage__tile');

    return tile;
}


function _reverse(keyframe) {
    var reversed = extend({ }, keyframe);

    if(keyframe.type === 'create') {
        reversed.type = 'removal';

        delete reversed.color;
    }

    return reversed;
}


function _draw(keyframe) {
    var tile;
    switch(keyframe.type) {
        case 'create':
            tile = _createTile(keyframe.index, keyframe.color);

            stage.appendChild(tile);
        break;
        case 'removal':
            tile = stage.querySelector('[data-index="'+ keyframe.index +'"]');

            if(tile) {
                stage.removeChild(tile);
            } else {
                console.warn('no tile with index ' + keyframe.index + ' on a stage');
            }
        break;
        default:
    }
}

var player = new Player(keyframes, function(keyframes, nextKeyframe, currentRecordingTime) {
    keyframes.forEach(function(keyframe) {
         if(player.direction === player.directions.BACKWARD) {
            keyframe = _reverse(keyframe);
        }

        _draw(keyframe);
    });
});
player.seekingMode = player.seeking.PLAY_FRAMES;
player.seekingSpeed = 1024;
player.speed = 8;

$(function() {
    var ui = new UI(document.querySelector('body > .ui'), player);
    
    document.body.appendChild(stage);

    // player.play();
});