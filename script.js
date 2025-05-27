// Configuración
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let videoStream = null;

// Elementos del DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const resultsDiv = document.getElementById('results');
const startBtn = document.getElementById('start-btn');

// 1. Cargar modelos de face-api.js (FUNCIÓN AÑADIDA)
async function loadModels() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log("Modelos cargados correctamente");
        return true;
    } catch (error) {
        console.error("Error cargando modelos:", error);
        showError("Error al cargar los modelos. Recarga la página.");
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
        console.error("Error al acceder a la cámara:", error);
        showError("No se pudo acceder a la cámara. Asegúrate de dar los permisos.");
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
            inputSize: 320,
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

// 4. Análisis de forma de rostro
function analyzeFaceShape(landmarks) {
    try {
        const positions = landmarks.positions;
        
        // Índices de los landmarks (modelo 68-puntos)
        const FOREHEAD = 10;    // Punto frontal
        const CHIN = 8;        // Mentón
        const LEFT_CHEEK = 3;   // Mejilla izquierda
        const RIGHT_CHEEK = 13; // Mejilla derecha
        
        // Puntos de referencia
        const forehead = positions[FOREHEAD];
        const chin = positions[CHIN];
        const leftCheek = positions[LEFT_CHEEK];
        const rightCheek = positions[RIGHT_CHEEK];

        // Dibujar puntos de referencia
        drawLandmarkPoints([
            { point: forehead, label: "Frente" },
            { point: chin, label: "Mentón" },
            { point: leftCheek, label: "Mejilla Izq" },
            { point: rightCheek, label: "Mejilla Der" }
        ]);

        // Cálculos de proporción
        const faceHeight = faceapi.euclideanDistance(forehead, chin);
        const faceWidth = faceapi.euclideanDistance(leftCheek, rightCheek);
        const ratio = faceHeight / faceWidth;

        // Clasificación
        if (ratio > 1.35) return "Alargado";
        if (ratio < 0.9) return "Ancho/Redondo";
        
        const jawline = landmarks.getJawOutline();
        const jawWidth = faceapi.euclideanDistance(jawline[3], jawline[13]);
        const isSquare = Math.abs(jawWidth - faceWidth) < (faceWidth * 0.15);
        
        return isSquare ? "Cuadrado" : "Ovalado";
    } catch (error) {
        console.error("Error en análisis:", error);
        return "Indeterminado";
    }
}

// 5. Dibujar puntos y etiquetas
function drawLandmarkPoints(points) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    points.forEach(({ point, label }) => {
        if (!point) return;
        
        // Dibujar punto
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Dibujar etiqueta
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(label, point.x + 10, point.y - 10);
    });
}

// 6. Mostrar resultados
function showResults(faceType) {
    const recommendations = {
        "Alargado": {
            peinados: ["Corte bob", "Flequillo lateral", "Ondas"],
            gafas: ["Aviador", "Rectangulares altas"]
        },
        "Ancho/Redondo": {
            peinados: ["Pixie", "Volumen arriba", "Flequillo recto"],
            gafas: ["Rectangulares anchas", "Mariposa"]
        },
        "Ovalado": {
            peinados: ["Lob", "Ondas sueltas", "Corte en capas"],
            gafas: ["Cualquier estilo"]
        },
        "Cuadrado": {
            peinados: ["Ondas", "Media melena", "Flequillo lateral"],
            gafas: ["Redondas", "Ovaladas"]
        }
    };

    const recs = recommendations[faceType] || recommendations.Ovalado;
    
    resultsDiv.innerHTML = `
        <div class="result-card">
            <h3>¡Análisis completado!</h3>
            <p class="face-type">Forma de rostro: <strong>${faceType}</strong></p>
            <div class="recommendations">
                <h4>Recomendaciones:</h4>
                <p><strong>Peinados:</strong> ${recs.peinados.join(', ')}</p>
                <p><strong>Gafas:</strong> ${recs.gafas.join(', ')}</p>
            </div>
            <p class="hint">Los puntos verdes muestran los puntos de referencia usados</p>
        </div>
    `;
}

function showError(message) {
    resultsDiv.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <ul class="tips">
                <li>▸ Asegúrate de tener buena iluminación</li>
                <li>▸ Mantén tu rostro centrado</li>
                <li>▸ Acércate a la cámara</li>
            </ul>
        </div>
    `;
}

// Controlador principal
async function runAnalysis() {
    startBtn.disabled = true;
    resultsDiv.innerHTML = "<p>Analizando tu rostro...</p>";
    
    try {
        const modelsLoaded = await loadModels();
        if (!modelsLoaded) return;
        
        const cameraReady = await setupCamera();
        if (!cameraReady) return;
        
        const faceType = await detectFaceWithRetry();
        
        if (faceType) {
            showResults(faceType);
        } else {
            showError("No se detectó un rostro claro. Intenta:");
        }
    } catch (error) {
        console.error("Error inesperado:", error);
        showError("Ocurrió un error inesperado");
    } finally {
        startBtn.disabled = false;
    }
}

// Eventos
startBtn.addEventListener('click', runAnalysis);

// Precarga inicial
window.addEventListener('DOMContentLoaded', () => {
    // Solo cargar modelos al inicio, no la cámara
    loadModels().catch(error => {
        console.error("Error al cargar modelos:", error);
        showError("Error al cargar los modelos. Recarga la página.");
    });
});