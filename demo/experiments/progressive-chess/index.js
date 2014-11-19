module.exports = (function() {

    var util = require('util');
    var $ = require('jquery');
    var extend = require('extend');
    var fs = require('fs');

    var Experiment = require('../../experiment');
    var Player = require('../../../index');
    var ChessBoard = require('./chess-board');

    var kasparovVsDeepBlue = fs.readFileSync(__dirname + '/br-vs-wagner-1902.pgn');


    function ProgressiveChessExperiment() {
        Experiment.apply(this, arguments);

        $(this._stage).css({
            width: (this.conf.fieldSize * 8) + 'px',
            height: (this.conf.fieldSize * 8) + 'px'
        });

        this._board = new ChessBoard(kasparovVsDeepBlue.toString(), this.conf.fieldSize);

        this._stage.appendChild(this._board.element);

        console.log(this._board.getMoves());

        this._playerOptions = {
            seekingMode: Player.seeking.PLAY_FRAMES,
            seekingSpeed: 1024,
            speed: 1
        };
    }

    util.inherits(ProgressiveChessExperiment, Experiment);

    extend(ProgressiveChessExperiment.prototype, {
        conf: {
            fieldSize: 50
        },
        load: function() {
            Experiment.prototype.load.call(this);
        },
        _createKeyframes: function() {
            var keyframes = this._board.getMoves().map(function(move, index) {
                return {
                    time: index * 1000,
                    move: move
                };
            });

            return keyframes;
        },
        _keyframeHandler: function(keyframe) {
            var move;
            if(this._player.direction === this._player.directions.BACKWARD) {
                this._board.moveBack(keyframe.move);
            } else {
                this._board.move(keyframe.move);
            }
        },
        // private
        _reverseKeyframe: function(keyframe) {
            var reversed = extend({ }, keyframe);

            if(keyframe.type === 'create') {
                reversed.type = 'removal';

                delete reversed.color;
            }

            return reversed;
        }
    });


    return ProgressiveChessExperiment;

})();