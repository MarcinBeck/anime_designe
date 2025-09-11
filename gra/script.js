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
    const video = document.getElementById('camera-feed');
    const predictionText = document.getElementById('prediction');
    const addExampleButtons = document.querySelectorAll('.buttons-group .btn[data-class-id]');
    const guessBtn = document.getElementById('guess-btn');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const overlayCanvas = document.getElementById('overlay-canvas');
    const overlayCtx = overlayCanvas.getContext('2d', { willReadFrequently: true });
    
    let classifier, mobilenetModel, faceModel, videoStream, currentROI;
    const CLASS_NAMES = ["KWADRAT", "KOŁO", "TRÓJKĄT"];

    // === GŁÓWNE FUNKCJE APLIKACJI ===
    
    async function init() {
        gameContainer.classList.add('game-active');
        predictionText.innerText = 'Uruchamianie kamery...';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream = stream;
            video.srcObject = stream;
            
            await new Promise(resolve => {
                video.onloadeddata = () => {
                    // Ustawiamy wymiary canvasów na podstawie WIDOCZNEGO rozmiaru wideo
                    overlayCanvas.width = video.clientWidth;
                    overlayCanvas.height = video.clientHeight;
                    canvas.width = video.clientWidth;
                    canvas.height = video.clientHeight;
                    resolve();
                };
            });
        } catch (error) {
            predictionText.innerText = "Błąd dostępu do kamery!";
            console.error(error);
            return;
        }

        predictionText.innerText = 'Ładowanie modeli AI...';
        try {
            [classifier, mobilenetModel, faceModel] = await Promise.all([
                knnClassifier.create(),
                mobilenet.load(),
                faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediaPipeFaceMesh)
            ]);
            // Nie potrzebujemy już wczytywania modelu z Firebase, więc ta funkcja jest pusta
            // await loadModel(); 
            predictionText.innerText = 'Gotowe! Naucz mnie czegoś.';
        } catch (error) { 
            predictionText.innerText = "Błąd ładowania modeli AI!";
            console.error(error);
            return;
        }
        
        predictLoop();
    }
    
    async function predictLoop() {
        if (!videoStream) return;

        const scaleX = video.clientWidth / video.videoWidth;
        const scaleY = video.clientHeight / video.videoHeight;

        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        const faces = await faceModel.estimateFaces({input: video});
        currentROI = null;

        if (faces.length > 0) {
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
        requestAnimationFrame(predictLoop);
    }
    
    function getFeaturesFromROI() {
        if (!currentROI) return null;
        
        const scaleX = video.videoWidth / video.clientWidth;
        const scaleY = video.videoHeight / video.clientHeight;
        
        const originalRoi = {
            x: currentROI.x * scaleX,
            y: currentROI.y * scaleY,
            width: currentROI.width * scaleX,
            height: currentROI.height * scaleY
        };

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, originalRoi.x, originalRoi.y, originalRoi.width, originalRoi.height, 0, 0, 224, 224);
        return mobilenetModel.infer(canvas, true);
    }

    function addExample(classId) {
        const features = getFeaturesFromROI();
        if (features) {
            classifier.addExample(features, classId);
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
                const confidence = Math.round(result.confidences[result.label] * 100);
                predictionText.innerText = `To jest: ${CLASS_NAMES[result.label]} (pewność: ${confidence}%)`;
            } else {
                predictionText.innerText = 'Pokaż twarz, aby określić obszar gestu!';
            }
        } else {
            predictionText.innerText = 'Najpierw naucz mnie czegoś!';
        }
    }

    startBtn.addEventListener('click', init);
    guessBtn.addEventListener('click', guess);
    addExampleButtons.forEach(button => {
        button.addEventListener('click', () => addExample(button.dataset.classId));
    });
});
