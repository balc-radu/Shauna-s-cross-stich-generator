/**
 * Color Quantization Engine
 * Handles RGB↔LAB conversion, color distance, median cut quantization,
 * and mapping to DMC thread colors.
 */

const ColorQuantization = (() => {

    // ---- RGB ↔ LAB conversion (via XYZ) ----

    function rgbToLab(r, g, b) {
        // Normalize to 0-1
        let rr = r / 255, gg = g / 255, bb = b / 255;

        // sRGB to linear
        rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
        gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
        bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

        // Linear RGB to XYZ (D65)
        let x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
        let y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750) / 1.00000;
        let z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;

        // XYZ to LAB
        const epsilon = 0.008856;
        const kappa = 903.3;

        x = x > epsilon ? Math.cbrt(x) : (kappa * x + 16) / 116;
        y = y > epsilon ? Math.cbrt(y) : (kappa * y + 16) / 116;
        z = z > epsilon ? Math.cbrt(z) : (kappa * z + 16) / 116;

        return {
            L: 116 * y - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    // CIE76 color distance in LAB space
    function colorDistanceLab(lab1, lab2) {
        const dL = lab1.L - lab2.L;
        const da = lab1.a - lab2.a;
        const db = lab1.b - lab2.b;
        return Math.sqrt(dL * dL + da * da + db * db);
    }

    // Simple RGB distance (faster, used for pre-filtering)
    function colorDistanceRgb(c1, c2) {
        const dr = c1.r - c2.r;
        const dg = c1.g - c2.g;
        const db = c1.b - c2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // ---- Median Cut Algorithm ----

    function medianCut(pixels, maxColors) {
        if (maxColors < 1) maxColors = 1;
        if (maxColors > 256) maxColors = 256;

        // Build initial color box
        let boxes = [createBox(pixels)];

        // Iteratively split the box with the largest range
        while (boxes.length < maxColors) {
            // Sort boxes by volume (range) descending
            boxes.sort((a, b) => b.volume - a.volume);

            // Find the first box that can be split (has >1 pixel)
            let splitIdx = boxes.findIndex(box => box.pixels.length > 1);
            if (splitIdx === -1) break;

            const box = boxes.splice(splitIdx, 1)[0];
            const [box1, box2] = splitBox(box);

            if (box1.pixels.length > 0) boxes.push(box1);
            if (box2.pixels.length > 0) boxes.push(box2);

            // Safety: if split didn't produce two non-empty boxes
            if (box1.pixels.length === 0 && box2.pixels.length === 0) {
                boxes.push(box);
                break;
            }
        }

        // Average each box to get the representative color
        return boxes.map(box => {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (const p of box.pixels) {
                rSum += p.r;
                gSum += p.g;
                bSum += p.b;
                count += p.count || 1;
            }
            const len = box.pixels.length;
            return {
                r: Math.round(rSum / len),
                g: Math.round(gSum / len),
                b: Math.round(bSum / len),
                pixelCount: count
            };
        });
    }

    function createBox(pixels) {
        let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
        for (const p of pixels) {
            if (p.r < rMin) rMin = p.r;
            if (p.r > rMax) rMax = p.r;
            if (p.g < gMin) gMin = p.g;
            if (p.g > gMax) gMax = p.g;
            if (p.b < bMin) bMin = p.b;
            if (p.b > bMax) bMax = p.b;
        }
        const rRange = rMax - rMin;
        const gRange = gMax - gMin;
        const bRange = bMax - bMin;
        return {
            pixels,
            rMin, rMax, gMin, gMax, bMin, bMax,
            volume: Math.max(rRange, gRange, bRange)
        };
    }

    function splitBox(box) {
        const rRange = box.rMax - box.rMin;
        const gRange = box.gMax - box.gMin;
        const bRange = box.bMax - box.bMin;

        // Split along the longest axis
        let channel;
        if (rRange >= gRange && rRange >= bRange) channel = 'r';
        else if (gRange >= rRange && gRange >= bRange) channel = 'g';
        else channel = 'b';

        // Sort pixels by that channel
        box.pixels.sort((a, b) => a[channel] - b[channel]);

        const mid = Math.floor(box.pixels.length / 2);
        const left = box.pixels.slice(0, mid);
        const right = box.pixels.slice(mid);

        return [createBox(left), createBox(right)];
    }

    // ---- Reduce pixel data to unique colors with counts ----

    function reducePixels(imageData) {
        const data = imageData.data;
        const colorMap = new Map();

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Skip fully transparent pixels
            if (a < 128) continue;

            const key = (r << 16) | (g << 8) | b;
            if (colorMap.has(key)) {
                colorMap.get(key).count++;
            } else {
                colorMap.set(key, { r, g, b, count: 1 });
            }
        }

        return Array.from(colorMap.values());
    }

    // ---- Map colors to nearest DMC threads ----

    // Pre-compute LAB values for DMC colors
    let dmcLabCache = null;

    function getDmcLabColors() {
        if (dmcLabCache) return dmcLabCache;
        dmcLabCache = DMC_COLORS.map(dmc => ({
            ...dmc,
            lab: rgbToLab(dmc.r, dmc.g, dmc.b)
        }));
        return dmcLabCache;
    }

    function findNearestDMC(r, g, b, usedCodes = new Set()) {
        const lab = rgbToLab(r, g, b);
        const dmcLab = getDmcLabColors();

        let bestDist = Infinity;
        let bestDmc = null;

        for (const dmc of dmcLab) {
            if (usedCodes.has(dmc.code)) continue;
            const dist = colorDistanceLab(lab, dmc.lab);
            if (dist < bestDist) {
                bestDist = dist;
                bestDmc = dmc;
            }
        }

        return bestDmc;
    }

    /**
     * Map an array of quantized colors to unique DMC thread colors.
     * Ensures no two quantized colors map to the same DMC code.
     */
    function mapColorsToDMC(quantizedColors) {
        const usedCodes = new Set();
        const result = [];

        // Sort by pixel count descending so the most common colors get first pick
        const sorted = [...quantizedColors].sort((a, b) => b.pixelCount - a.pixelCount);

        for (const color of sorted) {
            const dmc = findNearestDMC(color.r, color.g, color.b, usedCodes);
            if (dmc) {
                usedCodes.add(dmc.code);
                result.push({
                    original: { r: color.r, g: color.g, b: color.b },
                    dmc: {
                        code: dmc.code,
                        name: dmc.name,
                        r: dmc.r,
                        g: dmc.g,
                        b: dmc.b
                    },
                    pixelCount: color.pixelCount
                });
            }
        }

        return result;
    }

    // ---- Public API ----

    return {
        rgbToLab,
        colorDistanceLab,
        colorDistanceRgb,
        medianCut,
        reducePixels,
        findNearestDMC,
        mapColorsToDMC,
        getDmcLabColors
    };

})();
