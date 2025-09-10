document.addEventListener('DOMContentLoaded', () => {
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
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
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
        await tf.setBackend('cpu');
        predictionText.innerText = 'Uruchamianie kamery...';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream = stream;
            video.srcObject = stream;
            await video.play();
        } catch (error) {
            predictionText.innerText = "Błąd dostępu do kamery!";
            return;
        }

        predictionText.innerText = 'Ładowanie modeli AI...';
        try {
            classifier = knnClassifier.create();
            mobilenetModel = await mobilenet.load();
            predictionText.innerText = 'Gotowe! Naucz mnie czegoś.';
        } catch (error) {
            predictionText.innerText = "Błąd ładowania modeli AI!";
        }
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
            predictionText.innerText = 'Najpierw naucz mnie czegoś!';
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
        if (show) {
            feedbackModal.classList.add('visible');
            correctionPanel.style.display = 'none';
        } else {
            feedbackModal.classList.remove('visible');
        }
    }

    // === NASŁUCHIWANIE NA ZDARZENIA ===
    startBtn.addEventListener('click', startGame);
    stopBtn.addEventListener('click', stopGame);
    
    addExampleButtons.forEach(button => {
        button.addEventListener('click', () => addExample(button.dataset.classId));
    });
    
    guessBtn.addEventListener('click', guess);
    
    btnYes.addEventListener('click', () => handleFeedback(true));
    btnNo.addEventListener('click', () => handleFeedback(false));
    
    correctionButtons.forEach(button => {
        button.addEventListener('click', () => handleCorrection(button.dataset.classId));
    });
});
