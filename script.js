// Configuración global
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let videoStream = null;

// Elementos del DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const resultsDiv = document.getElementById('results');
const startBtn = document.getElementById('start-btn');

// 1. Cargar modelos de IA
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

// 2. Iniciar cámara con configuración profesional
async function startVideo() {
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
                console.log(`Resolución de video: ${video.videoWidth}x${video.videoHeight}`);
                resolve(true);
            };
        });
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        showError("No se pudo acceder a la cámara. Asegúrate de dar los permisos.");
        return false;
    }
}

// 3. Dibujar landmarks visibles
function drawFaceLandmarks(landmarks) {
    // Configuración de estilo
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    
    // Dibujar contorno facial
    const jawOutline = landmarks.getJawOutline();
    ctx.beginPath();
    ctx.moveTo(jawOutline[0].x, jawOutline[0].y);
    for (let i = 1; i < jawOutline.length; i++) {
        ctx.lineTo(jawOutline[i].x, jawOutline[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Dibujar puntos clave (más grandes)
    const keyPoints = [
        jawOutline[0],  // Frente izquierda
        jawOutline[16], // Frente derecha
        jawOutline[8],  // Mentón
        jawOutline[4],  // Mejilla izquierda
        jawOutline[12]  // Mejilla derecha
    ];
    
    keyPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    });
    
    // Dibujar ojos (opcional)
    drawLandmarkGroup(landmarks.getLeftEye());
    drawLandmarkGroup(landmarks.getRightEye());
}

function drawLandmarkGroup(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
}

// 4. Detección facial mejorada
async function detectFaces() {
    try {
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.4
        });

        const detections = await faceapi.detectAllFaces(video, options)
            .withFaceLandmarks();
        
        if (detections.length > 0) {
            // Dibujar landmarks inmediatamente
            drawFaceLandmarks(detections[0].landmarks);
            
            // Filtrar detecciones de baja calidad
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
        console.error("Error en detección:", error);
        return null;
    }
}

// 5. Análisis de forma facial (basado en tu lógica p5.js)
function analyzeFaceShape(landmarks) {
    try {
        const jaw = landmarks.getJawOutline();
        const nose = landmarks.getNose();
        
        // Puntos clave
        const menton = jaw[8];
        const frente = jaw[0];
        const mejillaIzq = jaw[4];
        const mejillaDer = jaw[12];
        
        // Cálculos
        const altoCara = faceapi.euclideanDistance(frente, menton);
        const anchoCara = faceapi.euclideanDistance(mejillaIzq, mejillaDer);
        const ratio = altoCara / anchoCara;

        // Clasificación mejorada
        if (ratio > 1.3) return "Alargado";
        if (ratio < 0.9) return "Ancho/Redondo";
        
        // Para rostros intermedios
        const mandibulaAncho = faceapi.euclideanDistance(jaw[3], jaw[13]);
        const esCuadrado = Math.abs(mandibulaAncho - anchoCara) < (anchoCara * 0.15);
        
        return esCuadrado ? "Cuadrado" : "Ovalado";
    } catch (error) {
        console.error("Error en análisis facial:", error);
        return "Indeterminado";
    }
}

// 6. Mostrar resultados
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
        <div class="result-card">
            <h3>¡Análisis completado!</h3>
            <p class="face-type">Forma de rostro: <strong>${faceType}</strong></p>
            
            <div class="recommendations">
                <h4>Recomendaciones:</h4>
                <p><strong>Peinados:</strong> ${recs.peinados.join(', ')}</p>
                <p><strong>Gafas:</strong> ${recs.gafas.join(', ')}</p>
            </div>
            
            <div class="debug-info">
                <small>Los puntos verdes muestran los puntos de referencia usados</small>
            </div>
        </div>
    `;
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

function updateStatus(message) {
    resultsDiv.innerHTML = `<p class="status-message">${message}</p>`;
}

// 7. Función principal
async function runAnalysis() {
    startBtn.disabled = true;
    updateStatus("Inicializando sistema...");
    
    try {
        // Paso 1: Cargar modelos
        const modelsReady = await loadModels();
        if (!modelsReady) return;
        
        // Paso 2: Configurar cámara
        updateStatus("Configurando cámara...");
        const cameraReady = await startVideo();
        if (!cameraReady) return;
        
        // Paso 3: Detección con reintentos
        updateStatus("Analizando rostro...");
        const faceType = await detectFaces();
        
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
    console.log("Sistema listo. Presiona 'Analizar mi rostro' para comenzar.");
});