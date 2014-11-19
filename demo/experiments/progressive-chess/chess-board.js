module.exports = (function() {

    var chessJs = require('chess.js');
    var extend = require('extend');
    var $ = require('jquery');


    function ChessBoard(pgn) {
        this._moves = this._parsePgn(pgn);

        this._figures = {
            white: this._createFiguresSet('white'),
            black: this._createFiguresSet('black'),
            captured: {
                white: {
                    king: [],
                    queen: [],
                    bishop: [],
                    rook: [],
                    knight: [],
                    pawn: []
                },
                black: {
                    king: [],
                    queen: [],
                    bishop: [],
                    rook: [],
                    knight: [],
                    pawn: []
                }
            }
        };

        this._board = {
            $element: $('<ul>').addClass('board'),
            fields: (function() {
                var columns = ' abcdefgh'.split('');
                var fields = { };

                for(var i = 1; i <= 8; i++) {
                    for(var j = 1; j <= 8; j++) {
                        fields[columns[i] + j] = null;
                    }
                }

                return fields;
            })()
        };

        [].concat(
            this._figures.white,
            this._figures.black
        ).forEach(function(figure) {
            this._board.$element.append(figure.$element);

            this._board.fields[figure.position] = figure;
        }, this);

        Object.defineProperty(this, 'element', {
            get: function() {
                return this._board.$element[0];
            },
            set: function() {
                throw new Error('property "element" is readonly');
            }
        });
    }


    extend(ChessBoard.prototype, {
        figuresSymbolToName: {
            'K': 'king',
            'Q': 'queen',
            'R': 'rook',
            'B': 'bishop',
            'N': 'knight',
            'P': 'pawn'
        },
        getMoves: function() {
            return this._moves;
        },
        move: function(move) {
            var figure = this._board.fields[move.from];
            if(!figure) {
                throw new Error('no figure on position ' + move.from);
            }

            // find captured figure
            var captured = this._board.fields[move.to];
            if(captured) {
                // remove captured figure from board
                captured.$element.removeClass('figure--column-' + captured.position[0]);
                captured.$element.removeClass('figure--row-' + captured.position[1]);
                captured.$element.hide();

                this._board.fields[captured.position] = null;
                captured.position = null;
                
                this._figures.captured[move.player][move.figure].push(captured);
            }

            // remove figure from old position
            figure.$element.removeClass('figure--column-' + figure.position[0]);
            figure.$element.removeClass('figure--row-' + figure.position[1]);
            this._board.fields[figure.position] = null;

            // set new position to figure
            figure.position = move.to;
            this._board.fields[figure.position] = figure;
            figure.$element.addClass('figure--column-' + figure.position[0]);
            figure.$element.addClass('figure--row-' + figure.position[1]);
        },
        moveBack: function(move) {
            var figure = this._board.fields[move.to];
            if(!figure) {
                throw new Error('no figure on position ' + move.to);
            }

            // find captured figure
            var captured = move.captured && this._figures.captured[move.player][move.captured].pop();
            if(captured) {
                captured.position = move.to;
                this._board.fields[captured.position] = captured;
                
                // add captured figure to board
                captured.$element.addClass('figure--column-' + captured.position[0]);
                captured.$element.addClass('figure--row-' + captured.position[1]);
                captured.$element.show();
            }

            // remove figure from old position
            figure.$element.removeClass('figure--column-' + figure.position[0]);
            figure.$element.removeClass('figure--row-' + figure.position[1]);
            
            this._board.fields[figure.position] = null;

            // set new position to figure
            figure.position = move.from;
            this._board.fields[figure.position] = figure;
            
            figure.$element.addClass('figure--column-' + figure.position[0]);
            figure.$element.addClass('figure--row-' + figure.position[1]);
        },
        _parsePgn: function(pgn) {
            var chess = new chessJs.Chess();
            chess.load_pgn(pgn);
            var parsed = [ ];
            var moveHistory = chess.history({ verbose: true });

            while (moveHistory.length > 0) {
                var move = moveHistory.shift();
                
                parsed.push({
                    figure: this.figuresSymbolToName[move.piece.toUpperCase()],
                    player: (move.color === 'b' ? 'black' : 'white'),
                    from: move.from,
                    to: move.to,
                    captured: move.captured && this.figuresSymbolToName[move.captured.toUpperCase()]
                });
            }

            return parsed;
        },
        _createFiguresSet: function(color) {
            var columns = 'abcdefgh'.split('');

            return [].concat(
                'R N B Q K B N R'.split(' '),
                'P P P P P P P P'.split(' ')
            ).map(function(figure, index) {
                var figureName = this.figuresSymbolToName[figure];
                var position = columns[index % 8] + (color === 'black' ? 8 - Math.floor(index / 8) : 1 + Math.floor(index / 8));

                return {
                    $element: $('<li>')
                        .addClass([
                            'figure figure--' + figureName,
                            'figure--' + color,
                            'figure--column-' + position[0],
                            'figure--row-' + position[1],
                        ].join(' ')),
                    name: figureName,
                    position: position
                };
            }, this);
        }
    });


    return ChessBoard;

})();