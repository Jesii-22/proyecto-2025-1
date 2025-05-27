// Configuración
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let videoStream = null;
let isAnalyzing = false;

// Elementos del DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const resultsDiv = document.getElementById('results');
const startBtn = document.getElementById('start-btn');

// 1. Cargar modelos de face-api.js (FUNCIÓN AÑADIDA)
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

// 2. Configurar cámara
async function setupCamera() {
    try {
        // Detener cualquier stream anterior
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        
        // Obtener acceso a la cámara
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user"
            }
        });
        
        // Verificar que el stream está activo
        if (videoStream) {
            video.srcObject = videoStream;
            
            // Esperar a que el video esté cargado
            return new Promise((resolve, reject) => {
                video.onloadedmetadata = () => {
                    console.log("Video metadata cargada:", video.videoWidth, video.videoHeight);
                    if (video.videoWidth && video.videoHeight) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        resolve(true);
                    } else {
                        reject(new Error("No se pudo obtener las dimensiones del video"));
                    }
                };
                
                // Timeout por si la cámara no se carga
                setTimeout(() => {
                    if (!video.videoWidth) {
                        reject(new Error("No se pudo cargar el video correctamente. Verifica que tu dispositivo tiene una cámara y que has dado permisos."));
                    }
                }, 5000);
            });
        } else {
            reject(new Error("No se pudo obtener el stream de la cámara"));
        }
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        showError(`No se pudo acceder a la cámara: ${error.message}. Asegúrate de dar los permisos y que tu dispositivo tiene una cámara.`);
        return false;
    }
}

// 3. Detección facial con bucle continuo
async function detectFaceContinuously() {
    try {
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
        });
        
        // Detección continua
        const detectFace = async () => {
            if (!isAnalyzing) return;
            
            try {
                // Verificar que el video está activo
                if (!video.srcObject || video.srcObject.getTracks().length === 0) {
                    console.error("Video no está activo");
                    isAnalyzing = false;
                    startBtn.disabled = false;
                    showError("La conexión con la cámara se perdió. Intenta de nuevo.");
                    return;
                }
                
                // Verificar que el video tiene dimensiones
                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    console.error("Video sin dimensiones", video.videoWidth, video.videoHeight);
                    requestAnimationFrame(detectFace);
                    return;
                }
                
                console.log("Detección en progreso...");
                
                const detections = await faceapi.detectAllFaces(video, options)
                    .withFaceLandmarks();
                
                // Limpiar canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (detections.length > 0) {
                    console.log("Cara detectada:", detections[0]);
                    
                    // Dibujar landmarks manualmente
                    detections.forEach(detection => {
                        const landmarks = detection.landmarks;
                        drawLandmarks(landmarks);
                    });
                    
                    // Analizar forma del rostro
                    const faceType = analyzeFaceShape(detections[0].landmarks);
                    
                    // Mostrar resultados
                    showResults(faceType);
                    
                    // Detener detección después de encontrar un resultado
                    isAnalyzing = false;
                    startBtn.disabled = false;
                } else {
                    // Si no se detecta rostro, continuar intentando
                    requestAnimationFrame(detectFace);
                }
            } catch (error) {
                console.error("Error en detección:", error);
                isAnalyzing = false;
                startBtn.disabled = false;
                showError("Hubo un problema con la detección facial: " + error.message);
            }
        };
        
        await detectFace();
    } catch (error) {
        console.error("Error en detección continua:", error);
        isAnalyzing = false;
        startBtn.disabled = false;
        showError("Hubo un problema con la detección facial: " + error.message);
    }
}

// Función para dibujar landmarks manualmente
function drawLandmarks(landmarks) {
    // Dibujar todos los puntos de referencia
    landmarks.positions.forEach((point, index) => {
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Dibujar puntos específicos con etiquetas
    const specificPoints = [
        { index: 10, label: "Frente" },
        { index: 8, label: "Mentón" },
        { index: 3, label: "Mejilla Izq" },
        { index: 13, label: "Mejilla Der" }
    ];
    
    specificPoints.forEach(({ index, label }) => {
        const point = landmarks.positions[index];
        
        // Dibujar punto más grande
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

// 5. Mostrar resultados
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
                <li>▸ Verifica que tu navegador tenga acceso a la cámara</li>
                <li>▸ Prueba con otro navegador (Chrome funciona mejor con cámaras)</li>
            </ul>
        </div>
    `;
}

// Controlador principal
async function runAnalysis() {
    if (isAnalyzing) return;
    
    isAnalyzing = true;
    startBtn.disabled = true;
    resultsDiv.innerHTML = "<p>Analizando tu rostro...</p>";
    
    try {
        // Verificar si los modelos están cargados
        if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceLandmark68Net.isLoaded) {
            const modelsLoaded = await loadModels();
            if (!modelsLoaded) return;
        }
        
        // Configurar la cámara
        console.log("Configurando cámara...");
        const cameraReady = await setupCamera();
        if (!cameraReady) return;
        
        // Verificar que el video está activo
        if (!video.srcObject || video.srcObject.getTracks().length === 0) {
            console.error("Video no está activo después de setupCamera");
            isAnalyzing = false;
            startBtn.disabled = false;
            return;
        }
        
        // Iniciar detección continua
        console.log("Iniciando detección...");
        await detectFaceContinuously();
        
    } catch (error) {
        console.error("Error inesperado:", error);
        showError("Ocurrió un error inesperado: " + error.message);
        isAnalyzing = false;
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