document.addEventListener('DOMContentLoaded', () => {
    // === SEKCJA 1: POBIERANIE ELEMENTÓW ZE STRONY (DOM) ===
    const gameWrapper = document.getElementById('game-wrapper');
    const startBtn = document.getElementById('start-btn');
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('canvas'); // Canvas jest potrzebny do przetwarzania obrazu
    const predictionText = document.getElementById('prediction');
    const addExampleButtons = document.querySelectorAll('.learning-module .btn');

    let classifier;
    let mobilenetModel;
    let isPredicting = false;

    // === SEKCJA 2: GŁÓWNE FUNKCJE APLIKACJI ===

    /**
     * Główna funkcja inicjująca. Uruchamia kamerę i ładuje modele AI.
     */
    async function init() {
        console.log('Inicjalizacja...');
        predictionText.innerText = 'Uruchamianie kamery...';
        
        // 1. Uruchom kamerę
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            await video.play(); // Upewnij się, że wideo gra
        } catch (error) {
            console.error("Błąd dostępu do kamery.", error);
            predictionText.innerText = "Błąd dostępu do kamery!";
            return; // Przerwij, jeśli nie ma dostępu do kamery
        }

        predictionText.innerText = 'Ładowanie modeli AI...';

        // 2. Załaduj modele AI (KNN Classifier i MobileNet)
        try {
            classifier = knnClassifier.create();
            mobilenetModel = await mobilenet.load();
            console.log('Modele AI załadowane, kamera gotowa.');
            predictionText.innerText = 'Pokaż gest i dodaj przykłady...';
        } catch (error) {
            console.error("Błąd ładowania modeli AI.", error);
            predictionText.innerText = "Błąd modeli AI!";
            return;
        }

        // 3. Rozpocznij pętlę przewidywania
        isPredicting = true;
        predict();
    }

    /**
     * Dodaje aktualny obraz z kamery jako przykład do nauki dla danej klasy (gestu).
     * @param {string} classId - ID klasy (0, 1, 2, etc.)
     */
    function addExample(classId) {
        if (!mobilenetModel) {
            console.log('Model MobileNet nie jest jeszcze gotowy.');
            return;
        }
        // Pobierz "cechy" obrazu z kamery za pomocą MobileNet
        const features = mobilenetModel.infer(video, true);
        // Dodaj te cechy do klasyfikatora KNN, przypisując je do danej klasy
        classifier.addExample(features, classId);
        
        const friendlyClassName = parseInt(classId) + 1;
        console.log(`Dodano przykład dla klasy ${friendlyClassName}`);
        predictionText.innerText = `Dodano przykład dla gestu ${friendlyClassName}!`;
    }

    /**
     * Pętla, która w czasie rzeczywistym odgaduje, co widzi kamera.
     */
    async function predict() {
        // Kontynuuj tylko jeśli gra jest w trybie przewidywania
        if (isPredicting) {
            // Sprawdź, czy model został już czegoś nauczony
            if (classifier.getNumClasses() > 0) {
                // Pobierz cechy z aktualnego obrazu kamery
                const features = mobilenetModel.infer(video, true);
                // Uzyskaj wynik (przewidywanie) z klasyfikatora KNN
                const result = await classifier.predictClass(features);
                
                const friendlyClassName = parseInt(result.label) + 1;
                const confidence = Math.round(result.confidences[result.label] * 100);

                predictionText.innerText = `Gest ${friendlyClassName}, pewność: ${confidence}%`;
            }
            // Uruchom funkcję ponownie w następnej klatce animacji, tworząc pętlę
            window.requestAnimationFrame(predict);
        }
    }

    // === SEKCJA 3: NASŁUCHIWANIE NA ZDARZENIA (EVENT LISTENERS) ===

    // Reakcja na kliknięcie przycisku START
    startBtn.addEventListener('click', () => {
        gameWrapper.classList.add('game-active'); // Pokazuje kamerę i kontrolki
        init(); // Uruchom kamerę i załaduj AI
    });

    // Reakcja na kliknięcie przycisków "Dodaj przykład"
    addExampleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const classId = button.dataset.classId; // Pobierz ID klasy z atrybutu data-
            addExample(classId);

            // Prosty efekt wizualny po kliknięciu
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 100);
        });
    });

});
