const startBtn = document.getElementById('start-btn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results-text');
const recDiv = document.getElementById('recommendations');
let detectionInterval = null;

// URL de los modelos (CDN oficial)
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// 1. Carga de modelos con manejo mejorado de errores
async function loadModels() {
  statusDiv.textContent = "Cargando modelos de IA...";
  statusDiv.className = "status loading";
  
  try {
    // Primero cargamos el detector de rostros
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    console.log("Modelo TinyFaceDetector cargado");
    
    // Luego los landmarks faciales
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    console.log("Modelo FaceLandmark68Net cargado");
    
    // Finalmente el modelo de edad y género
    await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
    console.log("Modelo AgeGenderNet cargado");
    
    statusDiv.textContent = "Modelos cargados correctamente!";
    statusDiv.className = "status success";
    return true;
  } catch (error) {
    console.error("Error cargando modelos:", error);
    statusDiv.textContent = "Error al cargar modelos. Recarga la página.";
    statusDiv.className = "status error";
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
    
    // Esperamos a que el video esté listo
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve(true);
      };
    });
  } catch (error) {
    let errorMessage = "No se pudo acceder a la cámara.";
    
    if (error.name === 'NotFoundError') {
      errorMessage = "No se encontró cámara disponible.";
    } else if (error.name === 'NotAllowedError') {
      errorMessage = "Permiso de cámara denegado. Por favor habilítalo.";
    } else if (error.name === 'NotReadableError') {
      errorMessage = "La cámara está siendo usada por otra aplicación.";
    }
    
    statusDiv.textContent = errorMessage;
    statusDiv.className = "status error";
    console.error("Error en cámara:", error);
    return false;
  }
}

// 3. Determinar forma del rostro mejorado
function getFaceShape(landmarks) {
  const jawPoints = landmarks.getJawOutline();
  const nosePoints = landmarks.getNose();
  
  // Puntos clave para las medidas
  const leftJaw = jawPoints[0];
  const rightJaw = jawPoints[16];
  const chin = jawPoints[8];
  const noseBottom = nosePoints[6];
  
  // Calculamos distancias
  const jawWidth = faceapi.euclideanDistance(leftJaw, rightJaw);
  const foreheadWidth = faceapi.euclideanDistance(leftJaw, rightJaw);
  const faceLength = faceapi.euclideanDistance(chin, noseBottom);

  const ratio = jawWidth / faceLength;

  // Lógica mejorada para determinar la forma
  if (ratio > 0.92) return 'redondo';
  if (ratio < 0.85 && (foreheadWidth > jawWidth * 1.15)) return 'corazón';
  if (Math.abs(jawWidth - foreheadWidth) < jawWidth * 0.08) return 'cuadrado';
  return 'ovalado';
}

// 4. Mostrar recomendaciones con manejo de errores
async function showRecommendations(shape, gender, age) {
  try {
    const response = await fetch('recommendations.json');
    if (!response.ok) throw new Error('Error 404 al cargar recomendaciones');
    
    const data = await response.json();
    const shapeData = data[shape] || data.ovalado; // Fallback seguro
    
    resultsDiv.innerHTML = `
      <div class="result-item">
        <strong>Forma de tu rostro:</strong> <span>${shape}</span>
      </div>
      <div class="result-item">
        <strong>Género:</strong> <span>${gender}</span>
      </div>
      <div class="result-item">
        <strong>Edad aproximada:</strong> <span>${Math.round(age)} años</span>
      </div>
    `;
    
    recDiv.innerHTML = `
      <h3>Te recomendamos:</h3>
      <div class="recommendation-item">
        <strong>Peinados:</strong>
        <ul>${shapeData.peinados.map(item => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div class="recommendation-item">
        <strong>Gafas:</strong>
        <ul>${shapeData.gafas.map(item => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div class="recommendation-item">
        <strong>Escotes:</strong>
        <ul>${shapeData.escotes.map(item => `<li>${item}</li>`).join('')}</ul>
      </div>
    `;
  } catch (error) {
    console.error("Error mostrando recomendaciones:", error);
    recDiv.innerHTML = `
      <p class="error-message">⚠️ No se pudieron cargar las recomendaciones. Verifica que el archivo recommendations.json exista.</p>
    `;
  }
}

// 5. Detección facial optimizada
async function detectFaces() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  
  // Ajustamos el canvas al tamaño del video
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  
  // Limpiamos cualquier intervalo previo
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  
  // Iniciamos nuevo intervalo de detección
  detectionInterval = setInterval(async () => {
    try {
      // Detectamos rostros con config optimizada
      const detections = await faceapi.detectAllFaces(
        video, 
        new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 320,  // Balance entre rendimiento y precisión
          scoreThreshold: 0.5  // Filtro de confianza
        })
      )
      .withFaceLandmarks()  // Añadimos puntos faciales
      .withAgeAndGender();  // Añadimos edad y género
      
      // Limpiamos el canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujamos resultados
      faceapi.draw.drawDetections(canvas, detections);
      faceapi.draw.drawFaceLandmarks(canvas, detections);
      
      // Procesamos el primer rostro detectado
      if (detections.length > 0) {
        const detection = detections[0];
        const shape = getFaceShape(detection.landmarks);
        const gender = detection.gender;
        const age = detection.age;
        
        await showRecommendations(shape, gender, age);
      }
    } catch (error) {
      console.error("Error en detección:", error);
    }
  }, 1500); // Frecuencia de detección (1.5 segundos)
}

// 6. Inicialización completa con feedback visual
async function initializeApp() {
  // Deshabilitamos el botón durante la inicialización
  startBtn.disabled = true;
  startBtn.textContent = "Inicializando...";
  
  try {
    // Cargamos modelos
    const modelsLoaded = await loadModels();
    if (!modelsLoaded) return;
    
    // Iniciamos cámara
    const videoStarted = await startVideo();
    if (!videoStarted) return;
    
    // Comenzamos detección
    await detectFaces();
    
    // Feedback al usuario
    statusDiv.textContent = "Análisis facial activo. Coloca tu rostro frente a la cámara.";
    statusDiv.className = "status active";
    
  } catch (error) {
    console.error("Error en inicialización:", error);
    statusDiv.textContent = "Error crítico. Por favor recarga la página.";
    statusDiv.className = "status error";
    
  } finally {
    // Restauramos el botón
    startBtn.disabled = false;
    startBtn.textContent = "Reiniciar Análisis";
  }
}

// Event listeners
startBtn.addEventListener('click', initializeApp);

// Precargamos modelos cuando la página se carga
window.addEventListener('DOMContentLoaded', () => {
  // Esto mejora la experiencia ya que los modelos comienzan a cargarse temprano
  loadModels().catch(console.error);
});