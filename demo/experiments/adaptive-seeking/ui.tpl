<div class="experiment--adaptive-seeking__ui">
    <div class="ui-container ui-container--ease">
        <input
            id="ease"
            type="checkbox"
            checked="{{ ease }}" />
        <label for="ease">Ease</label>
    </div>
    <div class="ui-container ui-container--backward">
        <input
            id="backward"
            type="checkbox"
            checked="{{ backward }}" />
        <label for="backward">Backward</label>
    </div>
    <div class="ui-container ui-container--show-loader">
        <input
            id="show-loader"
            type="checkbox"
        checked="{{ showLoader }}" />
        <label for="show-loader">Show loader</label>
    </div>
    <div class="ui-container ui-container--adaptive-seeking">
        <input
            id="adaptive-seeking"
            type="checkbox"
            checked="{{ adaptiveSeeking }}" />
        <label for="adaptive-seeking">Adaptive seeking</label>
    </div>
    <div class="ui-container ui-container--seeking-speed">
        <span class="ui-label ui-label--seeking-speed">Seeking speed:</span>
        <span class="ui-label ui-label--current-seeking-speed">{{ ('number' === typeof seekingSpeed ? seekingSpeed.toFixed(2) : seekingSpeed) }}</span>
    </div>
    <div class="ui-container ui-container--seeking-fps">
        <span class="ui-label ui-label--seeking-fps">Seeking FPS:</span>
        <span class="ui-label ui-label--current-seeking-fps">{{ ('number' === typeof seekingFps ? seekingFps.toFixed(2) : seekingFps) }}</span>
    </div>
</div>