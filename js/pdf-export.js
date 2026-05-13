/**
 * PDF Export
 * Generates a single custom-sized page with header, grid, and legend.
 * Uses jsPDF loaded from CDN. Includes sheep jokes because of course it does.
 */

const PdfExport = (() => {

    const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    let jsPDFLoaded = false;

    const SHEEP_JOKES_PDF = [
        'Beeee! Aceasta pagina a fost aprobata de oita noastra.',
        'Stiai ca o oaie poate produce suficienta lana pentru 14 pulovere pe an?',
        'De ce a trecut oaia strada? Ca sa ajunga la magazinul de ate DMC!',
        'Oita zice: "Mai multe cusaturi, mai multa dragoste!"',
        'Fun fact: Oile au memorie excelenta - pot recunoaste pana la 50 de fete!',
        'Lana, ata, cusaturi... ce mai zice oaia? Beeee-autiful!',
        'Oita noastra numara cusaturile in loc de oi ca sa adoarma.',
        'Cross stitch = terapie. Oita noastra confirma.',
    ];

    function randomSheepJoke() {
        return SHEEP_JOKES_PDF[Math.floor(Math.random() * SHEEP_JOKES_PDF.length)];
    }

    function loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (jsPDFLoaded || window.jspdf) {
                jsPDFLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = JSPDF_CDN;
            script.onload = () => {
                jsPDFLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load jsPDF library'));
            document.head.appendChild(script);
        });
    }

    /**
     * Render the pattern grid to an offscreen canvas (color fill only, no symbols).
     * Returns a data URL.
     */
    function renderGridToCanvas(pattern, pxPerCell) {
        const canvas = document.createElement('canvas');
        canvas.width = pattern.width * pxPerCell;
        canvas.height = pattern.height * pxPerCell;
        const ctx = canvas.getContext('2d');

        for (let y = 0; y < pattern.height; y++) {
            for (let x = 0; x < pattern.width; x++) {
                const entry = pattern.palette[pattern.grid[y][x]];
                ctx.fillStyle = `rgb(${entry.dmc.r},${entry.dmc.g},${entry.dmc.b})`;
                ctx.fillRect(x * pxPerCell, y * pxPerCell, pxPerCell, pxPerCell);
            }
        }

        return canvas.toDataURL('image/png');
    }

    async function generatePDF(pattern, patternName) {
        await loadJsPDF();

        const { jsPDF } = window.jspdf;

        // ---- Layout constants (mm) ----
        const margin = 12;
        const headerH = 22;       // space for title + info line
        const footerH = 8;        // space for sheep joke
        const legendW = 72;       // right column width
        const gap = 6;            // gap between grid and legend

        // Cell size: target 3mm per cell, but cap page width at ~500mm and height at ~700mm
        const maxGridW = 480 - margin * 2 - gap - legendW;
        const maxGridH = 680 - headerH - footerH - margin * 2;
        const cellMm = Math.max(
            1.5,
            Math.min(3, maxGridW / pattern.width, maxGridH / pattern.height)
        );

        const gridW_mm = pattern.width * cellMm;
        const gridH_mm = pattern.height * cellMm;

        const pageW = margin + gridW_mm + gap + legendW + margin;
        const pageH = margin + headerH + gridH_mm + footerH + margin;

        const doc = new jsPDF({
            orientation: pageW > pageH ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [pageW, pageH]
        });

        const gridOriginX = margin;
        const gridOriginY = margin + headerH;

        // ===== HEADER =====
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Just-a-girl yapping sesh', margin, margin + 7);

        if (patternName) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(patternName, margin, margin + 13);
        }

        const colorCount = pattern.palette.filter(p => p.stitchCount > 0).length;
        const totalSkeins = pattern.palette.reduce((sum, p) => sum + p.skeins, 0);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const infoLine = [
            `${pattern.widthCm} x ${pattern.heightCm} cm`,
            `${pattern.width} x ${pattern.height} cusaturi`,
            `Total: ${pattern.totalStitches.toLocaleString()} cusaturi`,
            `${pattern.fabricCount}-count Aida`,
            `${colorCount} culori DMC`,
            `~${totalSkeins.toFixed(1)} sculuri`,
            new Date().toLocaleDateString('ro-RO')
        ].join('   |   ');
        doc.text(infoLine, margin, margin + 19);
        doc.setTextColor(0, 0, 0);

        // ===== GRID IMAGE =====
        // Use 8px per cell for crisp rendering at typical pattern sizes
        const pxPerCell = 8;
        const gridDataUrl = renderGridToCanvas(pattern, pxPerCell);
        doc.addImage(gridDataUrl, 'PNG', gridOriginX, gridOriginY, gridW_mm, gridH_mm);

        // ===== VECTOR GRID LINES =====
        // Minor lines every cell
        doc.setLineWidth(0.06);
        doc.setDrawColor(160, 160, 160);

        for (let gx = 0; gx <= pattern.width; gx++) {
            const isMajor = gx % 10 === 0;
            if (!isMajor) {
                const cx = gridOriginX + gx * cellMm;
                doc.line(cx, gridOriginY, cx, gridOriginY + gridH_mm);
            }
        }
        for (let gy = 0; gy <= pattern.height; gy++) {
            const isMajor = gy % 10 === 0;
            if (!isMajor) {
                const cy = gridOriginY + gy * cellMm;
                doc.line(gridOriginX, cy, gridOriginX + gridW_mm, cy);
            }
        }

        // Major lines every 10 cells
        doc.setLineWidth(0.25);
        doc.setDrawColor(60, 60, 60);

        for (let gx = 0; gx <= pattern.width; gx += 10) {
            const cx = gridOriginX + gx * cellMm;
            doc.line(cx, gridOriginY, cx, gridOriginY + gridH_mm);
        }
        for (let gy = 0; gy <= pattern.height; gy += 10) {
            const cy = gridOriginY + gy * cellMm;
            doc.line(gridOriginX, cy, gridOriginX + gridW_mm, cy);
        }

        // Outer border
        doc.setLineWidth(0.4);
        doc.setDrawColor(30, 30, 30);
        doc.rect(gridOriginX, gridOriginY, gridW_mm, gridH_mm);

        // Grid coordinate labels (every 10)
        doc.setFontSize(4.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);

        for (let gx = 10; gx <= pattern.width; gx += 10) {
            const cx = gridOriginX + gx * cellMm;
            doc.text(gx.toString(), cx, gridOriginY - 1, { align: 'center' });
        }
        for (let gy = 10; gy <= pattern.height; gy += 10) {
            const cy = gridOriginY + gy * cellMm;
            doc.text(gy.toString(), gridOriginX - 1.2, cy + 1.2, { align: 'right' });
        }

        // ===== LEGEND (right column) =====
        const legendX = gridOriginX + gridW_mm + gap;
        let legendY = gridOriginY;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Legenda / Lista de ate', legendX, legendY + 4);
        legendY += 8;

        // Column headers
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text('Sim', legendX, legendY);
        doc.text('Culoare', legendX + 7, legendY);
        doc.text('Cod', legendX + 17, legendY);
        doc.text('Nume', legendX + 29, legendY);
        doc.text('Cus.', legendX + 55, legendY);
        doc.text('Scul', legendX + 64, legendY);
        legendY += 2;

        doc.setDrawColor(150);
        doc.setLineWidth(0.15);
        doc.line(legendX, legendY, legendX + legendW - 4, legendY);
        legendY += 3.5;

        const activePalette = pattern.palette.filter(p => p.stitchCount > 0);
        const rowH = 5;
        const swatchSz = 3.5;
        const maxLegendY = gridOriginY + gridH_mm - 2;

        doc.setFont('helvetica', 'normal');

        for (const entry of activePalette) {
            if (legendY + rowH > maxLegendY) break; // clip if pattern is very tall

            // Symbol
            doc.setFontSize(6);
            doc.setFont('courier', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(entry.symbol, legendX + 1, legendY + 3);

            // Color swatch
            doc.setFillColor(entry.dmc.r, entry.dmc.g, entry.dmc.b);
            doc.rect(legendX + 7, legendY + 0.3, swatchSz, swatchSz, 'F');
            doc.setDrawColor(100);
            doc.setLineWidth(0.1);
            doc.rect(legendX + 7, legendY + 0.3, swatchSz, swatchSz, 'S');

            // Text
            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(String(entry.dmc.code), legendX + 17, legendY + 3);

            const nameStr = entry.dmc.name.length > 18
                ? entry.dmc.name.substring(0, 17) + '…'
                : entry.dmc.name;
            doc.text(nameStr, legendX + 29, legendY + 3);
            doc.text(entry.stitchCount.toLocaleString(), legendX + 55, legendY + 3);
            doc.text(entry.skeins.toFixed(1), legendX + 64, legendY + 3);

            legendY += rowH;
        }

        // ===== SHEEP JOKE (footer) =====
        const footerY = pageH - margin - 1;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(180, 100, 130);
        doc.text(randomSheepJoke(), pageW / 2, footerY, { align: 'center' });

        // ===== SAVE =====
        const filename = (patternName || 'model-cross-stitch')
            .replace(/[^a-z0-9]/gi, '-')
            .toLowerCase();
        doc.save(`${filename}.pdf`);
    }

    return {
        loadJsPDF,
        generatePDF
    };

})();
