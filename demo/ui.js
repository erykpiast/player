module.exports = (function() {

    var Ractive = require('ractive');
    var fs = require('fs');
    var extend = require('extend');


    var template = fs.readFileSync(__dirname + '/ui.tpl');


    function UI(container, player, options) {
        this._player = player;

        options = extend({
            direction: player.directions.FORWARD
        }, options);

        this.view = new Ractive({
            el: container,
            template: template.toString(),
            partials: {
                experimentSpecific: options.partial
            },
            data: {
                progress: 0,
                currentSpeed: player.speed,
                playing: player.isPlaying,
                fps: player.fps
            }
        });

        this.view.on({
            playPause: function playPauseHandler() {
                if(player.isPlaying) {
                    player.pause();
                } else {
                    player.play(undefined, options.direction);
                }

                this.set('playing', player.isPlaying);
            },
            changeSpeed: function changeSpeedHandler(event, change) {
                player.speed = Math.pow(2, Math.round(Math.log2(player.speed)) + change);

                this.set('currentSpeed', player.speed);
            },
            seek: function(e) {
                player.seek(Math.round(parseFloat(e.node.value, 10) * player.lastFrameTime));
            }
        });

        var updatePlayingStatus = function() {
            this.view.set('playing', player.isPlaying);
        }.bind(this);

        this._player
            .on('play', updatePlayingStatus)
            .on('pause', updatePlayingStatus)
            .on('stop', updatePlayingStatus)
            .on('end', updatePlayingStatus)
            .on('progress', function(currentRecordingTime) {
                this.view.set('progress', currentRecordingTime / player.lastFrameTime);
                this.view.set('fps', player.fps);
            }.bind(this));
    }


    UI.prototype = {
        destroy: function() {
            this.view.teardown();
            this.view.detach();
        }
    };


    return UI;

})();