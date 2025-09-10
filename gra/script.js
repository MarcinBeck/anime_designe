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
    const saveModelBtn = document.getElementById('save-model-btn');
    const loadModelBtn = document.getElementById('load-model-btn');
    const exampleCounterSpan = document.getElementById('example-counter');
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackQuestion = document.getElementById('feedback-question');
    const btnYes = document.getElementById('feedback-yes');
    const btnNo = document.getElementById('feedback-no');
    const correctionPanel = document.getElementById('correction-panel');
    const correctionButtons = document.querySelectorAll('.correction-panel .btn');

    let classifier, mobilenetModel, videoStream;
    let lastPrediction, lastFeatures;
    let exampleCount = 0;
    const CLASS_NAMES = ["KWADRAT", "KOŁO", "TRÓJKĄT"];

    // === GŁÓWNE FUNKCJE APLIKACJI ===
    function startGame() {
        gameContainer.classList.add('game-active');
        initCameraAndAI();
    }

    function stopGame() {
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        gameContainer.classList.remove('game-active');
        resetGame();
    }
    
    function resetGame() {
        if(classifier) classifier.clearAllClasses();
        exampleCount = 0;
        updateStats();
        predictionText.innerText = '...';
    }
    
    function updateStats() {
        exampleCounterSpan.innerText = exampleCount;
    }

    async function initCameraAndAI() {
        predictionText.innerText = 'Uruchamianie kamery...';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream = stream;
            video.srcObject = stream;
            await video.play();
        } catch (error) { predictionText.innerText = "Błąd dostępu do kamery!"; return; }

        predictionText.innerText = 'Ładowanie modeli AI...';
        try {
            classifier = knnClassifier.create();
            mobilenetModel = await mobilenet.load();
            predictionText.innerText = 'Gotowe! Naucz mnie czegoś lub wczytaj model.';
        } catch (error) { predictionText.innerText = "Błąd ładowania modeli AI!"; }
    }

    function addExample(classId) {
        if (!mobilenetModel) return;
        const features = mobilenetModel.infer(video, true);
        classifier.addExample(features, classId);
        exampleCount++;
        updateStats();
        predictionText.innerText = `Dodano przykład dla: ${CLASS_NAMES[classId]}`;
    }

    async function guess() {
        if (classifier.getNumClasses() > 0) {
            const features = mobilenetModel.infer(video, true);
            const result = await classifier.predictClass(features);
            
            lastPrediction = result;
            lastFeatures = features;

            const confidence = Math.round(result.confidences[result.label] * 100);
            const predictedClass = CLASS_NAMES[result.label];

            feedbackQuestion.innerText = `Czy to jest ${predictedClass}? (pewność: ${confidence}%)`;
            showFeedbackModal(true);
        } else {
            predictionText.innerText = 'Najpierw naucz mnie czegoś lub wczytaj model!';
        }
    }
    
    function handleFeedback(isCorrect) {
        if (isCorrect) {
            predictionText.innerText = 'Super! Uczę się dalej.';
            showFeedbackModal(false);
        } else {
            correctionPanel.style.display = 'block';
        }
    }
    
    function handleCorrection(correctClassId) {
        classifier.addExample(lastFeatures, correctClassId);
        exampleCount++;
        updateStats();
        predictionText.innerText = `Dzięki! Zapamiętam, że to był ${CLASS_NAMES[correctClassId]}.`;
        showFeedbackModal(false);
    }
    
    function showFeedbackModal(show) {
        feedbackModal.classList.toggle('visible', show);
        if(show) correctionPanel.style.display = 'none';
    }

    // === NOWE FUNKCJE ZAPISU I WCZYTYWANIA ===
    function saveModel() {
        if (classifier.getNumClasses() > 0) {
            // Konwertuj dane modelu na format, który można zapisać w Firebase
            const dataset = classifier.getClassifierDataset();
            const datasetObj = {};
            Object.keys(dataset).forEach((key) => {
                const data = dataset[key].dataSync();
                // Konwertuj Float32Array na zwykłą tablicę
                datasetObj[key] = Array.from(data);
            });
            const jsonStr = JSON.stringify(datasetObj);
            
            // Zapisz w Firebase Realtime Database
            database.ref('models/knn-model').set(jsonStr);
            predictionText.innerText = 'Model został zapisany w chmurze!';
        } else {
            predictionText.innerText = 'Nie można zapisać pustego modelu!';
        }
    }

    async function loadModel() {
        predictionText.innerText = 'Wczytywanie modelu z chmury...';
        const snapshot = await database.ref('models/knn-model').get();
        const jsonStr = snapshot.val();

        if (jsonStr) {
            const dataset = JSON.parse(jsonStr);
            const tensorObj = {};
            let totalExamples = 0;
            
            // Konwertuj dane z powrotem na Tensory
            Object.keys(dataset).forEach((key) => {
                const tensor = tf.tensor(dataset[key]);
                tensorObj[key] = tensor;
                totalExamples += tensor.shape[0];
            });

            classifier.setClassifierDataset(tensorObj);
            exampleCount = totalExamples;
            updateStats();
            predictionText.innerText = `Model wczytany! (zawiera ${exampleCount} przykładów)`;
        } else {
            predictionText.innerText = 'W chmurze nie znaleziono zapisanego modelu.';
        }
    }

    // === NASŁUCHIWANIE NA ZDARZENIA ===
    startBtn.addEventListener('click', startGame);
    stopBtn.addEventListener('click', stopGame);
    guessBtn.addEventListener('click', guess);
    saveModelBtn.addEventListener('click', saveModel);
    loadModelBtn.addEventListener('click', loadModel);
    
    addExampleButtons.forEach(button => {
        button.addEventListener('click', () => addExample(button.dataset.classId));
    });
    
    btnYes.addEventListener('click', () => handleFeedback(true));
    btnNo.addEventListener('click', () => handleFeedback(false));
    
    correctionButtons.forEach(button => {
        button.addEventListener('click', () => handleCorrection(button.dataset.classId));
    });
});
