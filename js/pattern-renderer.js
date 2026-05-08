/**
 * Pattern Renderer
 * Renders cross stitch patterns on a <canvas> with zoom/pan,
 * view modes (color, symbol, combined), and legend rendering.
 */

const PatternRenderer = (() => {

    const CELL_SIZE_BASE = 20; // Base cell size in pixels at 100% zoom
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 4;
    const GRID_LINE_COLOR = '#cccccc';
    const GRID_MAJOR_LINE_COLOR = '#888888';
    const MAJOR_GRID_INTERVAL = 10; // Bold line every 10 stitches

    let currentPattern = null;
    let currentZoom = 1;
    let currentViewMode = 'combined'; // 'combined', 'color', 'symbol'
    let panX = 0, panY = 0;
    let isPanning = false;
    let panStartX = 0, panStartY = 0;

    /**
     * Render a small preview of the pattern (color-only, no grid lines).
     */
    function renderPreview(canvas, pattern) {
        const ctx = canvas.getContext('2d');
        const scale = Math.min(500 / pattern.width, 400 / pattern.height, 4);

        canvas.width = pattern.width * scale;
        canvas.height = pattern.height * scale;

        for (let y = 0; y < pattern.height; y++) {
            for (let x = 0; x < pattern.width; x++) {
                const paletteIdx = pattern.grid[y][x];
                const entry = pattern.palette[paletteIdx];
                ctx.fillStyle = `rgb(${entry.dmc.r}, ${entry.dmc.g}, ${entry.dmc.b})`;
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }

    /**
     * Render the full pattern on a canvas with grid, symbols, and zoom/pan.
     */
    function renderPattern(canvas, pattern, viewMode, zoom) {
        currentPattern = pattern;
        currentViewMode = viewMode || currentViewMode;
        currentZoom = zoom || currentZoom;

        const ctx = canvas.getContext('2d');
        const cellSize = CELL_SIZE_BASE * currentZoom;

        canvas.width = pattern.width * cellSize + 1;
        canvas.height = pattern.height * cellSize + 1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw cells
        for (let y = 0; y < pattern.height; y++) {
            for (let x = 0; x < pattern.width; x++) {
                const paletteIdx = pattern.grid[y][x];
                const entry = pattern.palette[paletteIdx];
                const px = x * cellSize;
                const py = y * cellSize;

                // Background color
                if (currentViewMode === 'combined' || currentViewMode === 'color') {
                    ctx.fillStyle = `rgb(${entry.dmc.r}, ${entry.dmc.g}, ${entry.dmc.b})`;
                    ctx.fillRect(px, py, cellSize, cellSize);
                } else {
                    // Symbol-only: white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(px, py, cellSize, cellSize);
                }

                // Symbol
                if (currentViewMode === 'combined' || currentViewMode === 'symbol') {
                    if (cellSize >= 10) { // Only show symbols when zoomed in enough
                        const fontSize = Math.max(8, cellSize * 0.55);
                        ctx.font = `bold ${fontSize}px monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        if (currentViewMode === 'combined') {
                            // Choose contrast color
                            const brightness = (entry.dmc.r * 299 + entry.dmc.g * 587 + entry.dmc.b * 114) / 1000;
                            ctx.fillStyle = brightness > 128 ? '#000000' : '#ffffff';
                        } else {
                            ctx.fillStyle = '#333333';
                        }

                        ctx.fillText(entry.symbol, px + cellSize / 2, py + cellSize / 2);
                    }
                }
            }
        }

        // Draw grid lines
        if (cellSize >= 6) {
            ctx.strokeStyle = GRID_LINE_COLOR;
            ctx.lineWidth = 0.5;

            for (let x = 0; x <= pattern.width; x++) {
                const px = x * cellSize;
                if (x % MAJOR_GRID_INTERVAL === 0) {
                    ctx.strokeStyle = GRID_MAJOR_LINE_COLOR;
                    ctx.lineWidth = 1.5;
                } else {
                    ctx.strokeStyle = GRID_LINE_COLOR;
                    ctx.lineWidth = 0.5;
                }
                ctx.beginPath();
                ctx.moveTo(px, 0);
                ctx.lineTo(px, pattern.height * cellSize);
                ctx.stroke();
            }

            for (let y = 0; y <= pattern.height; y++) {
                const py = y * cellSize;
                if (y % MAJOR_GRID_INTERVAL === 0) {
                    ctx.strokeStyle = GRID_MAJOR_LINE_COLOR;
                    ctx.lineWidth = 1.5;
                } else {
                    ctx.strokeStyle = GRID_LINE_COLOR;
                    ctx.lineWidth = 0.5;
                }
                ctx.beginPath();
                ctx.moveTo(0, py);
                ctx.lineTo(pattern.width * cellSize, py);
                ctx.stroke();
            }

            // Grid numbers every 10 stitches
            if (cellSize >= 12) {
                ctx.fillStyle = '#666666';
                const numFontSize = Math.max(8, cellSize * 0.4);
                ctx.font = `${numFontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                for (let x = MAJOR_GRID_INTERVAL; x <= pattern.width; x += MAJOR_GRID_INTERVAL) {
                    ctx.fillText(x.toString(), x * cellSize, -2);
                }

                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                for (let y = MAJOR_GRID_INTERVAL; y <= pattern.height; y += MAJOR_GRID_INTERVAL) {
                    ctx.fillText(y.toString(), -4, y * cellSize);
                }
            }
        }
    }

    /**
     * Render the legend/thread list as HTML.
     */
    function renderLegend(container, pattern) {
        container.innerHTML = '';

        for (const entry of pattern.palette) {
            if (entry.stitchCount === 0) continue;

            const item = document.createElement('div');
            item.className = 'thread-item';

            const swatch = document.createElement('div');
            swatch.className = 'thread-swatch';
            swatch.style.backgroundColor = `rgb(${entry.dmc.r}, ${entry.dmc.g}, ${entry.dmc.b})`;

            const symbol = document.createElement('div');
            symbol.className = 'thread-symbol';
            symbol.textContent = entry.symbol;

            const info = document.createElement('div');
            info.className = 'thread-info';
            info.innerHTML = `
                <span class="thread-dmc">DMC ${entry.dmc.code}</span>
                <span class="thread-name">${entry.dmc.name}</span>
            `;

            const count = document.createElement('div');
            count.className = 'thread-count';
            count.innerHTML = `${entry.stitchCount.toLocaleString()}<br>${entry.skeins} scul${entry.skeins !== 1 ? 'uri' : ''}`;

            item.appendChild(swatch);
            item.appendChild(symbol);
            item.appendChild(info);
            item.appendChild(count);
            container.appendChild(item);
        }
    }

    /**
     * Render the pattern summary info.
     */
    function renderSummary(container, pattern) {
        const colorCount = pattern.palette.filter(p => p.stitchCount > 0).length;
        const totalSkeins = pattern.palette.reduce((sum, p) => sum + p.skeins, 0);

        container.innerHTML = `
            <div class="info-row">
                <span>Dimensiuni:</span>
                <strong>${pattern.widthCm} x ${pattern.heightCm} cm</strong>
            </div>
            <div class="info-row">
                <span>Dimensiune grila:</span>
                <strong>${pattern.width} x ${pattern.height} cusaturi</strong>
            </div>
            <div class="info-row">
                <span>Total cusaturi:</span>
                <strong>${pattern.totalStitches.toLocaleString()}</strong>
            </div>
            <div class="info-row">
                <span>Culori:</span>
                <strong>${colorCount} ate DMC</strong>
            </div>
            <div class="info-row">
                <span>Tesatura:</span>
                <strong>${pattern.fabricCount}-count Aida</strong>
            </div>
            <div class="info-row">
                <span>Total sculuri:</span>
                <strong>~${totalSkeins.toFixed(1)}</strong>
            </div>
        `;
    }

    // ---- Zoom controls ----

    function zoomIn(canvas, pattern) {
        currentZoom = Math.min(MAX_ZOOM, currentZoom * 1.25);
        renderPattern(canvas, pattern, currentViewMode, currentZoom);
        return currentZoom;
    }

    function zoomOut(canvas, pattern) {
        currentZoom = Math.max(MIN_ZOOM, currentZoom / 1.25);
        renderPattern(canvas, pattern, currentViewMode, currentZoom);
        return currentZoom;
    }

    function zoomFit(canvas, pattern, containerWidth, containerHeight) {
        const cellW = (containerWidth - 20) / pattern.width;
        const cellH = (containerHeight - 20) / pattern.height;
        const fitCell = Math.min(cellW, cellH);
        currentZoom = fitCell / CELL_SIZE_BASE;
        currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom));
        renderPattern(canvas, pattern, currentViewMode, currentZoom);
        return currentZoom;
    }

    function setViewMode(canvas, pattern, mode) {
        currentViewMode = mode;
        renderPattern(canvas, pattern, currentViewMode, currentZoom);
    }

    function getZoom() {
        return currentZoom;
    }

    /**
     * Generate a high-resolution PNG data URL of the pattern.
     */
    function toDataURL(pattern, viewMode) {
        const tempCanvas = document.createElement('canvas');
        const savedZoom = currentZoom;
        const savedMode = currentViewMode;

        renderPattern(tempCanvas, pattern, viewMode || 'combined', 1);

        currentZoom = savedZoom;
        currentViewMode = savedMode;

        return tempCanvas.toDataURL('image/png');
    }

    return {
        renderPreview,
        renderPattern,
        renderLegend,
        renderSummary,
        zoomIn,
        zoomOut,
        zoomFit,
        setViewMode,
        getZoom,
        toDataURL,
        CELL_SIZE_BASE
    };

})();
