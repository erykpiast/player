module.exports = (function() {

    var util = require('util');
    var $ = require('jquery');
    var extend = require('extend');
    var fs = require('fs');

    var Experiment = require('../../experiment');
    var Player = require('../../../index');
    var ChessBoard = require('./chess-board');

    var template = fs.readFileSync(__dirname + '/ui.tpl');

    var gemPgn = fs.readFileSync(__dirname + '/br-vs-wagner-1902.pgn');


    function ProgressiveChessExperiment() {
        Experiment.apply(this, arguments);

        $(this._stage).css({
            width: (this.conf.fieldSize * 8) + 'px',
            height: (this.conf.fieldSize * 8) + 'px'
        });

        this._playerOptions = {
            seekingMode: Player.seeking.PLAY_FRAMES,
            seekingSpeed: 1024,
            speed: 1
        };

        this._board = new ChessBoard(gemPgn.toString(), this.conf.fieldSize);

        this._uiOptions = {
            chapters: this._board.getMoves().map(function(move, index, moves) {
                return (index / moves.length).toFixed(2);
            }).concat([ 1 ]),
            partial: template.toString()
        };
    }

    util.inherits(ProgressiveChessExperiment, Experiment);

    extend(ProgressiveChessExperiment.prototype, {
        conf: {
            fieldSize: 50
        },
        load: function() {
            Experiment.prototype.load.call(this);

            this._board = new ChessBoard(gemPgn.toString(), this.conf.fieldSize);

            this._stage.appendChild(this._board.element);

            this._ui.view.set('backward', this._uiOptions.direction === Player.directions.BACKWARD);
            this._ui.view.observe('backward', function(value) {
                if(value) {
                    this._uiOptions.direction = Player.directions.BACKWARD;
                } else {
                    this._uiOptions.direction = Player.directions.FORWARD;
                }

                if(this._player.isPlaying && (this._player.direction !== this._uiOptions.direction)) {
                    this._player.pause();
                    this._player.play(undefined, this._uiOptions.direction);
                }
            }.bind(this));
        },
        unload: function() {
            Experiment.prototype.unload.call(this);

            if(this._board.element.parentNode) {
                this._board.element.parentNode.removeChild(this._board.element);
            }
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