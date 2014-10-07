var $ = require('jquery');
var extend = require('extend');

var Player = require('../index');

var tileSize = 50;
var initialSpeed = 8;

var player;

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

var ui = (function() {
    var ui = document.createElement('div');

    var play = document.createElement('button');
    var pause = document.createElement('button');

    var speedContainer = document.createElement('div');
    $(speedContainer).css({
        display: 'inline-block'
    });

    var incSpeed = document.createElement('button');
    var decSpeed = document.createElement('button');
    var currentSpeed = document.createElement('span');
    speedContainer.appendChild(decSpeed);
    speedContainer.appendChild(currentSpeed);
    speedContainer.appendChild(incSpeed);


    var fpsContainer = document.createElement('div');
    $(fpsContainer).css({
        display: 'inline-block'
    });

    var currentFps = document.createElement('span');
    currentFps.className = 'current-fps';
    fpsContainer.appendChild(document.createTextNode('FPS: '));
    fpsContainer.appendChild(currentFps);


    var timeline = document.createElement('input');
    $(timeline).attr({
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        value: 0
    }).on('change', function() {
        var parsed = parseFloat(timeline.value, 10);
        var desiredTime = parsed * keyframes[keyframes.length - 1].time;

        player.seek(desiredTime);
        // player.play(desiredTime);
    }).css({
        width: (tileSize * 10) + 'px',
        display: 'block'
    });


    ui.appendChild(play);
    ui.appendChild(pause);
    ui.appendChild(speedContainer);
    ui.appendChild(fpsContainer);
    ui.appendChild(timeline);


    $(play).on('click', function() {
        player.play();
    }).text('Play');

    $(pause).on('click', function() {
        player.pause();
    }).text('Pause');

    $(currentSpeed).text(initialSpeed);

    $(incSpeed).on('click', function() {
        player.speed = Math.pow(2, Math.round(Math.log2(player.speed)) + 1);

        $(currentSpeed).text(player.speed);
    }).text('Increase speed');

    $(decSpeed).on('click', function() {
        player.speed = Math.pow(2, Math.round(Math.log2(player.speed)) - 1);

        $(currentSpeed).text(player.speed);
    }).text('Decrease speed');

    return ui;
})();

var stage = (function() {
    var stage = document.createElement('div');

    $(stage).css({
        width: (tileSize * 10) + 'px',
        height: (tileSize * 10) + 'px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #000'
    });

    return stage;
})();


function _createTile(index, color) {
    var tile = document.createElement('div');

    $(tile).css({
        width: tileSize + 'px',
        height: tileSize + 'px',
        float: 'left',
        backgroundColor: '#' + color
    })
    .attr('data-index', index);

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
    switch(keyframe.type) {
        case 'create':
            var tile = _createTile(keyframe.index, keyframe.color);

            stage.appendChild(tile);
        break;
        case 'removal':
            var tile = stage.querySelector('[data-index="'+ keyframe.index +'"]');

            if(tile) {
                stage.removeChild(tile);
            } else {
                console.warn('no tile with index ' + keyframe.index + ' on a stage');
            }
        break;
        default:
    }
}


function _updateTimeline(currentTime) {
    var timeline = ui.querySelector('input[type=range]');

    timeline.value = (currentTime / keyframes[keyframes.length - 1].time);
}


function _updateFpsMeter(fps) {
    $('.current-fps').text(fps.toFixed(2));
}


player = new Player(keyframes, function(keyframes, nextKeyframe, currentRecordingTime) {
    keyframes.forEach(function(keyframe) {
         if(player.direction === player.directions.BACKWARD) {
            keyframe = _reverse(keyframe);
        }

        _draw(keyframe);
    });

    if(!player.isSeeking) {
        _updateTimeline(currentRecordingTime);
    }

    _updateFpsMeter(player.fps);
});
player.seekingMode = player.seeking.PLAY_FRAMES;
player.seekingSpeed = 1024;
player.speed = initialSpeed;

player.on('end', function() {
    console.debug('playing finished');
});
player.on('play', function() {
    while(stage.firstChild) {
        stage.removeChild(stage.firstChild);
    }
});

$(function() {
    document.body.appendChild(ui);
    document.body.appendChild(stage);

    // player.play();
});