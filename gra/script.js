'use strict';

window.addEventListener('DOMContentLoaded', () => {
    console.log('KROK 1: Strona załadowana (DOMContentLoaded). Skrypt startuje.');

    // === POBIERANIE ELEMENTÓW DOM ===
    const loader = document.getElementById('loader');
    const loaderStatus = document.getElementById('loader-status');
    const contentWrapper = document.querySelector('.content-wrapper');
    const authContainer = document.getElementById('auth-container');
    const cameraToggleBtn = document.getElementById('camera-toggle-btn');
    const symbolSection = document.querySelector('.symbol-section');
    const classButtons = document.querySelectorAll('.classes button');
    const predictBtn = document.getElementById('predictBtn');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const gallery = document.getElementById('gallery');
    const statusEl = document.getElementById('status');
    const predictionEl = document.getElementById('prediction');
    const clearBtn = document.getElementById('clearBtn');
    const overlay = document.getElementById('overlay');
    const overlayCtx = overlay.getContext('2d');
    const feedbackContainer = document.getElementById('feedback-container');

    let currentUser = null;
    let currentStream = null;
    let classifier;
    let net;
    const classNames = ["KOŁO", "KWADRAT", "TRÓJKĄT"];
    let blazeFaceModel;
    let detectionIntervalId = null;
    let lastDetectedFace = null;
    let isCameraOn = false;

    // === FUNKCJE AI i KAMERY ===
    const tensorToJSON = (tensor) => Array.from(tensor.dataSync());

    async function loadModels() {
      console.log('KROK 3: Rozpoczynam ładowanie modeli AI...');
      loaderStatus.textContent = "Ładowanie modeli AI...";
      try {
        const mobilenetPromise = mobilenet.load();
        const blazefacePromise = blazeface.load();

        console.log('KROK 3a: Oczekuję na załadowanie MobileNet...');
        net = await mobilenetPromise;
        console.log('KROK 3b: MobileNet załadowany.');

        console.log('KROK 3c: Oczekuję na załadowanie BlazeFace...');
        blazeFaceModel = await blazefacePromise;
        console.log('KROK 3d: BlazeFace załadowany.');

        classifier = knnClassifier.create();
        console.log('KROK 4: Wszystkie modele AI załadowane pomyślnie.');
        return true;
      } catch (e) {
        loaderStatus.textContent = "Błąd krytyczny ładowania modeli AI.";
        console.error("Błąd ładowania modeli:", e);
        return false;
      }
    }

    // Pozostałe funkcje (runDetectionLoop, startCamera, etc.) bez zmian
    async function runDetectionLoop() {
        if (isCameraOn && blazeFaceModel && !video.paused && !video.ended) {
            const faces = await blazeFaceModel.estimateFaces(video, false);
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            
            if (faces.length > 0) {
                lastDetectedFace = faces[0];
                const start = lastDetectedFace.topLeft;
                const end = lastDetectedFace.bottomRight;
                const size = [end[0] - start[0], end[1] - start[1]];
                overlayCtx.strokeStyle = '#c2185b';
                overlayCtx.lineWidth = 4;
                overlayCtx.strokeRect(start[0], start[1], size[0], size[1]);
                
                if (feedbackContainer.innerHTML === '') {
                    classButtons.forEach(btn => btn.disabled = false);
                    predictBtn.disabled = false;
                }
            } else {
                lastDetectedFace = null;
                classButtons.forEach(btn => btn.disabled = true);
                predictBtn.disabled = true;
            }
            detectionIntervalId = setTimeout(runDetectionLoop, 200);
        }
    }

    function startCamera() {
      cameraToggleBtn.disabled = true;
      cameraToggleBtn.textContent = 'Ładowanie...';
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          currentStream = stream;
          video.srcObject = stream;
          video.play();
          video.addEventListener('loadeddata', () => {
              overlay.width = video.videoWidth;
              overlay.height = video.videoHeight;
              runDetectionLoop();
          });
          isCameraOn = true;
          cameraToggleBtn.textContent = 'Stop kamera';
          cameraToggleBtn.disabled = false;
          symbolSection.classList.remove('hidden');
        }).catch(err => {
            showToast(`Błąd kamery: ${err.message}`, 'error');
            cameraToggleBtn.textContent = 'Start kamera';
            cameraToggleBtn.disabled = false;
        });
    }

    function stopCamera() {
      if (detectionIntervalId) { clearTimeout(detectionIntervalId); detectionIntervalId = null; }
      if (currentStream) { currentStream.getTracks().forEach(track => track.stop()); currentStream = null; }
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      isCameraOn = false;
      cameraToggleBtn.textContent = 'Start kamera';
      cameraToggleBtn.disabled = false;
      symbolSection.classList.add('hidden');
      classButtons.forEach(btn => btn.disabled = true);
      predictBtn.disabled = true;
    }

    function clearFeedbackUI() { feedbackContainer.innerHTML = ''; }
    
    function resetPredictionUI() {
        clearFeedbackUI();
        predictionEl.textContent = '';
        if (lastDetectedFace) {
            predictBtn.disabled = false;
            classButtons.forEach(btn => btn.disabled = false);
        }
    }

    function handleCorrectPrediction(predictedSymbol) {
        logPredictionAttempt(predictedSymbol, true);
        predictionEl.textContent = 'Dziękuję za potwierdzenie!';
        setTimeout(resetPredictionUI, 2000);
    }

    async function handleIncorrectPrediction(predictedSymbol, correctSymbol, logits) {
        logPredictionAttempt(predictedSymbol, false, correctSymbol);
        classifier.addExample(logits, correctSymbol);
        await logTrainingSample(correctSymbol, 'correction', logits);
        updateStatus();
        predictionEl.textContent = `Dziękuję! Zapamiętam, że to był ${correctSymbol}.`;
        setTimeout(resetPredictionUI, 2000);
    }

    function showCorrectionUI(predictedSymbol, logits) {
        clearFeedbackUI();
        feedbackContainer.innerHTML = `
            <p class="feedback-prompt">W takim razie, co to było?</p>
            <div class="feedback-actions">
                ${classNames.map(name => `<button data-correct-symbol="${name}">${name}</button>`).join('')}
            </div>
        `;
        document.querySelectorAll('[data-correct-symbol]').forEach(btn => {
            btn.onclick = () => { handleIncorrectPrediction(predictedSymbol, btn.dataset.correctSymbol, logits); };
        });
    }

    function showFeedbackUI(result, logits) {
        feedbackContainer.innerHTML = `
            <p class="feedback-prompt">Czy to poprawna odpowiedź?</p>
            <div class="feedback-actions">
                <button id="yesBtn">✅ Tak</button>
                <button id="noBtn">❌ Nie</button>
            </div>
        `;
        document.getElementById('yesBtn').onclick = () => handleCorrectPrediction(result.label);
        document.getElementById('noBtn').onclick = () => showCorrectionUI(result.label, logits);
    }

    async function takeSnapshot(label) {
      if (!net || !classifier || !lastDetectedFace) { showToast("Najpierw pokaż twarz do kamery!", 'info'); return; }
      const faceBox = lastDetectedFace;
      const cropStartX = faceBox.topLeft[0];
      const cropStartY = faceBox.bottomRight[1];
      const cropWidth = (faceBox.bottomRight[0] - faceBox.topLeft[0]);
      const cropHeight = cropWidth; 
      
      const ctx = canvas.getContext('2d');
      canvas.width = 150;
      canvas.height = 150;
      ctx.drawImage(video, cropStartX, cropStartY, cropWidth, cropHeight, 0, 0, 150, 150);
      
      const galleryInfo = gallery.querySelector('.gallery-info');
      if (galleryInfo) { gallery.innerHTML = ''; }
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      gallery.appendChild(img);
      
      const logits = net.infer(canvas, true);
      classifier.addExample(logits, label);
      updateStatus();
      await logTrainingSample(label, 'manual', logits);
    }

    async function predict() {
      if (!net || !classifier || !lastDetectedFace) return;
      if (classifier.getNumClasses() < classNames.length) { showToast(`Najpierw dodaj próbki dla wszystkich ${classNames.length} symboli!`, 'info'); return; }
      predictBtn.disabled = true;
      classButtons.forEach(btn => btn.disabled = true);
      
      const faceBox = lastDetectedFace;
      const cropStartX = faceBox.topLeft[0];
      const cropStartY = faceBox.bottomRight[1];
      const cropWidth = (faceBox.bottomRight[0] - faceBox.topLeft[0]);
      const cropHeight = cropWidth;
      
      const ctx = canvas.getContext('2d');
      canvas.width = 150;
      canvas.height = 150;
      ctx.drawImage(video, cropStartX, cropStartY, cropWidth, cropHeight, 0, 0, 150, 150);
      
      const logits = net.infer(canvas, true);
      const result = await classifier.predictClass(logits);
      predictionEl.textContent = `Model zgaduje: ${result.label} (pewność ${(result.confidences[result.label] * 100).toFixed(1)}%)`;
      showFeedbackUI(result, logits);
    }

    function updateStatus() {
      if (classifier) {
        const counts = classifier.getClassExampleCount();
        statusEl.textContent = classNames.map(name => `${name}: ${counts[name] || 0}`).join(' | ');
      }
    }

    async function loadModelFromFirebase() {
        // ... (kod bez zmian)
    }
    
    async function clearData() {
        // ... (kod bez zmian)
    }

    function logTrainingSample(symbol, source, logits) {
        // ... (kod bez zmian)
    }

    function logPredictionAttempt(predictedSymbol, wasCorrect, correctSymbol = null) {
        // ... (kod bez zmian)
    }
    
    function showToast(message, type = 'info', duration = 3000) {
        // ... (kod bez zmian)
    }

    function handleLoggedOutState() {
        // ... (kod bez zmian)
    }

    async function handleLoggedInState(user) {
        // ... (kod bez zmian)
    }

    async function main() {
        console.log('KROK 2: Wywołano funkcję main().');
        if (await loadModels()) {
            console.log('KROK 5: Inicjalizacja zakończona, ukrywam loader.');
            loader.classList.add('fade-out');
            contentWrapper.classList.remove('content-hidden');
            loader.addEventListener('transitionend', () => { loader.style.display = 'none'; });
            statusEl.textContent = "Modele gotowe. Zaloguj się, aby rozpocząć.";
            firebase.auth().onAuthStateChanged(user => {
                if (user) { handleLoggedInState(user); } else { handleLoggedOutState(); }
            });
        }
    }

    cameraToggleBtn.addEventListener('click', () => { isCameraOn ? stopCamera() : startCamera(); });
    clearBtn.addEventListener('click', clearData);
    classButtons.forEach(btn => { btn.addEventListener('click', () => takeSnapshot(btn.dataset.class)); });
    predictBtn.addEventListener('click', predict);
    
    main();
});
