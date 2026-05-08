/**
 * App Controller
 * Wires up the UI, handles step navigation, image upload, and user interactions.
 */

(function () {
    'use strict';

    // ---- State ----
    let uploadedImage = null;
    let currentPattern = null;

    // ---- DOM refs ----
    const steps = document.querySelectorAll('.step-indicator');
    const panels = document.querySelectorAll('.step-panel');

    const uploadArea = document.getElementById('upload-area');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const btnChangeImage = document.getElementById('btn-change-image');
    const btnToStep2 = document.getElementById('btn-to-step2');

    const widthCmInput = document.getElementById('width-cm');
    const heightCmInput = document.getElementById('height-cm');
    const lockDimCheckbox = document.getElementById('lock-dimension');
    const fabricCountSelect = document.getElementById('fabric-count');
    const maxColorsSlider = document.getElementById('max-colors');
    const colorCountDisplay = document.getElementById('color-count-display');
    const gridSizeDisplay = document.getElementById('grid-size-display');
    const totalStitchesDisplay = document.getElementById('total-stitches-display');
    const btnBackTo1 = document.getElementById('btn-back-to-1');
    const btnToStep3 = document.getElementById('btn-to-step3');

    const processingIndicator = document.getElementById('processing-indicator');
    const processingText = document.getElementById('processing-text');
    const previewCanvas = document.getElementById('preview-canvas');
    const previewSummary = document.getElementById('preview-summary');
    const previewThreadList = document.getElementById('preview-thread-list');
    const btnBackTo2 = document.getElementById('btn-back-to-2');
    const btnToStep4 = document.getElementById('btn-to-step4');

    const patternCanvas = document.getElementById('pattern-canvas');
    const patternWrapper = document.getElementById('pattern-canvas-wrapper');
    const legendContent = document.getElementById('legend-content');
    const viewButtons = document.querySelectorAll('[data-view]');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomFitBtn = document.getElementById('zoom-fit');
    const zoomLevelDisplay = document.getElementById('zoom-level');
    const btnBackTo3 = document.getElementById('btn-back-to-3');
    const btnToStep5 = document.getElementById('btn-to-step5');

    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    const btnDownloadPng = document.getElementById('btn-download-png');
    const exportProgress = document.getElementById('export-progress');
    const exportText = document.getElementById('export-text');
    const btnBackTo4 = document.getElementById('btn-back-to-4');
    const btnStartOver = document.getElementById('btn-start-over');

    // ---- Step Navigation ----

    function goToStep(stepNum) {
        steps.forEach((s, i) => {
            s.classList.remove('active');
            if (i + 1 < stepNum) s.classList.add('completed');
            else s.classList.remove('completed');
            if (i + 1 === stepNum) s.classList.add('active');
        });

        panels.forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`step-${stepNum}`);
        if (panel) panel.classList.add('active');

        // Sheep reacts to step changes
        if (typeof SheepVibes !== 'undefined') {
            const stepJokes = {
                2: 'Beeee! Hai sa configuram modelul!',
                3: SheepVibes.getProcessingMessage(),
                4: 'Uau! Ce model frumos! Oita e impresionata!',
                5: 'Aproape gata! Hai sa exportam capodopera!'
            };
            if (stepJokes[stepNum]) {
                setTimeout(() => SheepVibes.showSheepSpeech(stepJokes[stepNum], 4000), 500);
            }
        }
    }

    // ---- Step 1: Upload ----

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                uploadedImage = img;
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
                uploadPlaceholder.classList.add('hidden');
                btnChangeImage.style.display = '';
                btnToStep2.disabled = false;
                updateGridInfo();

                if (typeof SheepVibes !== 'undefined') {
                    SheepVibes.showSheepSpeech('Beeee! Ce imagine frumoasa! Hai sa o transformam!', 3500);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    uploadArea.addEventListener('click', (e) => {
        if (e.target !== btnChangeImage) {
            fileInput.click();
        }
    });

    btnChangeImage.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    btnToStep2.addEventListener('click', () => goToStep(2));

    // ---- Step 2: Configure ----

    function updateGridInfo() {
        if (!uploadedImage) return;

        const fabricCount = parseInt(fabricCountSelect.value);
        const widthCm = parseFloat(widthCmInput.value) || 20;
        const lockWidth = lockDimCheckbox.checked;

        const { gridW, gridH } = PatternEngine.calculateGridSize(
            widthCm,
            parseFloat(heightCmInput.value) || 20,
            fabricCount,
            uploadedImage.naturalWidth,
            uploadedImage.naturalHeight,
            lockWidth
        );

        gridSizeDisplay.textContent = `${gridW} x ${gridH} cusaturi`;
        totalStitchesDisplay.textContent = (gridW * gridH).toLocaleString();

        // Update the locked dimension display
        const stitchesPerCm = fabricCount / 2.54;
        if (lockWidth) {
            const autoHeight = (gridH / stitchesPerCm).toFixed(1);
            heightCmInput.value = autoHeight;
        } else {
            const autoWidth = (gridW / stitchesPerCm).toFixed(1);
            widthCmInput.value = autoWidth;
        }
    }

    widthCmInput.addEventListener('input', updateGridInfo);
    heightCmInput.addEventListener('input', updateGridInfo);
    fabricCountSelect.addEventListener('change', updateGridInfo);

    lockDimCheckbox.addEventListener('change', () => {
        if (lockDimCheckbox.checked) {
            widthCmInput.disabled = false;
            heightCmInput.disabled = true;
        } else {
            widthCmInput.disabled = true;
            heightCmInput.disabled = false;
        }
        updateGridInfo();
    });

    maxColorsSlider.addEventListener('input', () => {
        colorCountDisplay.textContent = maxColorsSlider.value;
    });

    btnBackTo1.addEventListener('click', () => goToStep(1));

    btnToStep3.addEventListener('click', () => {
        goToStep(3);
        generatePattern();
    });

    // ---- Step 3: Preview / Generate ----

    function generatePattern() {
        processingIndicator.classList.remove('hidden');
        previewCanvas.style.display = 'none';

        // Rotate processing messages
        if (processingText && typeof SheepVibes !== 'undefined') {
            processingText.textContent = SheepVibes.getProcessingMessage();
        }

        // Use setTimeout to let the UI update before heavy processing
        setTimeout(() => {
            try {
                const options = {
                    widthCm: parseFloat(widthCmInput.value) || 20,
                    heightCm: parseFloat(heightCmInput.value) || 20,
                    fabricCount: parseInt(fabricCountSelect.value),
                    maxColors: parseInt(maxColorsSlider.value),
                    lockWidth: lockDimCheckbox.checked
                };

                currentPattern = PatternEngine.generatePattern(uploadedImage, options);

                // Render preview
                PatternRenderer.renderPreview(previewCanvas, currentPattern);
                previewCanvas.style.display = '';

                // Render summary & thread list
                PatternRenderer.renderSummary(previewSummary, currentPattern);
                PatternRenderer.renderLegend(previewThreadList, currentPattern);

                processingIndicator.classList.add('hidden');

                if (typeof SheepVibes !== 'undefined') {
                    SheepVibes.showSheepSpeech('Beeee! Modelul e gata! Arata super!', 3500);
                }
            } catch (err) {
                console.error('Pattern generation failed:', err);
                processingIndicator.innerHTML = `<p style="color:#c73866">Eroare la generarea modelului. Incearca o alta imagine sau alte setari.</p>`;
            }
        }, 50);
    }

    btnBackTo2.addEventListener('click', () => goToStep(2));

    btnToStep4.addEventListener('click', () => {
        goToStep(4);
        // Small delay to ensure the panel is visible and has dimensions
        requestAnimationFrame(() => renderFullPattern());
    });

    // ---- Step 4: Full Pattern ----

    function renderFullPattern() {
        if (!currentPattern) return;

        // Fit to container
        const wrapperRect = patternWrapper.getBoundingClientRect();
        const zoom = PatternRenderer.zoomFit(
            patternCanvas, currentPattern,
            wrapperRect.width, wrapperRect.height
        );
        updateZoomDisplay(zoom);

        // Render legend
        PatternRenderer.renderLegend(legendContent, currentPattern);
    }

    function updateZoomDisplay(zoom) {
        zoomLevelDisplay.textContent = Math.round(zoom * 100) + '%';
    }

    // View mode buttons
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            PatternRenderer.setViewMode(patternCanvas, currentPattern, btn.dataset.view);
        });
    });

    // Zoom controls
    zoomInBtn.addEventListener('click', () => {
        const zoom = PatternRenderer.zoomIn(patternCanvas, currentPattern);
        updateZoomDisplay(zoom);
    });

    zoomOutBtn.addEventListener('click', () => {
        const zoom = PatternRenderer.zoomOut(patternCanvas, currentPattern);
        updateZoomDisplay(zoom);
    });

    zoomFitBtn.addEventListener('click', () => {
        const wrapperRect = patternWrapper.getBoundingClientRect();
        const zoom = PatternRenderer.zoomFit(
            patternCanvas, currentPattern,
            wrapperRect.width, wrapperRect.height
        );
        updateZoomDisplay(zoom);
    });

    // Mouse wheel zoom
    patternWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            const zoom = PatternRenderer.zoomIn(patternCanvas, currentPattern);
            updateZoomDisplay(zoom);
        } else {
            const zoom = PatternRenderer.zoomOut(patternCanvas, currentPattern);
            updateZoomDisplay(zoom);
        }
    }, { passive: false });

    btnBackTo3.addEventListener('click', () => goToStep(3));
    btnToStep5.addEventListener('click', () => goToStep(5));

    // ---- Step 5: Export ----

    btnDownloadPdf.addEventListener('click', async () => {
        if (!currentPattern) return;
        exportProgress.classList.remove('hidden');
        btnDownloadPdf.disabled = true;

        if (exportText && typeof SheepVibes !== 'undefined') {
            exportText.textContent = SheepVibes.getExportMessage();
        }

        try {
            await PdfExport.generatePDF(currentPattern, 'Model Cross Stitch');
            if (typeof SheepVibes !== 'undefined') {
                SheepVibes.showSheepSpeech('Beeee! PDF-ul e gata! Cusaturi fericite!', 4000);
            }
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('Exportul PDF a esuat. Te rog incearca din nou.');
        } finally {
            exportProgress.classList.add('hidden');
            btnDownloadPdf.disabled = false;
        }
    });

    btnDownloadPng.addEventListener('click', () => {
        if (!currentPattern) return;

        // Generate high-res PNG
        const tempCanvas = document.createElement('canvas');
        PatternRenderer.renderPattern(tempCanvas, currentPattern, 'combined', 1);

        const link = document.createElement('a');
        link.download = 'model-cross-stitch.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();

        if (typeof SheepVibes !== 'undefined') {
            SheepVibes.showSheepSpeech('Beeee! PNG salvat! Arata minunat!', 3500);
        }
    });

    btnBackTo4.addEventListener('click', () => goToStep(4));

    btnStartOver.addEventListener('click', () => {
        // Reset state
        uploadedImage = null;
        currentPattern = null;
        imagePreview.classList.add('hidden');
        imagePreview.src = '';
        uploadPlaceholder.classList.remove('hidden');
        btnChangeImage.style.display = 'none';
        btnToStep2.disabled = true;
        fileInput.value = '';

        goToStep(1);

        if (typeof SheepVibes !== 'undefined') {
            SheepVibes.showSheepSpeech('Hai iar de la capat! Oita e gata de treaba!', 3500);
        }
    });

    // ---- Pre-load jsPDF in background ----
    PdfExport.loadJsPDF().catch(() => {
        // Silent fail; will retry when user clicks export
    });

})();
