document.addEventListener('DOMContentLoaded', async () => {
    // Ta funkcja jest gwarancją, że cały poniższy kod uruchomi się
    // dopiero po załadowaniu wszystkich elementów HTML na stronie.

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
    
    // Canvasy
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const overlayCanvas = document.getElementById('overlay-canvas');
    const overlayCtx = overlayCanvas.getContext('2d');

    // Pozostałe elementy DOM
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

    // === GŁÓWNE FUNKCJE APLIKACJI ===
    
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
            const faceBox = faces[0].boundingBox;
            overlayCtx.strokeStyle = 'green';
            overlayCtx.lineWidth = 4;
            overlayCtx.strokeRect(faceBox.xMin, faceBox.yMin, faceBox.width, faceBox.height);
            
            const roiY = faceBox.yMin + faceBox.height * 0.8;
            const roiHeight = faceBox.height * 1.5;
            const roiWidth = faceBox.width * 1.5;
            const roiX = faceBox.xMin - (roiWidth - faceBox.width) / 2;
            currentROI = { x: roiX, y: roiY, width: roiWidth, height: roiHeight };
            overlayCtx.strokeStyle = 'blue';
            overlayCtx.strokeRect(currentROI.x, currentROI.y, currentROI.width, currentROI.height);
        }
        window.requestAnimationFrame(predict);
    }
    
    function getFeaturesFromROI() {
        if (!currentROI || !mobilenetModel) return null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, currentROI.x, currentROI.y, currentROI.width, currentROI.height, 0, 0, 224, 224);
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
    
    function saveModel() {
        if (classifier.getNumClasses() > 0) {
            const dataset = classifier.getClassifierDataset();
            const datasetObj = {};
            Object.keys(dataset).forEach((key) => {
                const data = dataset[key].dataSync();
                datasetObj[key] = Array.from(data);
            });
            const jsonStr = JSON.stringify(datasetObj);
            database.ref('models/knn-model').set(jsonStr);
            console.log('Model zapisany w chmurze.');
        }
    }

    async function loadModel() {
        predictionText.innerText = 'Wczytywanie modelu z chmury...';
        const snapshot = await database.ref('models/knn-model').get();
        const jsonStr = snapshot.val();
        if (jsonStr) {
            const dataset = JSON.parse(jsonStr);
            const tensorObj = Object.fromEntries(
                Object.entries(dataset).map(([label, data]) => {
                    const features = data.length / 1024;
                    return [label, tf.tensor2d(data, [features, 1024])];
                })
            );
            classifier.setClassifierDataset(tensorObj);
            exampleCount = Object.values(tensorObj).reduce((sum, tensor) => sum + tensor.shape[0], 0);
            updateStats();
            predictionText.innerText = `Model wczytany! (${exampleCount} przykładów). Ucz dalej lub zgaduj.`;
        } else {
            predictionText.innerText = 'Nie znaleziono zapisanego modelu. Naucz mnie czegoś!';
        }
    }
    
    function startGame() { gameContainer.classList.add('game-active'); initCameraAndAI(); }
    function stopGame() {
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        video.srcObject = null; videoStream = null;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        gameContainer.classList.remove('game-active');
        resetGame();
    }
    function resetGame() { if(classifier) classifier.clearAllClasses(); exampleCount = 0; updateStats(); predictionText.innerText = '...'; }
    function updateStats() { if(exampleCounterSpan) exampleCounterSpan.innerText = exampleCount; }
    function handleFeedback(isCorrect) {
        if (isCorrect) {
            predictionText.innerText = 'Super! Uczę się dalej.';
            showFeedbackModal(false);
        } else { correctionPanel.style.display = 'block'; }
    }
    function handleCorrection(correctClassId) {
        const features = getFeaturesFromROI();
        if(features) classifier.addExample(features, correctClassId);
        exampleCount++; updateStats();
        predictionText.innerText = `Dzięki! Zapamiętam, że to był ${CLASS_NAMES[correctClassId]}.`;
        showFeedbackModal(false);
        saveModel();
    }
    function showFeedbackModal(show) {
        if(feedbackModal) feedbackModal.classList.toggle('visible', show);
        if(show && correctionPanel) correctionPanel.style.display = 'none';
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
