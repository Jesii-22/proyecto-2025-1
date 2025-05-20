// script.js completo
const startBtn = document.getElementById('start-btn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results-text');
const recDiv = document.getElementById('recommendations');

let detectionInterval = null;
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

// 1. Cargar modelos mejorado
async function loadModels() {
  statusDiv.textContent = "Cargando modelos de IA...";
  statusDiv.className = "status loading";
  
  try {
    await faceapi.loadTinyFaceDetectorModel(MODEL_URL);
    await faceapi.loadFaceLandmarkTinyModel(MODEL_URL);
    await faceapi.loadAgeGenderModel(MODEL_URL);
    
    statusDiv.textContent = "Modelos cargados correctamente!";
    statusDiv.className = "status success";
    return true;
  } catch (error) {
    statusDiv.textContent = "Error al cargar modelos. Intenta recargar la página.";
    statusDiv.className = "status error";
    console.error("Error loading models:", error);
    return false;
  }
}

// 2. Iniciar cámara con mejor manejo de errores
async function startVideo() {
  const video = document.getElementById('video');
  
  if (!navigator.mediaDevices?.getUserMedia) {
    statusDiv.textContent = "Tu navegador no soporta acceso a cámara";
    statusDiv.className = "status error";
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 400, 
        height: 300,
        facingMode: 'user' 
      } 
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve(true);
      };
    });
  } catch (error) {
    let errorMessage = "No se pudo acceder a la cámara. Asegúrate de dar permisos.";
    
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = "No se encontró cámara disponible.";
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = "La cámara está siendo usada por otra aplicación.";
    }
    
    statusDiv.textContent = errorMessage;
    statusDiv.className = "status error";
    console.error("Camera error:", error);
    return false;
  }
}

// 3. Determinar forma del rostro mejorado
function getFaceShape(landmarks) {
  const jawPoints = landmarks.getJawOutline();
  const nosePoints = landmarks.getNose();
  
  const jawWidth = faceapi.euclideanDistance(jawPoints[0], jawPoints[16]);
  const foreheadWidth = faceapi.euclideanDistance(jawPoints[0], jawPoints[16]);
  const faceLength = faceapi.euclideanDistance(jawPoints[8], nosePoints[6]);

  const ratio = jawWidth / faceLength;

  if (ratio > 0.9) return 'redondo';
  if (ratio < 0.85 && foreheadWidth > jawWidth * 1.1) return 'corazón';
  if (Math.abs(jawWidth - foreheadWidth) < jawWidth * 0.1) return 'cuadrado';
  return 'ovalado';
}

// 4. Mostrar recomendaciones con diseño mejorado
async function showRecommendations(shape, gender, age) {
  try {
    const response = await fetch('recommendations.json');
    if (!response.ok) throw new Error('No se pudo cargar recomendaciones');
    
    const data = await response.json();
    const shapeData = data[shape] || data.ovalado; // Fallback a ovalado si no existe
    
    resultsDiv.innerHTML = `
      <div class="result-item">
        <strong>Forma de tu rostro:</strong> ${shape}
      </div>
      <div class="result-item">
        <strong>Género:</strong> ${gender}
      </div>
      <div class="result-item">
        <strong>Edad aproximada:</strong> ${Math.round(age)} años
      </div>
    `;
    
    recDiv.innerHTML = `
      <h3>Te recomendamos:</h3>
      <div class="recommendation-item">
        <strong>Peinados:</strong><br>
        ${shapeData.peinados.map(item => `• ${item}`).join('<br>')}
      </div>
      <div class="recommendation-item">
        <strong>Gafas:</strong><br>
        ${shapeData.gafas.map(item => `• ${item}`).join('<br>')}
      </div>
      <div class="recommendation-item">
        <strong>Escotes:</strong><br>
        ${shapeData.escotes.map(item => `• ${item}`).join('<br>')}
      </div>
    `;
  } catch (error) {
    console.error("Error showing recommendations:", error);
    recDiv.innerHTML = `<p class="error">No se pudieron cargar las recomendaciones.</p>`;
  }
}

// 5. Detección facial optimizada
async function detectFaces() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const displaySize = { width: video.width, height: video.height };
  
  faceapi.matchDimensions(canvas, displaySize);
  
  // Limpiar detección anterior
  if (detectionInterval) clearInterval(detectionInterval);
  
  detectionInterval = setInterval(async () => {
    try {
      const detections = await faceapi.detectAllFaces(video, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks()
        .withAgeAndGender();
      
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, detections);
      faceapi.draw.drawFaceLandmarks(canvas, detections);
      
      if (detections.length > 0) {
        const shape = getFaceShape(detections[0].landmarks);
        const gender = detections[0].gender;
        const age = detections[0].age;
        await showRecommendations(shape, gender, age);
      }
    } catch (error) {
      console.error("Detection error:", error);
    }
  }, 1500); // Disminuir frecuencia para mejor rendimiento
}

// 6. Inicialización completa con mejor manejo de estado
async function initializeApp() {
  startBtn.disabled = true;
  startBtn.textContent = "Procesando...";
  
  try {
    const modelsLoaded = await loadModels();
    if (!modelsLoaded) throw new Error("Modelos no cargados");
    
    const videoStarted = await startVideo();
    if (!videoStarted) throw new Error("Cámara no disponible");
    
    await detectFaces();
    statusDiv.textContent = "Análisis facial activo. Acerca tu rostro a la cámara.";
    statusDiv.className = "status success";
  } catch (error) {
    console.error("Initialization error:", error);
    statusDiv.textContent = "Error al iniciar la aplicación. Recarga la página.";
    statusDiv.className = "status error";
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "Comenzar";
  }
}

// Event listener
startBtn.addEventListener('click', initializeApp);

// Cargar modelos al iniciar (opcional)
window.addEventListener('DOMContentLoaded', () => {
  // Pre-cargar modelos para mejor experiencia
  loadModels().catch(console.error);
});