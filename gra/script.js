'use strict';

window.addEventListener('DOMContentLoaded', () => {
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

    const tensorToJSON = (tensor) => Array.from(tensor.dataSync());

    async function loadModels() {
      loaderStatus.textContent = "Ładowanie modeli AI...";
      try {
        [net, blazeFaceModel] = await Promise.all([
            mobilenet.load(),
            blazeface.load()
        ]);
        classifier = knnClassifier.create();
        return true;
      } catch (e) {
        loaderStatus.textContent = "Błąd krytyczny ładowania modeli AI.";
        console.error("Błąd ładowania modeli:", e);
        return false;
      }
    }

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
      if (!currentUser || !classifier) return;
      classifier.clearAllClasses();
      gallery.innerHTML = "";
      const samplesPath = `training_samples/${currentUser.uid}`;
      const snapshot = await database.ref(samplesPath).once('value');
      const allSamples = snapshot.val();
      if (allSamples) {
        statusEl.textContent = 'Odtwarzanie modelu z zapisanych próbek...';
        let processedCount = 0;
        for (const key of Object.keys(allSamples)) {
            const sample = allSamples[key];
            if (sample.tensor) {
                const tensor = tf.tensor2d(sample.tensor, [1, 1024]);
                classifier.addExample(tensor, sample.symbol);
                processedCount++;
            }
        }
        gallery.innerHTML = `<p class="gallery-info">Model wczytany z ${processedCount} próbek. Galeria jest pusta, ponieważ obrazki nie są zapisywane.</p>`;
      }
      updateStatus();
    }
    
    async function clearData() {
        if (!confirm("Czy na pewno chcesz usunąć wszystkie zebrane próbki?")) return;
        try {
          if (currentUser) {
            await database.ref(`training_samples/${currentUser.uid}`).remove();
            await database.ref(`prediction_attempts/${currentUser.uid}`).remove();
          }
          if (classifier) classifier.clearAllClasses();
          gallery.innerHTML = "";
          predictionEl.textContent = "Wyczyszczono dane.";
          updateStatus();
        } catch (error) { console.error("Błąd podczas czyszczenia danych:", error); }
    }

    function logTrainingSample(symbol, source, logits) {
        if (!currentUser || !logits) return;
        const sampleData = {
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            symbol: symbol,
            source: source,
            tensor: tensorToJSON(logits)
        };
        database.ref(`training_samples/${currentUser.uid}`).push(sampleData);
    }

    function logPredictionAttempt(predictedSymbol, wasCorrect, correctSymbol = null) {
        if (!currentUser) return;
        const attemptData = {
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            predictedSymbol: predictedSymbol,
            wasCorrect: wasCorrect
        };
        if (!wasCorrect && correctSymbol) { attemptData.correctSymbol = correctSymbol; }
        database.ref(`prediction_attempts/${currentUser.uid}`).push(attemptData);
    }
    
    function showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.5s forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    function handleLoggedOutState() {
      currentUser = null;
      stopCamera();
      authContainer.innerHTML = '<button id="login-btn" class="btn-primary">Zaloguj jako Gość</button>';
      statusEl.textContent = "Zaloguj się, aby rozpocząć.";
      predictionEl.textContent = "";
      gallery.innerHTML = "";
      clearBtn.disabled = true;
      if(classifier) classifier.clearAllClasses();
      document.getElementById('login-btn').addEventListener('click', () => { firebase.auth().signInAnonymously(); });
    }

    async function handleLoggedInState(user) {
      currentUser = user;
      authContainer.innerHTML = `<span class="welcome-message">Witaj, Gościu! (${user.uid.substring(0,6)})</span><button id="logout-btn" class="logout-btn">Wyloguj</button>`;
      document.getElementById('logout-btn').addEventListener('click', () => firebase.auth().signOut());
      clearBtn.disabled = false;
      statusEl.textContent = "Wczytywanie zapisanego modelu...";
      await loadModelFromFirebase();
    }

    async function main() {
      if (await loadModels()) {
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
