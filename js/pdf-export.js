/**
 * PDF Export
 * Page 1: custom-sized page sized to the full pattern grid + header/footer.
 * Page 2: legend (thread list) on a standard A4 page.
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
     * Render the pattern grid to an offscreen canvas: color fill + symbol per cell.
     * Returns a data URL.
     */
    function renderGridToCanvas(pattern, pxPerCell) {
        const canvas = document.createElement('canvas');
        canvas.width = pattern.width * pxPerCell;
        canvas.height = pattern.height * pxPerCell;
        const ctx = canvas.getContext('2d');

        const fontSize = Math.max(5, Math.floor(pxPerCell * 0.62));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let y = 0; y < pattern.height; y++) {
            for (let x = 0; x < pattern.width; x++) {
                const entry = pattern.palette[pattern.grid[y][x]];
                const cx = x * pxPerCell;
                const cy = y * pxPerCell;

                // Color fill
                ctx.fillStyle = `rgb(${entry.dmc.r},${entry.dmc.g},${entry.dmc.b})`;
                ctx.fillRect(cx, cy, pxPerCell, pxPerCell);

                // Symbol — black on light colors, white on dark
                const brightness = (entry.dmc.r * 299 + entry.dmc.g * 587 + entry.dmc.b * 114) / 1000;
                ctx.fillStyle = brightness > 128 ? '#000000' : '#ffffff';
                ctx.fillText(entry.symbol, cx + pxPerCell / 2, cy + pxPerCell / 2);
            }
        }

        return canvas.toDataURL('image/png');
    }

    async function generatePDF(pattern, patternName) {
        await loadJsPDF();

        const { jsPDF } = window.jspdf;

        // ---- Layout constants (mm) ----
        const margin = 12;
        const headerH = 22;  // title + info line
        const footerH = 8;   // sheep joke

        // Cell size: target 3mm per cell, capped so the page stays under ~700mm
        const maxGridW = 680 - margin * 2;
        const maxGridH = 680 - headerH - footerH - margin * 2;
        const cellMm = Math.max(
            1.5,
            Math.min(3, maxGridW / pattern.width, maxGridH / pattern.height)
        );

        const gridW_mm = pattern.width * cellMm;
        const gridH_mm = pattern.height * cellMm;

        const pageW = margin * 2 + gridW_mm;
        const pageH = margin + headerH + gridH_mm + footerH + margin;

        const doc = new jsPDF({
            orientation: pageW > pageH ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [pageW, pageH]
        });

        const gridOriginX = margin;
        const gridOriginY = margin + headerH;

        const colorCount = pattern.palette.filter(p => p.stitchCount > 0).length;
        const totalSkeins = pattern.palette.reduce((sum, p) => sum + p.skeins, 0);

        // ===== PAGE 1: PATTERN GRID =====

        // Header
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Just-a-girl yapping sesh', margin, margin + 7);

        if (patternName) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(patternName, margin, margin + 13);
        }

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

        // Grid image — 12px per cell gives enough room for readable symbols
        const pxPerCell = 12;
        const gridDataUrl = renderGridToCanvas(pattern, pxPerCell);
        doc.addImage(gridDataUrl, 'PNG', gridOriginX, gridOriginY, gridW_mm, gridH_mm);

        // Minor grid lines
        doc.setLineWidth(0.06);
        doc.setDrawColor(160, 160, 160);
        for (let gx = 0; gx <= pattern.width; gx++) {
            if (gx % 10 !== 0) {
                const cx = gridOriginX + gx * cellMm;
                doc.line(cx, gridOriginY, cx, gridOriginY + gridH_mm);
            }
        }
        for (let gy = 0; gy <= pattern.height; gy++) {
            if (gy % 10 !== 0) {
                const cy = gridOriginY + gy * cellMm;
                doc.line(gridOriginX, cy, gridOriginX + gridW_mm, cy);
            }
        }

        // Major grid lines (every 10)
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

        // Coordinate labels
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

        // Sheep joke footer (page 1)
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(180, 100, 130);
        doc.text(randomSheepJoke(), pageW / 2, pageH - margin - 1, { align: 'center' });

        // ===== PAGE 2: LEGEND =====
        doc.addPage([210, 297]); // A4

        const lMargin = 15;
        const lPageW = 210;
        const lPageH = 297;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Lista de ate / Legenda', lMargin, lMargin + 8);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(
            `${colorCount} culori DMC  |  ~${totalSkeins.toFixed(1)} sculuri totale`,
            lMargin, lMargin + 15
        );

        let legendY = lMargin + 22;

        // Column headers
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text('Sim',     lMargin,      legendY);
        doc.text('Culoare', lMargin + 10, legendY);
        doc.text('Cod DMC', lMargin + 22, legendY);
        doc.text('Nume',    lMargin + 42, legendY);
        doc.text('Cusaturi',lMargin + 130, legendY);
        doc.text('Sculuri', lMargin + 158, legendY);
        legendY += 3;

        doc.setDrawColor(120);
        doc.setLineWidth(0.2);
        doc.line(lMargin, legendY, lPageW - lMargin, legendY);
        legendY += 4.5;

        const activePalette = pattern.palette.filter(p => p.stitchCount > 0);
        const rowH = 6;
        const swatchSz = 4;

        for (const entry of activePalette) {
            if (legendY + rowH > lPageH - lMargin - 12) {
                // New page if legend overflows
                doc.addPage([210, 297]);
                legendY = lMargin + 10;
            }

            // Symbol
            doc.setFontSize(7);
            doc.setFont('courier', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(entry.symbol, lMargin + 1, legendY + 3.5);

            // Color swatch
            doc.setFillColor(entry.dmc.r, entry.dmc.g, entry.dmc.b);
            doc.rect(lMargin + 10, legendY + 0.5, swatchSz, swatchSz, 'F');
            doc.setDrawColor(100);
            doc.setLineWidth(0.12);
            doc.rect(lMargin + 10, legendY + 0.5, swatchSz, swatchSz, 'S');

            // Text columns
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(String(entry.dmc.code), lMargin + 22, legendY + 3.5);

            const nameStr = entry.dmc.name.length > 30
                ? entry.dmc.name.substring(0, 29) + '...'
                : entry.dmc.name;
            doc.text(nameStr, lMargin + 42, legendY + 3.5);
            doc.text(entry.stitchCount.toLocaleString(), lMargin + 130, legendY + 3.5);
            doc.text(entry.skeins.toFixed(1), lMargin + 158, legendY + 3.5);

            legendY += rowH;
        }

        // Sheep joke footer (page 2)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(180, 100, 130);
        doc.text(randomSheepJoke(), lPageW / 2, lPageH - lMargin - 2, { align: 'center' });

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
