/**
 * PDF Export
 * Generates a multi-page PDF with cover, legend, and grid pages.
 * Uses jsPDF loaded from CDN. Includes sheep jokes between sections.
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

    async function generatePDF(pattern, patternName) {
        await loadJsPDF();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pageW = 210;
        const pageH = 297;
        const margin = 15;
        const usableW = pageW - margin * 2;
        const usableH = pageH - margin * 2;

        // ===== COVER PAGE =====
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Just-a-girl yapping sesh', pageW / 2, 30, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('Model Cross Stitch', pageW / 2, 42, { align: 'center' });

        if (patternName) {
            doc.setFontSize(12);
            doc.text(patternName, pageW / 2, 52, { align: 'center' });
        }

        // Pattern preview image
        const previewCanvas = document.createElement('canvas');
        const previewScale = Math.min(140 / pattern.width, 120 / pattern.height);
        previewCanvas.width = pattern.width * previewScale;
        previewCanvas.height = pattern.height * previewScale;
        const pCtx = previewCanvas.getContext('2d');

        for (let y = 0; y < pattern.height; y++) {
            for (let x = 0; x < pattern.width; x++) {
                const entry = pattern.palette[pattern.grid[y][x]];
                pCtx.fillStyle = `rgb(${entry.dmc.r},${entry.dmc.g},${entry.dmc.b})`;
                pCtx.fillRect(x * previewScale, y * previewScale, previewScale, previewScale);
            }
        }

        const previewDataUrl = previewCanvas.toDataURL('image/png');
        const imgW = Math.min(usableW, previewCanvas.width * 0.5);
        const imgH = imgW * (previewCanvas.height / previewCanvas.width);
        doc.addImage(previewDataUrl, 'PNG', (pageW - imgW) / 2, 62, imgW, imgH);

        // Pattern info
        let infoY = 62 + imgH + 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const colorCount = pattern.palette.filter(p => p.stitchCount > 0).length;
        const totalSkeins = pattern.palette.reduce((sum, p) => sum + p.skeins, 0);

        const infoLines = [
            `Dimensiuni: ${pattern.widthCm} x ${pattern.heightCm} cm`,
            `Grila: ${pattern.width} x ${pattern.height} cusaturi`,
            `Total cusaturi: ${pattern.totalStitches.toLocaleString()}`,
            `Tesatura: ${pattern.fabricCount}-count Aida`,
            `Culori: ${colorCount} ate DMC`,
            `Sculuri estimate: ~${totalSkeins.toFixed(1)}`,
            `Generat: ${new Date().toLocaleDateString('ro-RO')}`
        ];

        for (const line of infoLines) {
            doc.text(line, pageW / 2, infoY, { align: 'center' });
            infoY += 6;
        }

        // Sheep joke on cover
        infoY += 8;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 100, 120);
        doc.text(randomSheepJoke(), pageW / 2, infoY, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // ===== LEGEND PAGE =====
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Lista de ate / Legenda', margin, margin + 5);

        let legendY = margin + 15;
        const rowH = 7;
        const swatchSize = 5;

        // Header
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Simbol', margin, legendY);
        doc.text('Culoare', margin + 12, legendY);
        doc.text('Cod DMC', margin + 20, legendY);
        doc.text('Nume', margin + 45, legendY);
        doc.text('Cusaturi', margin + 120, legendY);
        doc.text('Sculuri', margin + 150, legendY);
        legendY += 3;
        doc.setDrawColor(150);
        doc.line(margin, legendY, pageW - margin, legendY);
        legendY += 4;

        doc.setFont('helvetica', 'normal');

        const activePalette = pattern.palette.filter(p => p.stitchCount > 0);

        for (const entry of activePalette) {
            if (legendY > pageH - margin - 10) {
                doc.addPage();
                legendY = margin + 10;
            }

            // Color swatch
            doc.setFillColor(entry.dmc.r, entry.dmc.g, entry.dmc.b);
            doc.rect(margin + 12, legendY - swatchSize + 1, swatchSize, swatchSize, 'F');
            doc.setDrawColor(100);
            doc.rect(margin + 12, legendY - swatchSize + 1, swatchSize, swatchSize, 'S');

            doc.setFontSize(9);
            doc.setFont('courier', 'bold');
            doc.text(entry.symbol, margin + 3, legendY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(entry.dmc.code, margin + 22, legendY);
            doc.text(entry.dmc.name, margin + 45, legendY);
            doc.text(entry.stitchCount.toLocaleString(), margin + 120, legendY);
            doc.text(entry.skeins.toFixed(1), margin + 150, legendY);

            legendY += rowH;
        }

        // Sheep joke after legend
        legendY += 5;
        if (legendY < pageH - margin - 15) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(150, 100, 120);
            doc.text(randomSheepJoke(), pageW / 2, legendY, { align: 'center' });
            doc.setTextColor(0, 0, 0);
        }

        // ===== GRID PAGES =====
        const cellSizeMm = 4; // Increased from 3 to 4mm for better symbol readability
        const cellsPerPageW = Math.floor(usableW / cellSizeMm);
        const cellsPerPageH = Math.floor((usableH - 14) / cellSizeMm);

        const pagesX = Math.ceil(pattern.width / cellsPerPageW);
        const pagesY = Math.ceil(pattern.height / cellsPerPageH);
        const totalGridPages = pagesX * pagesY;

        for (let py = 0; py < pagesY; py++) {
            for (let px = 0; px < pagesX; px++) {
                doc.addPage();

                const startX = px * cellsPerPageW;
                const startY = py * cellsPerPageH;
                const endX = Math.min(startX + cellsPerPageW, pattern.width);
                const endY = Math.min(startY + cellsPerPageH, pattern.height);
                const cols = endX - startX;
                const rows = endY - startY;

                const pageNum = py * pagesX + px + 1;

                // Page header
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(
                    `Sectiunea [${startX + 1}-${endX}] x [${startY + 1}-${endY}]  (Pagina ${pageNum} din ${totalGridPages})`,
                    margin, margin + 3
                );

                // Small sheep joke in header
                doc.setFontSize(6);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(180, 130, 150);
                doc.text(randomSheepJoke(), pageW - margin, margin + 3, { align: 'right' });
                doc.setTextColor(0, 0, 0);

                const gridOriginX = margin + 6; // leave room for row numbers
                const gridOriginY = margin + 10;

                // Draw cells with symbols
                for (let gy = 0; gy < rows; gy++) {
                    for (let gx = 0; gx < cols; gx++) {
                        const paletteIdx = pattern.grid[startY + gy][startX + gx];
                        const entry = pattern.palette[paletteIdx];

                        const cx = gridOriginX + gx * cellSizeMm;
                        const cy = gridOriginY + gy * cellSizeMm;

                        // Fill with color
                        doc.setFillColor(entry.dmc.r, entry.dmc.g, entry.dmc.b);
                        doc.rect(cx, cy, cellSizeMm, cellSizeMm, 'F');

                        // Symbol - use Courier which handles ASCII well
                        const brightness = (entry.dmc.r * 299 + entry.dmc.g * 587 + entry.dmc.b * 114) / 1000;
                        if (brightness > 128) {
                            doc.setTextColor(0, 0, 0);
                        } else {
                            doc.setTextColor(255, 255, 255);
                        }
                        doc.setFontSize(6);
                        doc.setFont('courier', 'bold');
                        doc.text(
                            entry.symbol,
                            cx + cellSizeMm / 2,
                            cy + cellSizeMm * 0.7,
                            { align: 'center' }
                        );
                    }
                }

                // Reset text color for grid lines
                doc.setTextColor(0, 0, 0);

                // Draw grid lines
                doc.setDrawColor(180);
                doc.setLineWidth(0.1);

                for (let gx = 0; gx <= cols; gx++) {
                    const cx = gridOriginX + gx * cellSizeMm;
                    const isMajor = (startX + gx) % 10 === 0;
                    if (isMajor) {
                        doc.setDrawColor(60);
                        doc.setLineWidth(0.3);
                    } else {
                        doc.setDrawColor(180);
                        doc.setLineWidth(0.1);
                    }
                    doc.line(cx, gridOriginY, cx, gridOriginY + rows * cellSizeMm);
                }

                for (let gy = 0; gy <= rows; gy++) {
                    const cy = gridOriginY + gy * cellSizeMm;
                    const isMajor = (startY + gy) % 10 === 0;
                    if (isMajor) {
                        doc.setDrawColor(60);
                        doc.setLineWidth(0.3);
                    } else {
                        doc.setDrawColor(180);
                        doc.setLineWidth(0.1);
                    }
                    doc.line(gridOriginX, cy, gridOriginX + cols * cellSizeMm, cy);
                }

                // Row/column numbers at major gridlines
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(5);
                doc.setFont('helvetica', 'normal');

                for (let gx = 0; gx <= cols; gx += 10) {
                    const num = startX + gx;
                    if (num > 0) {
                        doc.text(num.toString(), gridOriginX + gx * cellSizeMm, gridOriginY - 1.5, { align: 'center' });
                    }
                }

                for (let gy = 0; gy <= rows; gy += 10) {
                    const num = startY + gy;
                    if (num > 0) {
                        doc.text(num.toString(), gridOriginX - 1.5, gridOriginY + gy * cellSizeMm + 1, { align: 'right' });
                    }
                }

                // Reset text color
                doc.setTextColor(0, 0, 0);
            }
        }

        // Save
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
