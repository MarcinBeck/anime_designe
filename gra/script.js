document.addEventListener('DOMContentLoaded', () => {
    // Pobieranie elementów DOM
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('canvas');
    const predictionText = document.getElementById('prediction');
    const btnAddExample0 = document.getElementById('add-example-0');
    const btnAddExample1 = document.getElementById('add-example-1');
    const btnAddExample2 = document.getElementById('add-example-2');

    let classifier;
    let mobilenetModel;
    let isPredicting = false;

    /**
     * Główna funkcja inicjująca, uruchamiana po załadowaniu strony.
     */
    async function init() {
        console.log('Inicjalizacja aplikacji...');

        // 1. Wymuś użycie CPU dla lepszej stabilności
        await tf.setBackend('cpu');
        console.log('TensorFlow.js backend ustawiony na CPU.');

        // 2. Uruchom kamerę
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            await video.play();
        } catch (error) {
            console.error("Błąd dostępu do kamery.", error);
            predictionText.innerText = "Błąd dostępu do kamery!";
            return;
        }

        // 3. Załaduj modele AI
        try {
            predictionText.innerText = 'Ładowanie modeli AI...';
            classifier = knnClassifier.create();
            mobilenetModel = await mobilenet.load();
            console.log('Modele AI załadowane, kamera gotowa.');
            predictionText.innerText = 'Pokaż gest i dodaj przykłady...';
        } catch (error) {
            console.error("Błąd ładowania modeli AI.", error);
            predictionText.innerText = "Błąd ładowania modeli AI!";
            return;
        }

        // 4. Ustaw nasłuchiwanie na przyciski
        btnAddExample0.addEventListener('click', () => addExample(0));
        btnAddExample1.addEventListener('click', () => addExample(1));
        btnAddExample2.addEventListener('click', () => addExample(2));

        // 5. Rozpocznij pętlę przewidywania
        isPredicting = true;
        predict();
    }

    /**
     * Dodaje aktualny obraz z kamery jako przykład do nauki.
     */
    function addExample(classId) {
        if (!mobilenetModel) return;

        // Przetwórz obraz z wideo przez model MobileNet
        const features = mobilenetModel.infer(video, true);
        // Dodaj przetworzony obraz (cechy) do klasyfikatora KNN
        classifier.addExample(features, classId);
        
        const friendlyClassName = parseInt(classId) + 1;
        predictionText.innerText = `Dodano przykład dla gestu ${friendlyClassName}!`;
    }

    /**
     * Pętla, która w czasie rzeczywistym odgaduje, co widzi kamera.
     */
    async function predict() {
        if (isPredicting) {
            // Sprawdź, czy model został już czegoś nauczony
            if (classifier.getNumClasses() > 0) {
                // Przetwórz obraz i uzyskaj przewidywanie
                const features = mobilenetModel.infer(video, true);
                const result = await classifier.predictClass(features);
                
                const friendlyClassName = parseInt(result.label) + 1;
                const confidence = Math.round(result.confidences[result.label] * 100);

                predictionText.innerText = `Gest ${friendlyClassName}, pewność: ${confidence}%`;
            }
            // Uruchom tę funkcję ponownie w następnej klatce
            window.requestAnimationFrame(predict);
        }
    }

    // Uruchom całą aplikację
    init();
});
