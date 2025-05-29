// Variables globales
let stream = null;
let faceMesh = null;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toggleBtn = document.getElementById('toggleCamera');
const statusText = document.getElementById('status');

// Función para cargar scripts de MediaPipe dinámicamente
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Error al cargar el script: ${src}`));
        document.head.appendChild(script);
    });
}

// Configura Face Mesh
async function setupFaceMesh() {
    faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    await faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (results.multiFaceLandmarks) {
            for (const landmarks of results.multiFaceLandmarks) {
                drawLandmarks(ctx, landmarks);
                drawFaceContour(ctx, landmarks);
            }
        }
    });
}

// Dibuja landmarks (puntos faciales)
function drawLandmarks(ctx, landmarks) {
    ctx.fillStyle = '#FF0000';
    for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// Dibuja contorno del rostro
function drawFaceContour(ctx, landmarks) {
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const faceOvalIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288];
    for (const index of faceOvalIndices) {
        const point = landmarks[index];
        if (index === faceOvalIndices[0]) {
            ctx.moveTo(point.x * canvas.width, point.y * canvas.height);
        } else {
            ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }
    }
    ctx.closePath();
    ctx.stroke();
}

// Inicia la cámara
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            statusText.textContent = "Estado: Cámara activa ✅";
            statusText.style.color = "green";
            
            // Procesa cada frame
            setInterval(async () => {
                if (faceMesh) await faceMesh.send({ image: video });
            }, 100);
        };
    } catch (err) {
        statusText.textContent = `Error: ${err.message}`;
        statusText.style.color = "red";
        console.error("Error al acceder a la cámara:", err);
    }
}

// Detiene la cámara
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        statusText.textContent = "Estado: Cámara detenida ⏹️";
        statusText.style.color = "#7f8c8d";
    }
}

// Inicializa la aplicación
async function initApp() {
    try {
        // Carga los scripts de MediaPipe
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
        
        // Configura Face Mesh
        await setupFaceMesh();
        
        // Controlador del botón
        toggleBtn.addEventListener('click', async () => {
            if (!stream) {
                await startCamera();
                toggleBtn.textContent = "Detener Cámara";
            } else {
                stopCamera();
                toggleBtn.textContent = "Iniciar Cámara";
            }
        });
        
    } catch (err) {
        statusText.textContent = `Error: ${err.message}`;
        statusText.style.color = "red";
        console.error("Error al inicializar:", err);
    }
}

// Inicia la app cuando la página carga
window.onload = initApp;