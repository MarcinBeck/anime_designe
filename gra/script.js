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
const video = document.getElementById('camera-feed');
const predictionText = document.getElementById('prediction');
const btnAddExample0 = document.getElementById('add-example-0');
const btnAddExample1 = document.getElementById('add-example-1');
const btnAddExample2 = document.getElementById('add-example-2');
const btnGuess = document.getElementById('guess-btn');

let classifier;
let mobilenetModel;
const CLASS_NAMES = ["KWADRAT", "KOŁO", "TRÓJKĄT"];

// === Logika z oryginalnego face.js z POPRAWIONĄ ŚCIEŻKĄ ===
// Definiujemy poprawną ścieżkę do folderu z modelami
const MODEL_URL = '/anime_designe/gra/models';

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => console.error(err));
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.game-container-main').append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
    }, 100);
});


// === Logika z oryginalnego script.js (do gestów) ===
async function initKNN() {
    predictionText.innerText = "Ładowanie modeli AI...";
    try {
        classifier = knnClassifier.create();
        mobilenetModel = await mobilenet.load();
        await loadModel();
    } catch (error) {
        console.error(error);
        predictionText.innerText = "Błąd ładowania modeli AI!";
        return;
    }
    btnAddExample0.addEventListener('click', () => addExample(0));
    btnAddExample1.addEventListener('click', () => addExample(1));
    btnAddExample2.addEventListener('click', () => addExample(2));
    btnGuess.addEventListener('click', guess);
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
        console.log('Model zapisany.');
    }
}

async function loadModel() {
    predictionText.innerText = "Wczytywanie modelu...";
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
        const exampleCount = Object.values(tensorObj).reduce((sum, tensor) => sum + tensor.shape[0], 0);
        predictionText.innerText = `Model wczytany (${exampleCount} przykładów).`;
    } else {
        predictionText.innerText = "Nie znaleziono modelu. Naucz mnie czegoś!";
    }
}

initKNN();
