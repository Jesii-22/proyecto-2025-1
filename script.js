// Configuración
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let videoStream = null;

// Elementos del DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const resultsDiv = document.getElementById('results');
const startBtn = document.getElementById('start-btn');

// 1. Cargar modelos
async function loadModels() {
    try {
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

// 2. Configurar cámara
async function setupCamera() {
    try {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }

        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user"
            }
        });

        video.srcObject = videoStream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                resolve(true);
            };
        });
    } catch (error) {
        console.error("Error en cámara:", error);
        showError("No se pudo acceder a la cámara.");
        return false;
    }
}

// 3. Detección facial
async function detectFaceWithRetry(maxAttempts = 3) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        const detection = await tryFaceDetection();
        if (detection) return detection;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
}

async function tryFaceDetection() {
    try {
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 384,
            scoreThreshold: 0.5
        });

        const detections = await faceapi.detectAllFaces(video, options)
            .withFaceLandmarks();
        
        if (detections.length > 0) {
            return analyzeFaceShape(detections[0].landmarks);
        }
        return null;
    } catch (error) {
        console.error("Error en detección:", error);
        return null;
    }
}

// 4. Análisis de forma de rostro (CORREGIDO)
function analyzeFaceShape(landmarks) {
    try {
        // Obtener puntos clave con índices precisos
        const jaw = landmarks.getJawOutline();
        const forehead = jaw[0];     // Punto frontal (índice 0)
        const chin = jaw[16];       // Mentón (índice 16 en 68-point model)
        const leftCheek = jaw[4];   // Mejilla izquierda (índice 4)
        const rightCheek = jaw[12]; // Mejilla derecha (índice 12)

        // Dibujar los 4 puntos clave
        drawLandmarkPoints([
            forehead, 
            chin, 
            leftCheek, 
            rightCheek
        ]);

        // Cálculos de proporción
        const faceHeight = faceapi.euclideanDistance(forehead, chin);
        const faceWidth = faceapi.euclideanDistance(leftCheek, rightCheek);
        const ratio = faceHeight / faceWidth;

        // Clasificación
        if (ratio > 1.35) return "Alargado";
        if (ratio < 0.9) return "Ancho/Redondo";
        
        const jawWidth = faceapi.euclideanDistance(jaw[3], jaw[13]);
        const isSquare = Math.abs(jawWidth - faceWidth) < (faceWidth * 0.15);
        
        return isSquare ? "Cuadrado" : "Ovalado";
    } catch (error) {
        console.error("Error en análisis:", error);
        return "Indeterminado";
    }
}

// 5. Dibujar puntos clave (FUNCION CORREGIDA)
function drawLandmarkPoints(points) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar cada punto con etiqueta
    points.forEach((point, index) => {
        if (!point) return; // Validar si el punto existe
        
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Etiquetas de debug
        const labels = ["Frente", "Mentón", "Mejilla Izq", "Mejilla Der"];
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(labels[index], point.x + 10, point.y);
    });
}

// 6. Interfaz de usuario
function updateStatus(message) {
    resultsDiv.innerHTML = `<p class="status">${message}</p>`;
}

function showError(message) {
    resultsDiv.innerHTML = `
        <div class="error">
            <p>${message}</p>
            <ul>
                <li>▸ Acércate a la cámara</li>
                <li>▸ Busca buena iluminación</li>
            </ul>
        </div>
    `;
}

function showResults(faceType) {
    const recommendations = {
        "Alargado": {
            peinados: ["Corte bob", "Flequillo lateral"],
            gafas: ["Aviador", "Rectangulares"]
        },
        "Ancho/Redondo": {
            peinados: ["Pixie", "Volumen arriba"],
            gafas: ["Rectangulares anchas"]
        },
        "Ovalado": {
            peinados: ["Lob", "Ondas sueltas"],
            gafas: ["Cualquier estilo"]
        },
        "Cuadrado": {
            peinados: ["Ondas", "Flequillo lateral"],
            gafas: ["Redondas"]
        }
    };

    const recs = recommendations[faceType] || recommendations.Ovalado;
    
    resultsDiv.innerHTML = `
        <div class="result">
            <h3>¡Análisis completado!</h3>
            <p>Forma de rostro: <strong>${faceType}</strong></p>
            <p><strong>Peinados:</strong> ${recs.peinados.join(', ')}</p>
            <p><strong>Gafas:</strong> ${recs.gafas.join(', ')}</p>
            <small>Los puntos verdes son puntos de referencia</small>
        </div>
    `;
}

// Controlador principal
async function runAnalysis() {
    startBtn.disabled = true;
    updateStatus("Analizando...");
    
    try {
        if (!await loadModels()) return;
        if (!await setupCamera()) return;
        
        const faceType = await detectFaceWithRetry();
        faceType ? showResults(faceType) : showError("No se detectó un rostro.");
    } finally {
        startBtn.disabled = false;
    }
}

// Eventos
startBtn.addEventListener('click', runAnalysis);

// Precarga inicial
window.addEventListener('DOMContentLoaded', loadModels);