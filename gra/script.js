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

// === Pobieranie elementów DOM ===
const video = document.getElementById('camera-feed');
const canvas = document.getElementById('canvas');
const predictionText = document.getElementById('prediction');
const btnAddExample0 = document.getElementById('add-example-0');
const btnAddExample1 = document.getElementById('add-example-1');
const btnAddExample2 = document.getElementById('add-example-2');
const btnGuess = document.getElementById('guess-btn');

let classifier;
let mobilenetModel;
const CLASS_NAMES = ["KWADRAT", "KOŁO", "TRÓJKĄT"];

/**
 * Główna funkcja inicjująca, uruchamiana automatycznie.
 */
async function init() {
    predictionText.innerText = "Uruchamianie kamery...";
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play();
    } catch (error) {
        predictionText.innerText = "Błąd dostępu do kamery!";
        return;
    }

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

    // Nasłuchiwanie na przyciski
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

// Uruchomienie aplikacji
init();
