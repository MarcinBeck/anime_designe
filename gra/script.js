document.addEventListener('DOMContentLoaded', async () => {
    // POPRAWKA: Wymuszenie użycia CPU, aby uniknąć błędów WebGL na niewspieranym sprzęcie.
    // Ta linijka musi być na samym początku.
    await tf.setBackend('cpu');
    console.log('TensorFlow.js backend ustawiony na CPU.');

    // === Elementy DOM ===
    const gameContainer = document.getElementById('game-container');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const video = document.getElementById('camera-feed');
    const predictionText = document.getElementById('prediction');
    const addExampleButtons = document.querySelectorAll('.buttons-group .btn');

    let classifier;
    let mobilenetModel;
    let isPredicting = false;
    let videoStream;

    // === GŁÓWNE FUNKCJE APLIKACJI ===

    function startGame() {
        console.log('Rozpoczynanie gry...');
        gameContainer.classList.add('game-active');
        initCameraAndAI();
    }

    function stopGame() {
        console.log('Zatrzymywanie gry...');
        isPredicting = false;
        
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        video.srcObject = null;
        
        gameContainer.classList.remove('game-active');
        predictionText.innerText = 'Uruchamianie...';
    }

    async function initCameraAndAI() {
        console.log('Inicjalizacja kamery i AI...');
        predictionText.innerText = 'Uruchamianie kamery...';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream = stream;
            video.srcObject = stream;
            await video.play();
        } catch (error) {
            console.error("Błąd dostępu do kamery.", error);
            predictionText.innerText = "Błąd dostępu do kamery!";
            return;
        }

        predictionText.innerText = 'Ładowanie modeli AI...';

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

        isPredicting = true;
        predict();
    }

    function addExample(classId) {
        if (!mobilenetModel) return;
        const features = mobilenetModel.infer(video, true);
        classifier.addExample(features, classId);
        
        const friendlyClassName = parseInt(classId) + 1;
        predictionText.innerText = `Dodano przykład dla gestu ${friendlyClassName}!`;
    }

    async function predict() {
        if (isPredicting) {
            if (classifier.getNumClasses() > 0) {
                const features = mobilenetModel.infer(video, true);
                const result = await classifier.predictClass(features);
                
                const friendlyClassName = parseInt(result.label) + 1;
                const confidence = Math.round(result.confidences[result.label] * 100);

                predictionText.innerText = `Gest ${friendlyClassName}, pewność: ${confidence}%`;
            }
            window.requestAnimationFrame(predict);
        }
    }

    // === NASŁUCHIWANIE NA ZDARZENIA ===
    startBtn.addEventListener('click', startGame);
    stopBtn.addEventListener('click', stopGame);

    addExampleButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Poprawiony sposób pobierania ID, aby uniknąć problemów z 'add-example-X'
            const classId = e.currentTarget.id.split('-').pop();
            addExample(classId);
        });
    });
});
