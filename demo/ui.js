module.exports = (function() {

    var Ractive = require('ractive');
    var fs = require('fs');


    var template = fs.readFileSync(__dirname + '/ui.tpl');


    function UI(container, player) {
        this._player = player;

        this._view = new Ractive({
            el: container,
            template: template.toString(),
            data: {
                progress: 0,
                currentSpeed: player.speed,
                playing: player.isPlaying,
                fps: player.fps
            }
        });

        this._view.on({
            playPause: function playPauseHandler() {
                if(player.isPlaying) {
                    player.pause();
                } else {
                    player.play();
                }

                this.set('playing', player.isPlaying);
            },
            changeSpeed: function changeSpeedHandler(event, change) {
                player.speed = Math.pow(2, Math.round(Math.log2(player.speed)) + change);

                this.set('currentSpeed', player.speed);
            },
            seek: function(e) {
                player.seek(Math.round(e.node.value * player.lastFrameTime));
            }
        });

        var updatePlayingStatus = function() {
            this._view.set('playing', player.isPlaying);
        }.bind(this);

        this._player
            .on('play', updatePlayingStatus)
            .on('pause', updatePlayingStatus)
            .on('stop', updatePlayingStatus)
            .on('end', updatePlayingStatus)
            .on('progress', function(currentRecordingTime) {
                this._view.set('progress', currentRecordingTime / player.lastFrameTime);
                this._view.set('fps', player.fps);
            }.bind(this));
    }


    return UI;

})();