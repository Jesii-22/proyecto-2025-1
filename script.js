// Función para cargar scripts dinámicamente y esperar a que estén listos
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Configuración de Face Mesh (solo se ejecuta cuando los scripts están cargados)
async function setupFaceMesh() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
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

    return faceMesh;
}

// Funciones para dibujar (sin cambios)
function drawLandmarks(ctx, landmarks) {
    ctx.fillStyle = '#FF0000';
    for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

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

// Inicia la cámara y Face Mesh
async function startApp() {
    try {
        // 1. Carga los scripts de MediaPipe
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');

        // 2. Configura Face Mesh
        const faceMesh = await setupFaceMesh();

        // 3. Inicia la cámara
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            setInterval(async () => {
                await faceMesh.send({ image: video });
            }, 100);
        };
    } catch (err) {
        console.error("Error:", err);
        alert("Error al iniciar la cámara o cargar MediaPipe. Verifica la consola.");
    }
}

// Inicia la aplicación cuando la página se carga
window.onload = startApp;