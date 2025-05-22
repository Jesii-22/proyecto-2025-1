// Elementos del DOM
const startBtn = document.getElementById('start-btn');
const resultsDiv = document.getElementById('results');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

// Configuración
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let detectionInterval = null;

// Recomendaciones
const recommendations = {
    ovalado: {
        peinados: ["Capas largas", "Corte bob", "Flequillo lateral"],
        gafas: ["Aviador", "Rectangulares delgadas"]
    },
    redondo: {
        peinados: ["Largo con volumen arriba", "Corte pixie"],
        gafas: ["Rectangulares anchas", "Mariposa"]
    },
    cuadrado: {
        peinados: ["Ondas sueltas", "Corte en capas"],
        gafas: ["Redondas", "Ovaladas"]
    },
    corazón: {
        peinados: ["Corte lob", "Flequillo corto"],
        gafas: ["Aviador", "Rectangulares estrechas"]
    }
};

// 1. Cargar modelos de IA
async function loadModels() {
    try {
        console.log("Cargando modelos...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log("Modelos cargados correctamente");
        return true;
    } catch (error) {
        console.error("Error cargando modelos:", error);
        resultsDiv.innerHTML = '<p class="error">Error al cargar los modelos. Recarga la página.</p>';
        return false;
    }
}

// 2. Iniciar cámara con verificación
async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user"
            } 
        });
        
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                // Ajustar canvas al tamaño real del video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log(`Tamaño del video: ${video.videoWidth}x${video.videoHeight}`);
                resolve(true);
            };
            
            video.onerror = () => {
                console.error("Error en el elemento de video");
                resolve(false);
            };
        });
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        let errorMessage = "Error al acceder a la cámara. ";
        
        if (error.name === 'NotAllowedError') {
            errorMessage += "Por favor permite el acceso a la cámara.";
        } else if (error.name === 'NotFoundError') {
            errorMessage += "No se encontró cámara disponible.";
        }
        
        resultsDiv.innerHTML = `<p class="error">${errorMessage}</p>`;
        return false;
    }
}

// 3. Determinar forma del rostro con validación
function getFaceShape(landmarks) {
    try {
        const jaw = landmarks.getJawOutline();
        const nose = landmarks.getNose();
        
        // Puntos clave
        const leftJaw = jaw[0];
        const rightJaw = jaw[16];
        const chin = jaw[8];
        const noseBottom = nose[6];
        
        // Cálculos
        const jawWidth = faceapi.euclideanDistance(leftJaw, rightJaw);
        const faceLength = faceapi.euclideanDistance(chin, noseBottom);
        const ratio = jawWidth / faceLength;

        // Lógica de clasificación mejorada
        if (ratio > 0.92) return 'redondo';
        if (ratio < 0.83) return 'corazón';
        if (Math.abs(jawWidth - faceLength) < 15) return 'cuadrado';
        return 'ovalado';
    } catch (error) {
        console.error("Error en getFaceShape:", error);
        return 'ovalado'; // Valor por defecto
    }
}

// 4. Función principal de análisis
async function analyzeFace() {
    try {
        console.log("Iniciando análisis facial...");
        
        const detectionOptions = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
        });

        const detections = await faceapi.detectAllFaces(video, detectionOptions)
            .withFaceLandmarks();
        
        console.log(`${detections.length} rostros detectados`);
        
        // Limpiar canvas previo
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections.length > 0) {
            // Dibujar resultados (visible para debug)
            faceapi.draw.drawDetections(canvas, detections);
            faceapi.draw.drawFaceLandmarks(canvas, detections);
            
            const shape = getFaceShape(detections[0].landmarks);
            const recs = recommendations[shape] || recommendations.ovalado;
            
            // Mostrar resultados
            resultsDiv.innerHTML = `
                <h3>¡Resultados!</h3>
                <p><strong>Forma del rostro:</strong> ${shape}</p>
                <p><strong>Peinados ideales:</strong> ${recs.peinados.join(', ')}</p>
                <p><strong>Gafas recomendadas:</strong> ${recs.gafas.join(', ')}</p>
                <small>Nota: Los puntos de referencia se muestran para verificación</small>
            `;
        } else {
            resultsDiv.innerHTML = `
                <p class="warning">No se detectó ningún rostro</p>
                <ul>
                    <li>Asegúrate de estar bien iluminado</li>
                    <li>Mantén una distancia de ~50cm</li>
                    <li>Posición frontal sin inclinar la cabeza</li>
                </ul>
            `;
        }
    } catch (error) {
        console.error("Error en analyzeFace:", error);
        resultsDiv.innerHTML = '<p class="error">Error durante el análisis. Intenta de nuevo.</p>';
    }
}

// 5. Controlador principal
async function runAnalysis() {
    startBtn.disabled = true;
    resultsDiv.innerHTML = '<p>Inicializando...</p>';
    
    try {
        // Paso 1: Cargar modelos
        resultsDiv.innerHTML = '<p>Cargando IA...</p>';
        const modelsLoaded = await loadModels();
        if (!modelsLoaded) return;
        
        // Paso 2: Iniciar cámara
        resultsDiv.innerHTML = '<p>Configurando cámara...</p>';
        const videoStarted = await startVideo();
        if (!videoStarted) return;
        
        // Paso 3: Analizar
        resultsDiv.innerHTML = '<p>Analizando rostro...</p>';
        await analyzeFace();
        
    } finally {
        startBtn.disabled = false;
    }
}

// Eventos
startBtn.addEventListener('click', runAnalysis);

// Precarga inicial
document.addEventListener('DOMContentLoaded', () => {
    loadModels();
    console.log("Aplicación lista. Presiona el botón para comenzar.");
});