/**
 * Sheep Vibes - Jokes, facts, and whimsical sheep interactions
 * Because every cross stitch app needs a mascot.
 */

const SheepVibes = (() => {

    const PROCESSING_MESSAGES = [
        'Oita noastra lucreaza din greu la modelul tau...',
        'Beeee! Se calculeaza culorile... aproape gata!',
        'Oita numara pixelii cu grija...',
        'Se potrivesc culorile DMC... oita e foarte atenta!',
        'Beeee-rbecutul sorteaza cusaturile...',
        'O oaie lucratoare e o oaie fericita!',
    ];

    const EXPORT_MESSAGES = [
        'Oita impacheteaza modelul tau...',
        'Se pregateste PDF-ul... beeee!',
        'Oita pune fundita pe pachet...',
        'Aproape gata! Oita verifica ultima cusatura...',
        'Se genereaza PDF-ul cu dragoste de oaie...',
    ];

    let lastIndex = -1;
    let sheepSpeechTimeout = null;

    function getRandomFrom(arr) {
        let idx;
        do {
            idx = Math.floor(Math.random() * arr.length);
        } while (idx === lastIndex && arr.length > 1);
        lastIndex = idx;
        return arr[idx];
    }

    function getProcessingMessage() {
        return getRandomFrom(PROCESSING_MESSAGES);
    }

    function getExportMessage() {
        return getRandomFrom(EXPORT_MESSAGES);
    }

    /**
     * Show a speech bubble from the floating sheep
     */
    function showSheepSpeech(text, duration) {
        const speech = document.getElementById('sheep-speech');
        if (!speech) return;

        if (sheepSpeechTimeout) {
            clearTimeout(sheepSpeechTimeout);
        }

        speech.textContent = text;
        speech.classList.add('visible');

        sheepSpeechTimeout = setTimeout(() => {
            speech.classList.remove('visible');
        }, duration || 4000);
    }

    const SHAUNA_MSG = 'Shauna the sheep, reporting for duty';

    /**
     * Initialize sheep interactions
     */
    function init() {
        // Floating sheep click -> Shauna message
        const sheepImg = document.querySelector('.sheep-float-img');
        if (sheepImg) {
            sheepImg.addEventListener('click', () => {
                showSheepSpeech(SHAUNA_MSG, 4000);
            });
        }

        // Logo sheep click -> Shauna message
        const logoSheep = document.getElementById('logo-sheep');
        if (logoSheep) {
            logoSheep.addEventListener('click', () => {
                showSheepSpeech(SHAUNA_MSG, 4000);
            });
        }

        // Show Shauna greeting after a short delay
        setTimeout(() => {
            showSheepSpeech(SHAUNA_MSG, 5000);
        }, 1500);
    }

    return {
        getProcessingMessage,
        getExportMessage,
        showSheepSpeech,
        init
    };

})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => SheepVibes.init());
