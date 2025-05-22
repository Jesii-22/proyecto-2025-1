// Configuración
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let videoStream = null;

// Elementos
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const resultsDiv = document.getElementById('results');
const startBtn = document.getElementById('start-btn');
const debugInfo = document.getElementById('debug-info');

// 1. Cargar modelos optimizados
async function loadModels() {
    try {
        // Cargar solo modelos esenciales
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log("Modelos cargados");
        return true;
    } catch (error) {
        console.error("Error cargando modelos:", error);
        showError("Error técnico. Recarga la página.");
        return false;
    }
}

// 2. Configurar cámara con verificación
async function setupCamera() {
    try {
        // Detener stream anterior si existe
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }

        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user",
                frameRate: { ideal: 30 }
            }
        });

        video.srcObject = videoStream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log(`Video: ${video.videoWidth}x${video.videoHeight}`);
                resolve(true);
            };
        });
    } catch (error) {
        console.error("Error cámara:", error);
        showError("No se pudo acceder a la cámara. Asegúrate de dar los permisos.");
        return false;
    }
}

// 3. Detección mejorada (combinando ambos enfoques)
async function detectFaceWithRetry(maxAttempts = 3) {
    let attempts = 0;
    let detection = null;
    
    while (attempts < maxAttempts && !detection) {
        attempts++;
        detection = await tryFaceDetection();
        
        if (!detection) {
            await new Promise(resolve => setTimeout(resolve, 500));
            updateStatus(`Intento ${attempts}/${maxAttempts}...`);
        }
    }
    
    return detection;
}

async function tryFaceDetection() {
    try {
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 384,
            scoreThreshold: 0.4  // Más bajo para mayor sensibilidad
        });

        const detections = await faceapi.detectAllFaces(video, options)
            .withFaceLandmarks();
        
        if (detections.length > 0) {
            // Verificar calidad de detección
            const validFaces = detections.filter(face => {
                const box = face.detection.box;
                return box.width > 100 && box.height > 100;
            });
            
            if (validFaces.length > 0) {
                return analyzeFaceShape(validFaces[0].landmarks);
            }
        }
        return null;
    } catch (error) {
        console.error("Error detección:", error);
        return null;
    }
}

// 4. Análisis de forma (basado en tu lógica p5.js)
function analyzeFaceShape(landmarks) {
    try {
        const jaw = landmarks.getJawOutline();
        const nose = landmarks.getNose();
        
        // Puntos clave (equivalente a tu código p5.js)
        const menton = jaw[8];    // Punto 152 en facemesh
        const frente = jaw[0];    // Punto 10 aproximado
        const mejillaIzq = jaw[4];  // Punto 234 aproximado
        const mejillaDer = jaw[12]; // Punto 454 aproximado
        
        // Cálculos como en tu versión
        const altoCara = faceapi.euclideanDistance(frente, menton);
        const anchoCara = faceapi.euclideanDistance(mejillaIzq, mejillaDer);
        const ratio = altoCara / anchoCara;
        
        // Debug visual
        drawLandmarkPoints([frente, menton, mejillaIzq, mejillaDer]);
        
        // Lógica de clasificación mejorada
        if (ratio > 1.3) return "Alargado";
        if (ratio < 0.9) return "Ancho/Redondo";
        
        // Para rostros intermedios
        const mandibulaAncho = faceapi.euclideanDistance(jaw[3], jaw[13]);
        const esCuadrado = Math.abs(mandibulaAncho - anchoCara) < (anchoCara * 0.15);
        
        return esCuadrado ? "Cuadrado" : "Ovalado";
    } catch (error) {
        console.error("Error análisis:", error);
        return "Indeterminado";
    }
}

function drawLandmarkPoints(points) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(point => {
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

// 5. Interfaz de usuario
function updateStatus(message) {
    resultsDiv.innerHTML = `<p class="status-message">${message}</p>`;
}

function showError(message) {
    resultsDiv.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <ul class="tips-list">
                <li>▸ Buena iluminación frontal</li>
                <li>▸ Rostro centrado en la cámara</li>
                <li>▸ Distancia de ~50cm</li>
                <li>▸ Sin lentes oscuros</li>
            </ul>
        </div>
    `;
}

function showResults(faceType) {
    const recommendations = {
        "Alargado": {
            peinados: ["Corte bob", "Flequillo lateral", "Capas largas"],
            gafas: ["Aviador", "Rectangulares altas"]
        },
        "Ancho/Redondo": {
            peinados: ["Corte pixie", "Volumen arriba", "Flequillo recto"],
            gafas: ["Rectangulares anchas", "Mariposa"]
        },
        "Ovalado": {
            peinados: ["Corte lob", "Ondas sueltas", "Corte en capas"],
            gafas: ["Cualquier estilo"]
        },
        "Cuadrado": {
            peinados: ["Ondas sueltas", "Media melena", "Flequillo lateral"],
            gafas: ["Redondas", "Ovaladas"]
        }
    };

    const recs = recommendations[faceType] || recommendations.Ovalado;
    
    resultsDiv.innerHTML = `
        <div class="result-container">
            <h3>¡Análisis completado!</h3>
            <p class="face-type">Forma de rostro: <strong>${faceType}</strong></p>
            
            <div class="recommendations">
                <h4>Recomendaciones:</h4>
                <p><strong>Peinados:</strong> ${recs.peinados.join(', ')}</p>
                <p><strong>Gafas:</strong> ${recs.gafas.join(', ')}</p>
            </div>
            
            <div class="debug-hint">
                <small>Los puntos verdes muestran los puntos de referencia usados</small>
            </div>
        </div>
    `;
}

// Controlador principal
async function runAnalysis() {
    startBtn.disabled = true;
    updateStatus("Inicializando sistema...");
    
    try {
        // Paso 1: Cargar modelos
        const modelsReady = await loadModels();
        if (!modelsReady) return;
        
        // Paso 2: Configurar cámara
        updateStatus("Configurando cámara...");
        const cameraReady = await setupCamera();
        if (!cameraReady) return;
        
        // Paso 3: Detección con reintentos
        updateStatus("Analizando rostro...");
        const faceType = await detectFaceWithRetry();
        
        if (faceType) {
            showResults(faceType);
        } else {
            showError("No se detectó un rostro claro. Intenta:");
        }
    } finally {
        startBtn.disabled = false;
    }
}

// Eventos
startBtn.addEventListener('click', runAnalysis);

// Precarga inicial
window.addEventListener('DOMContentLoaded', () => {
    loadModels();
    console.log("Sistema listo");
});