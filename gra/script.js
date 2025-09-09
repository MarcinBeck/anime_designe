document.addEventListener('DOMContentLoaded', async () => {
    // === NOWA LINIA: Wymuszenie użycia CPU zamiast WebGL (karty graficznej) ===
    await tf.setBackend('cpu');
    console.log('TensorFlow.js backend set to CPU.');

    // === Elementy DOM ===
    const gameWrapper = document.getElementById('game-wrapper');
    const startBtn = document.getElementById('start-btn');
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('canvas');
    const predictionText = document.getElementById('prediction');
    const addExampleButtons = document.querySelectorAll('.learning-module .btn');

    let classifier;
    let mobilenetModel;
    let isPredicting = false;

    // === GŁÓWNA FUNKCJA INICJUJĄCA ===
    async function init() {
        console.log('Inicjalizacja...');
        predictionText.innerText = 'Uruchamianie kamery...';
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            await video.play();
        } catch (error) {
            console.error("Błąd dostępu do kamery.", error);
            predictionText.innerText = "Błąd kamery!";
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

    // === FUNKCJA DODAJĄCA PRZYKŁADY DO NAUKI ===
    function addExample(classId) {
        if (!mobilenetModel) {
            console.log('Model MobileNet nie jest załadowany.');
            return;
        }
        const features = mobilenetModel.infer(video, true);
        classifier.addExample(features, classId);
        
        const friendlyClassName = parseInt(classId) + 1;
        console.log(`Dodano przykład dla klasy ${friendlyClassName}`);
        predictionText.innerText = `Dodano przykład dla gestu ${friendlyClassName}!`;
    }

    // === FUNKCJA PRZEWIDUJĄCA GEST ===
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
    startBtn.addEventListener('click', () => {
        gameWrapper.classList.add('game-active');
        init();
    });

    addExampleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const classId = button.dataset.classId;
            addExample(classId);

            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 100);
        });
    });

});
