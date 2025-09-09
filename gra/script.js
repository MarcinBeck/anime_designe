document.addEventListener('DOMContentLoaded', () => {
    // === WERSJA DIAGNOSTYCZNA: TESTOWANIE SAMEJ KAMERY ===

    // 1. Pobieranie elementów ze strony
    const gameWrapper = document.getElementById('game-wrapper');
    const startBtn = document.getElementById('start-btn');
    const video = document.getElementById('camera-feed');
    const predictionText = document.getElementById('prediction');

    // 2. Prosta funkcja do uruchomienia kamery
    async function setupCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            predictionText.innerText = "Twoja przeglądarka nie wspiera API kamery.";
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            await video.play();
            console.log("Kamera uruchomiona pomyślnie.");
            predictionText.innerText = "Kamera aktywna.";
        } catch (error) {
            console.error("Błąd dostępu do kamery.", error);
            predictionText.innerText = "Błąd dostępu do kamery. Sprawdź pozwolenia.";
        }
    }

    // 3. Nasłuchiwanie na kliknięcie przycisku START
    startBtn.addEventListener('click', () => {
        console.log("Przycisk START kliknięty.");
        gameWrapper.classList.add('game-active');
        setupCamera(); // Uruchamiamy TYLKO kamerę
    });
});
