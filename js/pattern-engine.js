/**
 * Pattern Engine
 * Converts an image into a cross stitch pattern with DMC-mapped colors.
 */

const PatternEngine = (() => {

    // Symbols used in patterns - ASCII only for PDF compatibility
    const SYMBOLS = [
        'X', 'O', '#', '@', '+', '*', '/', '\\',
        'Z', 'S', 'V', 'N', 'W', 'A', 'B', 'C',
        'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
        'L', 'M', 'P', 'Q', 'R', 'T', 'U', 'Y',
        '&', '%', '=', '?', '!', '^', '~', ':',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
    ];

    /**
     * Calculate grid dimensions based on physical size and fabric count.
     * @param {number} widthCm - Desired width in centimeters
     * @param {number} heightCm - Desired height in centimeters (or null for auto)
     * @param {number} fabricCount - Stitches per inch (e.g., 14 for 14-count Aida)
     * @param {number} imageWidth - Original image width in pixels
     * @param {number} imageHeight - Original image height in pixels
     * @param {boolean} lockWidth - If true, height is auto-calculated
     */
    function calculateGridSize(widthCm, heightCm, fabricCount, imageWidth, imageHeight, lockWidth) {
        const stitchesPerCm = fabricCount / 2.54;
        const aspectRatio = imageWidth / imageHeight;

        let gridW, gridH;

        if (lockWidth) {
            gridW = Math.round(widthCm * stitchesPerCm);
            gridH = Math.round(gridW / aspectRatio);
        } else {
            gridH = Math.round(heightCm * stitchesPerCm);
            gridW = Math.round(gridH * aspectRatio);
        }

        // Clamp to reasonable limits
        gridW = Math.max(10, Math.min(500, gridW));
        gridH = Math.max(10, Math.min(500, gridH));

        return { gridW, gridH };
    }

    /**
     * Generate a cross stitch pattern from an image element.
     * @param {HTMLImageElement} image - Source image
     * @param {Object} options
     * @param {number} options.widthCm
     * @param {number} options.heightCm
     * @param {number} options.fabricCount
     * @param {number} options.maxColors
     * @param {boolean} options.lockWidth
     * @returns {Object} pattern data
     */
    function generatePattern(image, options) {
        const { widthCm, heightCm, fabricCount, maxColors, lockWidth } = options;

        // Calculate grid size
        const { gridW, gridH } = calculateGridSize(
            widthCm, heightCm, fabricCount,
            image.naturalWidth, image.naturalHeight,
            lockWidth
        );

        // Draw image to off-screen canvas at grid size
        const canvas = document.createElement('canvas');
        canvas.width = gridW;
        canvas.height = gridH;
        const ctx = canvas.getContext('2d');

        // Use pixelated rendering for better downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(image, 0, 0, gridW, gridH);

        const imageData = ctx.getImageData(0, 0, gridW, gridH);

        // Reduce to unique colors with counts
        const uniquePixels = ColorQuantization.reducePixels(imageData);

        // Quantize to maxColors using median cut
        const quantized = ColorQuantization.medianCut(uniquePixels, maxColors);

        // Map quantized colors to DMC threads
        const dmcMapping = ColorQuantization.mapColorsToDMC(quantized);

        // Build palette with symbols
        const palette = dmcMapping.map((mapping, index) => ({
            symbol: SYMBOLS[index % SYMBOLS.length],
            dmc: mapping.dmc,
            original: mapping.original,
            stitchCount: 0 // will be counted below
        }));

        // Pre-compute LAB for palette originals
        const paletteOrigLab = palette.map(p => ({
            entry: p,
            lab: ColorQuantization.rgbToLab(p.original.r, p.original.g, p.original.b)
        }));

        // Build the grid: each cell is an index into the palette
        const grid = [];
        const data = imageData.data;

        for (let y = 0; y < gridH; y++) {
            const row = [];
            for (let x = 0; x < gridW; x++) {
                const idx = (y * gridW + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                // Find nearest palette entry
                const pixLab = ColorQuantization.rgbToLab(r, g, b);
                let bestDist = Infinity;
                let bestIdx = 0;

                for (let i = 0; i < paletteOrigLab.length; i++) {
                    const dist = ColorQuantization.colorDistanceLab(pixLab, paletteOrigLab[i].lab);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                    }
                }

                palette[bestIdx].stitchCount++;
                row.push(bestIdx);
            }
            grid.push(row);
        }

        // Calculate physical dimensions
        const stitchesPerCm = fabricCount / 2.54;
        const actualWidthCm = (gridW / stitchesPerCm).toFixed(1);
        const actualHeightCm = (gridH / stitchesPerCm).toFixed(1);

        // Estimate thread usage
        // Each cross stitch uses ~25cm of floss, 1 skein = 8m = 800cm
        for (const entry of palette) {
            entry.threadLengthCm = entry.stitchCount * 25;
            entry.skeins = Math.ceil(entry.threadLengthCm / 800 * 10) / 10; // round to 0.1
        }

        // Sort palette by stitch count descending and build old→new index map
        const oldOrder = palette.map((entry, i) => ({ entry, oldIdx: i }));
        palette.sort((a, b) => b.stitchCount - a.stitchCount);

        // Re-assign symbols after sorting
        palette.forEach((entry, i) => {
            entry.symbol = SYMBOLS[i % SYMBOLS.length];
        });

        // Build old index → new index mapping
        const indexMap = new Array(palette.length);
        for (const item of oldOrder) {
            indexMap[item.oldIdx] = palette.indexOf(item.entry);
        }

        // Remap grid indices
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                grid[y][x] = indexMap[grid[y][x]];
            }
        }

        return {
            grid,
            palette,
            width: gridW,
            height: gridH,
            widthCm: parseFloat(actualWidthCm),
            heightCm: parseFloat(actualHeightCm),
            fabricCount,
            totalStitches: gridW * gridH
        };
    }

    return {
        calculateGridSize,
        generatePattern,
        SYMBOLS
    };

})();
