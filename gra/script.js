document.addEventListener('DOMContentLoaded', async () => {
    await tf.setBackend('cpu');
    console.log('TensorFlow.js backend ustawiony na CPU.');

    // === Konfiguracja Firebase (wstaw swoje dane!) ===
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID",
        databaseURL: "YOUR_DATABASE_URL",
    };
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // === Elementy DOM ===
    const gameContainer = document.getElementById('game-container');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const video = document.getElementById('camera-feed');
    const predictionText = document.getElementById('prediction');
    const addExampleButtons = document.querySelectorAll('.learning-module .btn');
    const guessBtn = document.getElementById('guess-btn');
    
    const canvas = document.getElementById('canvas'); 
    const ctx = canvas.getContext('2d');
    const overlayCanvas = document.getElementById('overlay-canvas');
    const overlayCtx = overlayCanvas.getContext('2d');

    let lastPrediction, lastFeatures;
    let exampleCount = 0;
    const exampleCounterSpan = document.getElementById('example-counter');
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackQuestion = document.getElementById('feedback-question');
    const btnYes = document.getElementById('feedback-yes');
    const btnNo = document.getElementById('feedback-no');
    const correctionPanel = document.getElementById('correction-panel');
    const correctionButtons = document.querySelectorAll('.correction-panel .btn');

    let classifier, mobilenetModel, faceModel, videoStream, currentROI;
    const CLASS_NAMES = ["KWADRAT", "KOŁO", "TRÓJKĄT"];

    async function initCameraAndAI() {
        predictionText.innerText = 'Uruchamianie kamery...';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream = stream;
            video.srcObject = stream;
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    // Ustawiamy rozmiar canvasów na WIDOCZNY rozmiar wideo
                    const videoRect = video.getBoundingClientRect();
                    overlayCanvas.width = videoRect.width;
                    overlayCanvas.height = videoRect.height;
                    canvas.width = videoRect.width; // Używany do przetwarzania
                    canvas.height = videoRect.height;
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
            await loadModel();
        } catch (error) { 
            console.error(error);
            predictionText.innerText = "Błąd ładowania modeli AI!";
            return;
        }
        predict();
    }
    
    async function predict() {
        if (!videoStream) return;

        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        const faces = await faceModel.estimateFaces({input: video});
        currentROI = null;

        if (faces.length > 0) {
            // Obliczanie współczynników skalowania
            const scaleX = overlayCanvas.width / video.videoWidth;
            const scaleY = overlayCanvas.height / video.videoHeight;
            
            const faceBoxRaw = faces[0].boundingBox;
            const faceBox = {
                xMin: faceBoxRaw.xMin * scaleX,
                yMin: faceBoxRaw.yMin * scaleY,
                width: faceBoxRaw.width * scaleX,
                height: faceBoxRaw.height * scaleY,
            };

            overlayCtx.strokeStyle = 'green';
            overlayCtx.lineWidth = 4;
            overlayCtx.strokeRect(faceBox.xMin, faceBox.yMin, faceBox.width, faceBox.height);
            
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
    
    function getFeaturesFromROI() {
        if (!currentROI || !mobilenetModel) return null;
        
        // Przelicz ROI z powrotem na oryginalne koordynaty wideo
        const scaleX = video.videoWidth / overlayCanvas.width;
        const scaleY = video.videoHeight / overlayCanvas.height;
        
        const originalRoi = {
            x: currentROI.x * scaleX,
            y: currentROI.y * scaleY,
            width: currentROI.width * scaleX,
            height: currentROI.height * scaleY
        };

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Wytnij z oryginalnego wideo i przeskaluj do 224x224
        ctx.drawImage(video, originalRoi.x, originalRoi.y, originalRoi.width, originalRoi.height, 0, 0, 224, 224);
        return mobilenetModel.infer(canvas, true);
    }

    function addExample(classId) {
        const features = getFeaturesFromROI();
        if (features) {
            classifier.addExample(features, classId);
            exampleCount++;
            updateStats();
            predictionText.innerText = `Dodano przykład dla: ${CLASS_NAMES[classId]}`;
            saveModel();
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
    
    function saveModel() { /* ... bez zmian */ }
    async function loadModel() { /* ... bez zmian */ }
    function startGame() { gameContainer.classList.add('game-active'); initCameraAndAI(); }
    function stopGame() { /* ... bez zmian */ }
    function resetGame() { /* ... bez zmian */ }
    function updateStats() { /* ... bez zmian */ }
    function handleFeedback(isCorrect) { /* ... bez zmian */ }
    function handleCorrection(correctClassId) { /* ... bez zmian */ }
    function showFeedbackModal(show) { /* ... bez zmian */ }

    // === NASŁUCHIWANIE NA ZDARZENIA ===
    // ... bez zmian
});
