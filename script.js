const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let videoStream = null;
let isAnalyzing = false;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const resultsDiv = document.getElementById('results');
const startBtn = document.getElementById('start-btn');

async function loadModels() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
    ]);
    console.log("Modelos cargados correctamente");
    return true;
  } catch (error) {
    console.error("Error cargando modelos:", error);
    showError("Error al cargar los modelos. Recarga la página.");
    return false;
  }
}

async function setupCamera() {
  try {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }

    resultsDiv.innerHTML = "<p>Cargando cámara...</p>";

    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user"
      }
    });

    if (videoStream) {
      video.srcObject = videoStream;
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          if (video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            resolve(true);
          } else {
            reject(new Error("No se pudo obtener las dimensiones del video"));
          }
        };
        setTimeout(() => {
          if (!video.videoWidth) {
            reject(new Error("No se pudo cargar el video correctamente."));
          }
        }, 5000);
      });
    } else {
      throw new Error("No se pudo obtener el stream de la cámara");
    }
  } catch (error) {
    console.error("Error en setupCamera:", error);
    showError(`No se pudo acceder a la cámara: ${error.message}`);
    return false;
  }
}

async function detectFaceContinuously() {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

  const detectFace = async () => {
    if (!isAnalyzing) return;

    try {
      if (!video.srcObject || video.srcObject.getTracks().length === 0) {
        isAnalyzing = false;
        startBtn.disabled = false;
        showError("La cámara se desconectó. Intenta de nuevo.");
        return;
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(detectFace);
        return;
      }

      const detections = await faceapi.detectAllFaces(video, options).withFaceLandmarks();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length > 0) {
        detections.forEach(d => drawLandmarks(d.landmarks));
        const faceType = analyzeFaceShape(detections[0].landmarks);
        showResults(faceType);
        isAnalyzing = false;
        startBtn.disabled = false;
      } else {
        requestAnimationFrame(detectFace);
      }
    } catch (error) {
      console.error("Error detectando rostro:", error);
      isAnalyzing = false;
      startBtn.disabled = false;
      showError("Error detectando rostro: " + error.message);
    }
  };

  await detectFace();
}

function drawLandmarks(landmarks) {
  landmarks.positions.forEach((pt, i) => {
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function analyzeFaceShape(landmarks) {
  try {
    const positions = landmarks.positions;
    const forehead = positions[10];
    const chin = positions[8];
    const left = positions[3];
    const right = positions[13];
    const faceHeight = faceapi.euclideanDistance(forehead, chin);
    const faceWidth = faceapi.euclideanDistance(left, right);
    const ratio = faceHeight / faceWidth;

    if (ratio > 1.35) return "Alargado";
    if (ratio < 0.9) return "Redondo";

    const jaw = landmarks.getJawOutline();
    const jawWidth = faceapi.euclideanDistance(jaw[3], jaw[13]);
    const isSquare = Math.abs(jawWidth - faceWidth) < (faceWidth * 0.15);

    return isSquare ? "Cuadrado" : "Ovalado";
  } catch (error) {
    console.error("Error analizando rostro:", error);
    return "Indeterminado";
  }
}

function showResults(faceType) {
  const recommendations = {
    "Alargado": { peinados: ["Bob", "Flequillo", "Ondas"], gafas: ["Aviador", "Altas"] },
    "Redondo": { peinados: ["Pixie", "Volumen arriba"], gafas: ["Rectangulares"] },
    "Ovalado": { peinados: ["Lob", "Capas"], gafas: ["Todos los estilos"] },
    "Cuadrado": { peinados: ["Ondas", "Media melena"], gafas: ["Redondas"] }
  };

  const rec = recommendations[faceType] || recommendations.Ovalado;

  resultsDiv.innerHTML = `
    <div class="result-card">
      <h3>Resultado</h3>
      <p class="face-type">Forma de rostro: <strong>${faceType}</strong></p>
      <div class="recommendations">
        <h4>Peinados:</h4><p>${rec.peinados.join(', ')}</p>
        <h4>Gafas:</h4><p>${rec.gafas.join(', ')}</p>
      </div>
    </div>
  `;
}

function showError(msg) {
  resultsDiv.innerHTML = `
    <div class="error-message">
      <p>${msg}</p>
    </div>
  `;
}

async function runAnalysis() {
  if (isAnalyzing) return;
  isAnalyzing = true;
  startBtn.disabled = true;
  resultsDiv.innerHTML = "<p>Analizando...</p>";

  try {
    if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceLandmark68Net.isLoaded) {
      const ok = await loadModels();
      if (!ok) return;
    }
    const cameraReady = await setupCamera();
    if (!cameraReady) return;
    await detectFaceContinuously();
  } catch (err) {
    console.error("Error general:", err);
    showError("Ocurrió un error: " + err.message);
    isAnalyzing = false;
    startBtn.disabled = false;
  }
}

startBtn.addEventListener('click', runAnalysis);

window.addEventListener('DOMContentLoaded', () => {
  loadModels();
});
