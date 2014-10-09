module.exports = (function() {

    var Player = require('../index');
    var UI = require('./ui');

    
    function Experiment(view) {
        this._view = view;

        this._stage = document.createElement('div');
        this._stage.className = 'experiment__stage';

        this._uiContainer = document.createElement('div');
        this._uiContainer.className = 'experiment__ui';

        this._playerOptions = { };
        this._experimentSpecificUi = '';
    }


    Experiment.prototype = {
        load: function() {
            this._view.appendChild(this._uiContainer);
            this._view.appendChild(this._stage);

            this._player = new Player(this._createKeyframes(), this._frameHandler.bind(this), this._playerOptions);

            this._ui = new UI(this._uiContainer, {
                experimentSpecific: this._experimentSpecificUi
            }, this._player);
        },
        unload: function() {
            while(this._stage.firstChild) {
                this._stage.removeChild(this._stage.firstChild);
            }
            if(this._stage.parentNode) {
                this._stage.parentNode.removeChild(this._stage);
            }

            while(this._uiContainer.firstChild) {
                this._uiContainer.removeChild(this._uiContainer.firstChild);
            }
            if(this._uiContainer.parentNode) {
                this._uiContainer.parentNode.removeChild(this._uiContainer);
            }

            this._ui.destroy();

            this._player.destroy();
        },
        // overwrite in descendants
        _frameHandler: function(keyframes) {
            keyframes.forEach(this._keyframeHandler, this);
        },
        _keyframeHandler: function(keyframe) {
            console.log(keyframe);
        },
        _createKeyframes: function() {
            return [{
                time: 0
            }];
        }
    };


    return Experiment;

})();