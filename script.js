// Configuración global
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
let faceDetectionInterval = null;
let tipoRostro = "";
let paso = 0; // 0: inicio, 1: analizando, 2: resultados

// Elementos del DOM
const startBtn = document.getElementById('start-btn');
const resultsDiv = document.getElementById('results');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Botones adicionales
const btnRecomendaciones = document.createElement('button');
btnRecomendaciones.id = 'btn-recomendaciones';
btnRecomendaciones.textContent = 'Ver recomendaciones';
document.querySelector('.container').appendChild(btnRecomendaciones);

const btnCerrar = document.createElement('button');
btnCerrar.id = 'btn-cerrar';
btnCerrar.textContent = '✕';
document.querySelector('.container').appendChild(btnCerrar);

// Estilos para los botones
btnRecomendaciones.style.display = 'none';
btnRecomendaciones.classList.add('btn-secondary');
btnCerrar.style.display = 'none';
btnCerrar.classList.add('btn-close');

// 1. Cargar modelos optimizados
async function loadModels() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log("Modelos cargados correctamente");
        return true;
    } catch (error) {
        console.error("Error cargando modelos:", error);
        return false;
    }
}

// 2. Iniciar cámara
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
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                resolve(true);
            };
        });
    } catch (error) {
        console.error("Error en cámara:", error);
        return false;
    }
}

// 3. Detección facial basada en landmarks (como en tu p5.js)
async function detectFaces() {
    try {
        const detections = await faceapi.detectAllFaces(video, 
            new faceapi.TinyFaceDetectorOptions({
                inputSize: 384,
                scoreThreshold: 0.5
            }))
            .withFaceLandmarks();

        if (detections.length > 0) {
            const landmarks = detections[0].landmarks;
            
            // Puntos clave (similar a tu código p5.js)
            const jawOutline = landmarks.getJawOutline();
            const nose = landmarks.getNose();
            
            // Puntos específicos
            const menton = jawOutline[8];  // Punto 152 en facemesh
            const frente = jawOutline[0];  // Punto 10 aproximado
            const mejillaIzq = jawOutline[4];  // Punto 234 aproximado
            const mejillaDer = jawOutline[12]; // Punto 454 aproximado
            
            // Dibujar puntos de referencia
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawLandmarkPoint(menton, 'green');
            drawLandmarkPoint(frente, 'green');
            drawLandmarkPoint(mejillaIzq, 'green');
            drawLandmarkPoint(mejillaDer, 'green');
            
            // Cálculos como en tu versión p5.js
            const altoCara = faceapi.euclideanDistance(frente, menton);
            const anchoCara = faceapi.euclideanDistance(mejillaIzq, mejillaDer);
            
            // Clasificación mejorada
            if (altoCara > anchoCara * 1.3) {
                tipoRostro = "Alargado";
            } else if (anchoCara > altoCara * 1.1) {
                tipoRostro = "Ancho/Redondo";
            } else {
                // Análisis adicional para diferenciar ovalado/cuadrado
                const ratioMandibula = faceapi.euclideanDistance(jawOutline[3], jawOutline[13]) / anchoCara;
                tipoRostro = ratioMandibula > 0.85 ? "Cuadrado" : "Ovalado";
            }
            
            return tipoRostro;
        }
        return null;
    } catch (error) {
        console.error("Error en detección:", error);
        return null;
    }
}

function drawLandmarkPoint(point, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fill();
}

// 4. Mostrar resultados como en tu diseño original
function showResults(shape) {
    const recommendations = {
        "Alargado": {
            peinados: ["Peinados con volumen lateral", "Flequillo largo"],
            gafas: ["Rectangulares altas", "Aviador"]
        },
        "Ancho/Redondo": {
            peinados: ["Peinados altos", "Corte pixie"],
            gafas: ["Rectangulares anchas", "Mariposa"]
        },
        "Ovalado": {
            peinados: ["Todo tipo de peinados", "Capas"],
            gafas: ["Cualquier estilo"]
        },
        "Cuadrado": {
            peinados: ["Ondas sueltas", "Corte en capas"],
            gafas: ["Redondas", "Ovaladas"]
        }
    };

    const recs = recommendations[shape] || recommendations.Ovalado;
    
    resultsDiv.innerHTML = `
        <div class="result-card">
            <h3>Análisis Completo</h3>
            <p><strong>Forma de tu rostro:</strong> ${shape}</p>
            
            <div class="recommendations">
                <h4>Recomendaciones:</h4>
                <p><strong>Peinados:</strong> ${recs.peinados.join(', ')}</p>
                <p><strong>Gafas:</strong> ${recs.gafas.join(', ')}</p>
            </div>
        </div>
    `;
    
    // Mostrar botón de recomendaciones
    btnRecomendaciones.style.display = 'block';
    paso = 2;
}

// 5. Función principal
async function analyzeFace() {
    startBtn.disabled = true;
    paso = 1;
    resultsDiv.innerHTML = '<p>Analizando tu rostro...<br>Mira directamente a la cámara</p>';

    try {
        const modelsLoaded = await loadModels();
        if (!modelsLoaded) throw new Error("Error cargando modelos");
        
        const videoReady = await startVideo();
        if (!videoReady) throw new Error("Error en cámara");
        
        // Intento de detección con timeout
        const detectionResult = await Promise.race([
            detectFaces(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Tiempo excedido")), 5000))
        ]);
        
        if (detectionResult) {
            showResults(detectionResult);
        } else {
            throw new Error("No se detectó un rostro claro");
        }
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="error">
                <p>${error.message}</p>
                <ul>
                    <li>Asegúrate de tener buena iluminación</li>
                    <li>Mira directamente a la cámara</li>
                    <li>Intenta acercarte/alejarte</li>
                </ul>
            </div>
        `;
    } finally {
        startBtn.disabled = false;
    }
}

// Eventos
startBtn.addEventListener('click', analyzeFace);
btnRecomendaciones.addEventListener('click', () => {
    btnRecomendaciones.style.display = 'none';
    btnCerrar.style.display = 'block';
    // popup de p5.js?
});

btnCerrar.addEventListener('click', () => {
    btnCerrar.style.display = 'none';
    btnRecomendaciones.style.display = 'block';
});

// Precarga inicial
window.addEventListener('DOMContentLoaded', () => {
    loadModels();
    console.log("Sistema listo. Presiona 'Analizar mi rostro' para comenzar.");
});