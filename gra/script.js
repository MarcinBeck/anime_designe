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

// === Pobieranie elementów DOM ===
const gameContainer = document.getElementById('game-container');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const video = document.getElementById('camera-feed');
const predictionText = document.getElementById('prediction');
const btnAddExample0 = document.getElementById('add-example-0');
const btnAddExample1 = document.getElementById('add-example-1');
const btnAddExample2 = document.getElementById('add-example-2');
const btnGuess = document.getElementById('guess-btn');

let classifier;
let mobilenetModel;
let videoStream; // Zmienna do przechowywania strumienia kamery
const CLASS_NAMES = ["KWADRAT", "KOŁO", "TRÓJKĄT"];

// === Logika detekcji twarzy ===
const MODEL_URL = './models';
let faceApiInterval;

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
]).then(setupApp);

function startVideo() {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                videoStream = stream;
                video.srcObject = stream;
                video.addEventListener('play', resolve);
            })
            .catch(err => {
                console.error("Błąd dostępu do kamery:", err);
                reject(err);
            });
    });
}

function stopVideo() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
    videoStream = null;
    clearInterval(faceApiInterval);
    const canvas = document.querySelector('.game-container-main canvas');
    if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
}

// === Logika klasyfikacji gestów ===
async function initKNN() {
    predictionText.innerText = "Ładowanie modelu gestów...";
    try {
        classifier = knnClassifier.create();
        mobilenetModel = await mobilenet.load();
        await loadModel();
    } catch (error) {
        console.error("Błąd ładowania modelu gestów:", error);
        predictionText.innerText = "Błąd ładowania modeli AI!";
    }
}

function addExample(classId) {
    if (!mobilenetModel) return;
    const features = mobilenetModel.infer(video, true);
    classifier.addExample(features, classId);
    predictionText.innerText = `Dodano przykład dla: ${CLASS_NAMES[classId]}`;
    saveModel();
}

async function guess() {
    if (classifier.getNumClasses() > 0) {
        const features = mobilenetModel.infer(video, true);
        const result = await classifier.predictClass(features);
        const confidence = Math.round(result.confidences[result.label] * 100);
        predictionText.innerText = `To jest: ${CLASS_NAMES[result.label]} (pewność: ${confidence}%)`;
    } else {
        predictionText.innerText = 'Najpierw naucz mnie czegoś!';
    }
}

function saveModel() { /* ... bez zmian */ }
async function loadModel() { /* ... bez zmian */ }

// === Główna konfiguracja aplikacji ===
function setupApp() {
    startBtn.addEventListener('click', async () => {
        gameContainer.classList.add('game-active');
        await startVideo();
        
        const canvas = faceapi.createCanvasFromMedia(video);
        document.querySelector('.game-container-main').append(canvas);
        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvas, displaySize);

        faceApiInterval = setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
        }, 100);

        initKNN();
    });

    stopBtn.addEventListener('click', () => {
        stopVideo();
        gameContainer.classList.remove('game-active');
    });

    // Wklej tutaj pełną zawartość funkcji saveModel i loadModel
}
