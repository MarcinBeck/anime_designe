document.addEventListener('DOMContentLoaded', () => {
    // === Elementy DOM gry i kamery ===
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('canvas');
    const predictionText = document.getElementById('prediction');
    const messageEl = document.querySelector('.message');
    const scoreEl = document.querySelector('.score');
    const highscoreEl = document.querySelector('.highscore');
    const guessInput = document.querySelector('.guess-input');
    const form = document.querySelector('.game-form');
    const againBtn = document.querySelector('.again-btn');
    
    let model;

    // === Konfiguracja Firebase (wstaw swoje dane) ===
    const firebaseConfig = {
        apiKey: "AIzaSyDgnmnrBiqwFuFcEDpKsG_7hP2c8C4t30E",
        authDomain: "guess-game-35a3b.firebaseapp.com",
        databaseURL: "https://guess-5d206-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "guess-game-35a3b",
        storageBucket: "guess-game-35a3b.appspot.com",
        messagingSenderId: "1083984624029",
        appId: "1:1083984624029:web:9e5f5f4b5d2e0a2c3d4f5e"
    };

    // Inicjalizacja Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // === Logika kamery i AI (Coco-SSD) ===
    if (canvas && video) {
        const ctx = canvas.getContext('2d');

        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
            } catch (error) {
                console.error("Błąd dostępu do kamery.", error);
                predictionText.innerText = "Nie można uzyskać dostępu do kamery.";
            }
        }

        async function predict() {
            if (model && video.readyState === 4) {
                ctx.drawImage(video, 0, 0, 224, 224); // Rysuj klatkę na canvas
                const predictions = await model.detect(canvas);
                
                if (predictions.length > 0) {
                    const detectedObjects = predictions.map(p => p.class).join(', ');
                    predictionText.innerText = `Widzę: ${detectedObjects}`;
                } else {
                    predictionText.innerText = 'Nic nie wykryto...';
                }
            }
            requestAnimationFrame(predict);
        }

        async function initAI() {
            await setupCamera();
            video.addEventListener('loadeddata', async () => {
                model = await cocoSsd.load();
                predict();
            });
        }
        initAI();
    } else {
        console.error("Brak elementu video lub canvas na stronie!");
    }

    // === Logika gry w zgadywanie ===
    let secretNumber, score, highscore;

    const initGame = () => {
        secretNumber = Math.trunc(Math.random() * 100) + 1;
        score = 10;
        scoreEl.textContent = score;
        messageEl.textContent = 'Zacznij zgadywać...';
        guessInput.value = '';
        guessInput.disabled = false;
        form.querySelector('button').disabled = false;
        againBtn.style.display = 'none';
        document.querySelector('.game-content').style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
    };
    
    database.ref('highscore').on('value', (snapshot) => {
        highscore = snapshot.val() || 0;
        highscoreEl.textContent = highscore;
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const guess = Number(guessInput.value);

        if (!guess || guess < 1 || guess > 100) {
            messageEl.textContent = '⛔️ Wpisz liczbę od 1 do 100!';
        } else if (guess === secretNumber) {
            messageEl.textContent = '🎉 Wygrałeś!';
            if (score > highscore) {
                highscore = score;
                highscoreEl.textContent = highscore;
                database.ref('highscore').set(highscore);
            }
            guessInput.disabled = true;
            form.querySelector('button').disabled = true;
            againBtn.style.display = 'inline-block';
            document.querySelector('.game-content').style.backgroundColor = 'rgba(96, 179, 71, 0.85)'; // Zielony
        } else if (guess !== secretNumber) {
            if (score > 1) {
                messageEl.textContent = guess > secretNumber ? '📈 Za wysoko!' : '📉 Za nisko!';
                score--;
                scoreEl.textContent = score;
            } else {
                messageEl.textContent = '💥 Przegrałeś!';
                scoreEl.textContent = 0;
                guessInput.disabled = true;
                form.querySelector('button').disabled = true;
                againBtn.style.display = 'inline-block';
                document.querySelector('.game-content').style.backgroundColor = 'rgba(255, 107, 107, 0.85)'; // Czerwony
            }
        }
    });

    againBtn.addEventListener('click', initGame);

    // Inicjalizacja gry przy pierwszym załadowaniu
    initGame();
});

