document.addEventListener('DOMContentLoaded', async () => {
    await tf.setBackend('cpu');
    console.log('TensorFlow.js backend ustawiony na CPU.');

    // === Elementy DOM ===
    const gameContainer = document.getElementById('game-container');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const video = document.getElementById('camera-feed');
    const predictionText = document.getElementById('prediction');
    const addExampleButtons = document.querySelectorAll('.learning-module .btn');
    const guessBtn = document.getElementById('guess-btn');
    
    // Canvasy
    const canvas = document.getElementById('canvas'); // Ukryty, do przetwarzania
    const ctx = canvas.getContext('2d');
    const overlayCanvas = document.getElementById('overlay-canvas'); // Widoczny, do rysowania
    const overlayCtx = overlayCanvas.getContext('2d');

    let classifier, mobilenetModel, faceModel, videoStream;
    let currentROI; // Zmienna przechowująca aktualny obszar zainteresowania (ręka)

    const CLASS_NAMES = ["KWADRAT", "KOŁO", "TRÓJKĄT"];
    // Pozostałe zmienne i elementy DOM bez zmian...
    let lastPrediction, lastFeatures;
    let exampleCount = 0;
    const exampleCounterSpan = document.getElementById('example-counter');
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackQuestion = document.getElementById('feedback-question');
    const btnYes = document.getElementById('feedback-yes');
    const btnNo = document.getElementById('feedback-no');
    const correctionPanel = document.getElementById('correction-panel');
    const correctionButtons = document.querySelectorAll('.correction-panel .btn');

    // === GŁÓWNE FUNKCJE APLIKACJI ===
    
    // Inicjalizacja kamery i modeli AI
    async function initCameraAndAI() {
        predictionText.innerText = 'Uruchamianie kamery...';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream = stream;
            video.srcObject = stream;
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    overlayCanvas.width = video.videoWidth;
                    overlayCanvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    resolve();
                };
            });
        } catch (error) { predictionText.innerText = "Błąd dostępu do kamery!"; return; }

        predictionText.innerText = 'Ładowanie modeli AI...';
        try {
            [classifier, mobilenetModel, faceModel] = await Promise.all([
                knnClassifier.create(),
                mobilenet.load(),
                faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediaPipeFaceMesh)
            ]);
            predictionText.innerText = 'Gotowe! Pokaż twarz i gest.';
        } catch (error) { 
            console.error(error);
            predictionText.innerText = "Błąd ładowania modeli AI!";
            return;
        }
        predict();
    }
    
    // Główna pętla, która wykrywa twarz, rysuje ramki i przewiduje gesty
    async function predict() {
        if (!videoStream) return;

        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        const faces = await faceModel.estimateFaces({input: video});
        currentROI = null; // Resetuj ROI w każdej klatce

        if (faces.length > 0) {
            const face = faces[0];
            const faceBox = face.boundingBox;

            // Rysuj zieloną ramkę wokół twarzy
            overlayCtx.strokeStyle = 'green';
            overlayCtx.lineWidth = 4;
            overlayCtx.strokeRect(faceBox.xMin, faceBox.yMin, faceBox.width, faceBox.height);
            
            // Definiuj i rysuj niebieską ramkę dla gestu (obszar pod twarzą)
            const roiY = faceBox.yMin + faceBox.height * 0.8;
            const roiHeight = faceBox.height * 1.5;
            const roiWidth = faceBox.width * 1.5;
            const roiX = faceBox.xMin - (roiWidth - faceBox.width) / 2;

            currentROI = { x: roiX, y: roiY, width: roiWidth, height: roiHeight };
            overlayCtx.strokeStyle = 'blue';
            overlayCtx.lineWidth = 4;
            overlayCtx.strokeRect(currentROI.x, currentROI.y, currentROI.width, currentROI.height);
        }

        window.requestAnimationFrame(predict);
    }
    
    // Funkcja pobierająca cechy obrazu tylko z obszaru zainteresowania (ROI)
    function getFeaturesFromROI() {
        if (!currentROI || !mobilenetModel) return null;
        // Wytnij ROI z wideo i wklej na ukryty canvas
        ctx.drawImage(video, currentROI.x, currentROI.y, currentROI.width, currentROI.height, 0, 0, 224, 224);
        // Przetwórz obraz z canvasu
        return mobilenetModel.infer(canvas, true);
    }

    function addExample(classId) {
        const features = getFeaturesFromROI();
        if (features) {
            classifier.addExample(features, classId);
            exampleCount++;
            updateStats();
            predictionText.innerText = `Dodano przykład dla: ${CLASS_NAMES[classId]}`;
        } else {
            predictionText.innerText = 'Pokaż twarz, aby określić obszar gestu!';
        }
    }

    async function guess() {
        if (classifier.getNumClasses() > 0) {
            const features = getFeaturesFromROI();
            if (features) {
                const result = await classifier.predictClass(features);
                lastPrediction = result;
                lastFeatures = features;
                const confidence = Math.round(result.confidences[result.label] * 100);
                const predictedClass = CLASS_NAMES[result.label];
                feedbackQuestion.innerText = `Czy to jest ${predictedClass}? (pewność: ${confidence}%)`;
                showFeedbackModal(true);
            } else {
                predictionText.innerText = 'Pokaż twarz, aby określić obszar gestu!';
            }
        } else {
            predictionText.innerText = 'Najpierw naucz mnie czegoś!';
        }
    }
    
    // === Pozostałe funkcje (start/stop, feedback, statystyki) ===
    function startGame() { /* ... bez zmian */
        gameContainer.classList.add('game-active');
        initCameraAndAI();
    }
    function stopGame() { /* ... bez zmian */
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        videoStream = null;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        gameContainer.classList.remove('game-active');
        resetGame();
    }
    function resetGame() { /* ... bez zmian */
        if(classifier) classifier.clearAllClasses();
        exampleCount = 0;
        updateStats();
        predictionText.innerText = '...';
    }
    function updateStats() { /* ... bez zmian */
        exampleCounterSpan.innerText = exampleCount;
    }
    function handleFeedback(isCorrect) { /* ... bez zmian */
        if (isCorrect) {
            predictionText.innerText = 'Super! Uczę się dalej.';
            showFeedbackModal(false);
        } else {
            correctionPanel.style.display = 'block';
        }
    }
    function handleCorrection(correctClassId) { /* ... bez zmian */
        const features = getFeaturesFromROI();
        if(features) classifier.addExample(features, correctClassId);
        exampleCount++;
        updateStats();
        predictionText.innerText = `Dzięki! Zapamiętam, że to był ${CLASS_NAMES[correctClassId]}.`;
        showFeedbackModal(false);
    }
    function showFeedbackModal(show) { /* ... bez zmian */
        feedbackModal.classList.toggle('visible', show);
        if(show) correctionPanel.style.display = 'none';
    }

    // === NASŁUCHIWANIE NA ZDARZENIA ===
    startBtn.addEventListener('click', startGame);
    stopBtn.addEventListener('click', stopGame);
    guessBtn.addEventListener('click', guess);
    addExampleButtons.forEach(button => button.addEventListener('click', () => addExample(button.dataset.classId)));
    btnYes.addEventListener('click', () => handleFeedback(true));
    btnNo.addEventListener('click', () => handleFeedback(false));
    correctionButtons.forEach(button => button.addEventListener('click', () => handleCorrection(button.dataset.classId)));
});
