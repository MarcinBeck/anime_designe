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
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Ustawienie dla wydajności
const overlayCanvas = document.getElementById('overlay-canvas'); // Nowy element
const overlayCtx = overlayCanvas.getContext('2d', { willReadFrequently: true }); // Kontekst dla nakładki

const predictionText = document.getElementById('prediction');
const btnAddExample0 = document.getElementById('add-example-0');
const btnAddExample1 = document.getElementById('add-example-1');
const btnAddExample2 = document.getElementById('add-example-2');
const btnGuess = document.getElementById('guess-btn');

let classifier;
let mobilenetModel;
let faceModel; // Deklaracja modelu do detekcji twarzy
let currentROI; // Obszar zainteresowania dla gestu
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

        // Ustawienie wymiarów canvasów PO uruchomieniu wideo
        overlayCanvas.width = video.videoWidth;
        overlayCanvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

    } catch (error) {
        predictionText.innerText = "Błąd dostępu do kamery!";
        console.error(error);
        return;
    }

    predictionText.innerText = "Ładowanie modeli AI...";
    try {
        classifier = knnClassifier.create();
        mobilenetModel = await mobilenet.load();
        faceModel = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediaPipeFaceMesh); // Ładowanie modelu twarzy
        await loadModel();
    } catch (error) {
        console.error(error);
        predictionText.innerText = "Błąd ładowania modeli AI!";
        return;
    }

    // Uruchamiamy pętlę do predykcji i rysowania ramek
    predictLoop();

    // Nasłuchiwanie na przyciski
    btnAddExample0.addEventListener('click', () => addExample(0));
    btnAddExample1.addEventListener('click', () => addExample(1));
    btnAddExample2.addEventListener('click', () => addExample(2));
    btnGuess.addEventListener('click', guess);
}

/**
 * Główna pętla do wykrywania twarzy i rysowania ramek.
 */
async function predictLoop() {
    if (!video.srcObject) return;

    // Wyczyść canvas nakładki
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    currentROI = null; // Resetujemy obszar zainteresowania

    const faces = await faceModel.estimateFaces({input: video});

    if (faces.length > 0) {
        const faceBox = faces[0].boundingBox;
        
        // Rysuj zieloną ramkę wokół twarzy
        overlayCtx.strokeStyle = 'green';
        overlayCtx.lineWidth = 4;
        overlayCtx.strokeRect(faceBox.xMin, faceBox.yMin, faceBox.width, faceBox.height);
        
        // Oblicz i narysuj niebieską ramkę dla gestu (pod twarzą)
        const roiY = faceBox.yMin + faceBox.height * 0.8;
        const roiHeight = faceBox.height * 1.5;
        const roiWidth = faceBox.width * 1.5;
        const roiX = faceBox.xMin - (roiWidth - faceBox.width) / 2;
        currentROI = { x: roiX, y: roiY, width: roiWidth, height: roiHeight };
        
        overlayCtx.strokeStyle = 'blue';
        overlayCtx.lineWidth = 4;
        overlayCtx.strokeRect(currentROI.x, currentROI.y, currentROI.width, currentROI.height);
    }

    requestAnimationFrame(predictLoop); // Kontynuuj pętlę
}

function getFeaturesFromROI() {
    if (!currentROI || !mobilenetModel) return null;

    // Rysujemy tylko obszar ROI na ukrytym canvasie do inferencji
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, currentROI.x, currentROI.y, currentROI.width, currentROI.height, 0, 0, 224, 224);
    return mobilenetModel.infer(canvas, true);
}


function addExample(classId) {
    // Sprawdzamy, czy currentROI jest dostępne (czy wykryto twarz i gest)
    if (!currentROI) {
        predictionText.innerText = 'Pokaż twarz, aby określić obszar gestu!';
        return;
    }

    const features = getFeaturesFromROI();
    if (features) {
        classifier.addExample(features, classId);
        predictionText.innerText = `Dodano przykład dla: ${CLASS_NAMES[classId]}`;
        saveModel();
    } else {
        predictionText.innerText = 'Nie udało się pobrać cech z obszaru gestu!';
    }
}

async function guess() {
    if (classifier.getNumClasses() > 0) {
        // Sprawdzamy, czy currentROI jest dostępne
        if (!currentROI) {
            predictionText.innerText = 'Pokaż twarz, aby określić obszar gestu!';
            return;
        }

        const features = getFeaturesFromROI();
        if (features) {
            const result = await classifier.predictClass(features);
            const confidence = Math.round(result.confidences[result.label] * 100);
            predictionText.innerText = `To jest: ${CLASS_NAMES[result.label]} (pewność: ${confidence}%)`;
        } else {
            predictionText.innerText = 'Nie udało się pobrać cech z obszaru gestu!';
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
