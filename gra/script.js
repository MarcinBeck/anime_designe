document.addEventListener('DOMContentLoaded', async () => {
    await tf.setBackend('cpu');
    console.log('TensorFlow.js backend ustawiony na CPU.');

    // === Konfiguracja Firebase (wstaw swoje dane!) ===
    const firebaseConfig = {
        apiKey: "AIzaSyDgnmnrBiqwFuFcEDpKsG_7hP2c8C4t30E",
        authDomain: "guess-game-35a3b.firebaseapp.com",
        databaseURL: "https://guess-5d206-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "guess-game-35a3b",
        storageBucket: "guess-game-35a3b.appspot.com",
        messagingSenderId: "1083984624029",
        appId: "1:1083984624029:web:9e5f5f4b5d2e0a2c3d4f5e"
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
            await loadModel(); 
        } catch (error) { predictionText.innerText = "Błąd ładowania modeli AI!"; }
    }

    function addExample(classId) {
        if (!mobilenetModel) return;
        const features = mobilenetModel.infer(video, true);
        classifier.addExample(features, classId);
        exampleCount++;
        updateStats();
        predictionText.innerText = `Dodano przykład dla: ${CLASS_NAMES[classId]}`;
        saveModel();
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
        saveModel();
    }
    
    function showFeedbackModal(show) {
        feedbackModal.classList.toggle('visible', show);
        if(show) correctionPanel.style.display = 'none';
    }

    // === POPRAWIONE FUNKCJE ZAPISU I WCZYTYWANIA (Z ORYGINALNEGO PROJEKTU) ===
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
            
            // Konwertuj obiekt z powrotem na Tensory, zachowując prawidłowy kształt
            const tensorObj = Object.fromEntries(
                Object.entries(dataset).map(([label, data]) => {
                    const features = data.length / 1024; // MobileNet zawsze produkuje 1024 cechy
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

    // === NASŁUCHIWANIE NA ZDARZENIA ===
    startBtn.addEventListener('click', startGame);
    stopBtn.addEventListener('click', stopGame);
    guessBtn.addEventListener('click', guess);
    
    addExampleButtons.forEach(button => {
        button.addEventListener('click', () => addExample(button.dataset.classId));
    });
    
    btnYes.addEventListener('click', () => handleFeedback(true));
    btnNo.addEventListener('click', () => handleFeedback(false));
    
    correctionButtons.forEach(button => {
        button.addEventListener('click', () => handleCorrection(button.dataset.classId));
    });
});

