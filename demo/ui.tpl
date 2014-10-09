<div class="ui-container--main ui-container">
    <button
        class="ui-button ui-button--play"
        on-click="playPause"
    >{{ playing ? 'Pause' : 'Play' }}</button>

    <div class="ui-container ui-container--speed">
        <button
            class="ui-button ui-button--increase-speed"
            on-click="changeSpeed:-1"
        >Decrease speed</button>
        <span class="ui-label ui-label--current-speed">{{ currentSpeed }}</span>
        <button
            class="ui-button ui-button--increase-speed"
            on-click="changeSpeed:+1"
        >Increase speed</button>
    </div>

    <div class="ui-container ui-container--fps">
        {{ fps.toFixed(2) }}
    </div>

    <div class="ui-container ui-container--timeline">
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            on-input="seek"
            value="{{ progress }}"/>
    </div>
</div>