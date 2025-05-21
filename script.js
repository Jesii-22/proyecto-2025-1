// Elementos del DOM
const startBtn = document.getElementById('start-btn');
const resultsDiv = document.getElementById('results');

// Configuración
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

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

// Cargar modelos de IA
async function loadModels() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('Modelos cargados correctamente');
        return true;
    } catch (error) {
        console.error("Error cargando modelos:", error);
        resultsDiv.innerHTML = '<p class="error">Error al cargar los modelos. Recarga la página.</p>';
        return false;
    }
}

// Iniciar cámara
async function startVideo() {
    const video = document.getElementById('video');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 400, height: 300 } 
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => resolve(true);
        });
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        resultsDiv.innerHTML = '<p class="error">No se pudo acceder a la cámara. Asegúrate de dar los permisos.</p>';
        return false;
    }
}

// Determinar forma del rostro
function getFaceShape(landmarks) {
    const jaw = landmarks.getJawOutline();
    const nose = landmarks.getNose();
    
    const jawWidth = faceapi.euclideanDistance(jaw[0], jaw[16]);
    const faceLength = faceapi.euclideanDistance(jaw[8], nose[6]);
    const ratio = jawWidth / faceLength;

    if (ratio > 0.92) return 'redondo';
    if (ratio < 0.85) return 'corazón';
    return Math.abs(jawWidth - faceLength) < 15 ? 'cuadrado' : 'ovalado';
}

// Analizar rostro
async function analyzeFace() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const displaySize = { width: video.width, height: video.height };
    
    faceapi.matchDimensions(canvas, displaySize);
    
    try {
        const detections = await faceapi.detectAllFaces(video, 
            new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();
        
        if (detections.length > 0) {
            const shape = getFaceShape(detections[0].landmarks);
            const recs = recommendations[shape] || recommendations.ovalado;
            
            resultsDiv.innerHTML = `
                <h3>¡Análisis completo!</h3>
                <p><strong>Forma de tu rostro:</strong> ${shape}</p>
                <p><strong>Peinados recomendados:</strong><br>
                ${recs.peinados.join(', ')}</p>
                <p><strong>Gafas recomendadas:</strong><br>
                ${recs.gafas.join(', ')}</p>
            `;
        } else {
            resultsDiv.innerHTML = '<p class="warning">No se detectó ningún rostro. Asegúrate de estar bien iluminado.</p>';
        }
    } catch (error) {
        console.error("Error en el análisis:", error);
        resultsDiv.innerHTML = '<p class="error">Error durante el análisis. Intenta de nuevo.</p>';
    }
}

// Manejador del botón
startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    resultsDiv.innerHTML = '<p>Analizando... Por favor espera</p>';
    
    const modelsLoaded = await loadModels();
    const videoStarted = await startVideo();
    
    if (modelsLoaded && videoStarted) {
        await analyzeFace();
    }
    
    startBtn.disabled = false;
});

// Precargar modelos cuando la página carga
window.addEventListener('DOMContentLoaded', () => {
    loadModels();
});