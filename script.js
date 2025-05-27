let modelsLoaded = false;
let cameraActive = false;
let stream = null;
let faceDetected = false;
let isLandmarksVisible = false;
let landmarks = [];
let faceWidth = 0;
let faceHeight = 0;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadModels();
  setupEventListeners();
}

async function loadModels() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://justadreamer.github.io/face-api.js-models/'),
      faceapi.nets.faceLandmark68Net.loadFromUri('https://justadreamer.github.io/face-api.js-models/'),
      faceapi.nets.faceRecognitionNet.loadFromUri('https://justadreamer.github.io/face-api.js-models/'),
      faceapi.nets.faceExpressionNet.loadFromUri('https://justadreamer.github.io/face-api.js-models/')
    ]);
    modelsLoaded = true;
    showNotification('Modelos cargados correctamente. ¡Preparado para iniciar!', 'success');
  } catch (error) {
    console.error('Error al cargar modelos:', error);
    showNotification('Error al cargar modelos. Verifica tu conexión.', 'error');
  }
}

function setupEventListeners() {
  const startCameraBtn = document.getElementById('startCameraBtn');
  const analyzeFaceBtn = document.getElementById('analyzeFaceBtn');
  const retryAnalysisBtn = document.getElementById('retryAnalysisBtn');
  const toggleLandmarksBtn = document.getElementById('toggleLandmarksBtn');
  const video = document.getElementById('video');

  startCameraBtn.addEventListener('click', async () => {
    if (!modelsLoaded) {
      showNotification('Esperá a que los modelos se carguen', 'warning');
      return;
    }

    if (cameraActive) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
      cameraActive = false;
      startCameraBtn.textContent = 'Iniciar Cámara';
      analyzeFaceBtn.disabled = true;
      retryAnalysisBtn.classList.add('hidden');
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraActive = true;
        startCameraBtn.textContent = 'Detener Cámara';
        analyzeFaceBtn.disabled = false;
        retryAnalysisBtn.classList.remove('hidden');
      } catch (err) {
        showNotification('No se pudo acceder a la cámara', 'error');
      }
    }
  });

  // Aquí irían analyzeFaceBtn, retryAnalysisBtn, toggleLandmarksBtn, etc.
  // Podés seguir completándolo con las funciones del código original

}

// Notificaciones
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '15px',
    borderRadius: '6px',
    backgroundColor: type === 'error' ? '#e74c3c' : '#2ecc71',
    color: 'white',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    zIndex: 9999
  });

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}
