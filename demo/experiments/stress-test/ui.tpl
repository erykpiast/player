<div class="experiment--tween-playground__ui">
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
    <div class="ui-container ui-container--tiles-per-frame">
        <input
            id="tiles-per-frame"
            min="1"
            max="100"
            step="1"
            type="range"
            value="{{ tilesPerFrame }}" />
        <label for="tiles-per-frame">Tiles per frame ({{ tilesPerFrame }})</label>
    </div>
</div>