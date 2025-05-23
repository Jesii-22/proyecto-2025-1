// Configuración
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let videoStream = null;

// Elementos del DOM
const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const resultsDiv = document.getElementById('results');

// 1. Verificar compatibilidad con cámara
function checkCameraSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Tu navegador no soporta acceso a cámara o estás en modo incógnito");
        return false;
    }
    return true;
}

// 2. Configurar cámara (versión mejorada)
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
                facingMode: "user"
            }
        });

        video.srcObject = videoStream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(true);
            };
            video.onerror = () => {
                showError("Error al iniciar el video");
                resolve(false);
            };
        });
    } catch (error) {
        console.error("Error en cámara:", error);
        handleCameraError(error);
        return false;
    }
}

// 3. Manejo específico de errores de cámara
function handleCameraError(error) {
    let message = "Error desconocido";
    
    if (error.name === 'NotAllowedError') {
        message = "Permiso de cámara denegado. Actualiza los permisos en tu navegador.";
    } else if (error.name === 'NotFoundError') {
        message = "No se encontró cámara disponible";
    } else if (error.name === 'NotReadableError') {
        message = "La cámara está siendo usada por otra aplicación";
    }
    
    showError(message);
}

// 4. Función para mostrar errores
function showError(message) {
    resultsDiv.innerHTML = `
        <div class="error-message">
            <p>❌ ${message}</p>
            <ul class="tips">
                <li>▸ Asegúrate de dar permisos de cámara</li>
                <li>▸ Prueba en otro navegador (Chrome/Firefox)</li>
                <li>▸ Verifica que ninguna otra app use la cámara</li>
            </ul>
            <button onclick="window.location.reload()">Reintentar</button>
        </div>
    `;
}

// 5. Controlador principal
async function initApp() {
    if (!checkCameraSupport()) return;
    
    startBtn.disabled = true;
    resultsDiv.innerHTML = "<p>Iniciando cámara...</p>";
    
    try {
        const cameraReady = await setupCamera();
        if (cameraReady) {
            startBtn.disabled = false;
            resultsDiv.innerHTML = `
                <p>✅ Cámara lista</p>
                <p>Presiona "Analizar mi rostro" para comenzar</p>
            `;
        }
    } catch (error) {
        console.error("Error crítico:", error);
        showError("Error inicializando la aplicación");
    }
}

// Iniciar al cargar la página
window.addEventListener('DOMContentLoaded', initApp);

// 6. Interfaz de usuario
function updateStatus(message) {
    resultsDiv.innerHTML = `<div class="status-message">${message}</div>`;
}

function showError(message) {
    resultsDiv.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <ul class="tips">
                <li>▸ Acércate a la cámara</li>
                <li>▸ Busca buena iluminación</li>
                <li>▸ Mantén el rostro centrado</li>
            </ul>
        </div>
    `;
}

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
            peinados: ["Lob", "Ondas sueltas", "Capas"],
            gafas: ["Cualquier estilo"]
        },
        "Cuadrado": {
            peinados: ["Ondas", "Media melena", "Flequillo suave"],
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

// Controlador principal
async function runAnalysis() {
    startBtn.disabled = true;
    updateStatus("Iniciando análisis...");
    
    try {
        if (!await loadModels()) return;
        if (!await setupCamera()) return;
        
        const faceType = await detectFaceWithRetry();
        faceType ? showResults(faceType) : showError("No se detectó un rostro válido.");
    } catch (error) {
        console.error("Error crítico:", error);
        showError("Error inesperado. Recarga la página.");
    } finally {
        startBtn.disabled = false;
    }
}

// Eventos
startBtn.addEventListener('click', runAnalysis);

// Precarga inicial
window.addEventListener('DOMContentLoaded', () => {
    loadModels().catch(console.error);
});