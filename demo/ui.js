module.exports = (function() {

    var Ractive = require('ractive');
    var fs = require('fs');
    var each = require('foreach');
    var lodash = require('lodash');


    var template = fs.readFileSync(__dirname + '/ui.tpl');


    function UI(container, player, options) {
        this._player = player;

        each({
            direction: player.directions.FORWARD,
            timelineDebounceTime: 0
        }, function(value, key) {
            if(!options.hasOwnProperty(key)) {
                options[key] = value;
            }
        });

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
            seek: lodash.debounce(function(e) {
                player.seek(Math.round(parseFloat(e.node.value, 10) * player.lastKeyframeTime));
            }, options.timelineDebounceTime)
        });

        var updatePlayingStatus = function() {
            this.view.set('playing', player.isPlaying);
        }.bind(this);

        this._player
            .on('playing', updatePlayingStatus)
            .on('pause', updatePlayingStatus)
            .on('abort', updatePlayingStatus)
            .on('ended', updatePlayingStatus)
            .on('timeupdate', function(currentRecordingTime) {
                this.view.set('progress', currentRecordingTime / player.lastKeyframeTime);
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