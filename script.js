// Configuración y variables globales
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const tryonCanvas = document.getElementById('tryonCanvas');
const startCameraBtn = document.getElementById('startCamera');
const analyzeFaceBtn = document.getElementById('analyzeFace');
const retryAnalysisBtn = document.getElementById('retryAnalysis');
const toggleLandmarksBtn = document.getElementById('toggleLandmarks');
const resultsSection = document.getElementById('resultsSection');
const loadingIndicator = document.getElementById('loading');
const shapeResult = document.getElementById('shapeResult');
const shapeIcon = document.getElementById('shapeIcon');
const hairstyleRecommendations = document.getElementById('hairstyleRecommendations');
const glassesRecommendations = document.getElementById('glassesRecommendations');
const necklineRecommendations = document.getElementById('necklineRecommendations');
const tryonItemsContainer = document.getElementById('tryonItemsContainer');

// Variables para el análisis facial
let stream = null;
let faceDetected = false;
let faceShape = null;
let landmarks = null;
let modelsLoaded = false;
let isLandmarksVisible = false;

// Estado de la cámara
let cameraActive = false;

// Elementos de prueba
const tryonItems = {
    hairstyle: [
        { name: 'Corte clásico', image: 'https://picsum.photos/seed/hairstyle1/300/300.jpg', width: 100, height: 200 },
        { name: 'Pelo largo con ondas', image: 'https://picsum.photos/seed/hairstyle2/300/300.jpg', width: 100, height: 200 },
        { name: 'Corte degradado', image: 'https://picsum.photos/seed/hairstyle3/300/300.jpg', width: 100, height: 200 }
    ],
    glasses: [
        { name: 'Gafas redondas', image: 'https://picsum.photos/seed/glasses1/300/300.jpg', width: 150, height: 150 },
        { name: 'Gafas cuadradas', image: 'https://picsum.photos/seed/glasses2/300/300.jpg', width: 150, height: 150 },
        { name: 'Gafas de aro fino', image: 'https://picsum.photos/seed/glasses3/300/300.jpg', width: 150, height: 150 }
    ],
    makeup: [
        { name: 'Maquillaje natural', image: 'https://picsum.photos/seed/makeup1/300/300.jpg', width: 150, height: 150 },
        { name: 'Maquillaje de fiesta', image: 'https://picsum.photos/seed/makeup2/300/300.jpg', width: 150, height: 150 },
        { name: 'Maquillaje de trabajo', image: 'https://picsum.photos/seed/makeup3/300/300.jpg', width: 150, height: 150 }
    ]
};

// Recomendaciones por forma de rostro
const recommendations = {
    oval: {
        hairstyles: [
            { name: 'Peinado clásico', description: 'Se adapta perfectamente a tu forma de rostro ovalado.', image: 'https://picsum.photos/seed/hairstyle1/300/200.jpg' },
            { name: 'Pelo largo con ondas', description: 'Acentúa la longitud de tu rostro de forma elegante.', image: 'https://picsum.photos/seed/hairstyle2/300/200.jpg' },
            { name: 'Corte degradado', description: 'Equilibra perfectamente las proporciones de tu rostro.', image: 'https://picsum.photos/seed/hairstyle3/300/200.jpg' }
        ],
        glasses: [
            { name: 'Gafas redondas', description: 'Se adaptan perfectamente a tu forma de rostro.', image: 'https://picsum.photos/seed/glasses1/300/200.jpg' },
            { name: 'Gafas cuadradas', description: 'Crean un contraste interesante con tu rostro.', image: 'https://picsum.photos/seed/glasses2/300/200.jpg' },
            { name: 'Gafas de aro fino', description: 'Sencillas y elegantes para tu forma de rostro.', image: 'https://picsum.photos/seed/glasses3/300/200.jpg' }
        ],
        necklines: [
            { name: 'Escote en V', description: 'Enfatiza la longitud de tu rostro ovalado.', image: 'https://picsum.photos/seed/neckline1/300/200.jpg' },
            { name: 'Escote redondo', description: 'Simple y elegante para tu forma de rostro.', image: 'https://picsum.photos/seed/neckline2/300/200.jpg' },
            { name: 'Escote halter', description: 'Crea una línea de simetría que complementa tu rostro.', image: 'https://picsum.photos/seed/neckline3/300/200.jpg' }
        ]
    },
    round: {
        hairstyles: [
            { name: 'Pelo con volumen en la parte superior', description: 'Añade altura para crear la ilusión de un rostro más alargado.', image: 'https://picsum.photos/seed/hairstyle4/300/200.jpg' },
            { name: 'Corte bob con capas', description: 'Define mejor las líneas de tu rostro redondo.', image: 'https://picsum.photos/seed/hairstyle5/300/200.jpg' },
            { name: 'Pelo con raya al lado', description: 'Crea un punto de interés que alarga visualmente el rostro.', image: 'https://picsum.photos/seed/hairstyle6/300/200.jpg' }
        ],
        glasses: [
            { name: 'Gafas geométricas', description: 'Añaden líneas angulares que equilibran tu rostro.', image: 'https://picsum.photos/seed/glasses4/300/200.jpg' },
            { name: 'Gafas rectangulares', description: 'Alargan visualmente tu rostro redondo.', image: 'https://picsum.photos/seed/glasses5/300/200.jpg' },
            { name: 'Gafas con montura gruesa', description: 'Añaden estructura a tu rostro redondo.', image: 'https://picsum.photos/seed/glasses6/300/200.jpg' }
        ],
        necklines: [
            { name: 'Escote en V profundo', description: 'Crea la ilusión de un rostro más alargado.', image: 'https://picsum.photos/seed/neckline4/300/200.jpg' },
            { name: 'Escote asimétrico', description: 'Añade interés y equilibrio a tu rostro redondo.', image: 'https://picsum.photos/seed/neckline5/300/200.jpg' },
            { name: 'Escote con drapeado', description: 'Define mejor las líneas de tu rostro.', image: 'https://picsum.photos/seed/neckline6/300/200.jpg' }
        ]
    },
    square: {
        hairstyles: [
            { name: 'Pelo con volumen en las mejillas', description: 'Equilibra las líneas de tu rostro cuadrado.', image: 'https://picsum.photos/seed/hairstyle7/300/200.jpg' },
            { name: 'Corte con capas', description: 'Suaviza las líneas angular de tu rostro.', image: 'https://picsum.photos/seed/hairstyle8/300/200.jpg' },
            { name: 'Corte con volumen en la parte superior', description: 'Añade más anchura para equilibrar tu rostro.', image: 'https://picsum.photos/seed/hairstyle9/300/200.jpg' }
        ],
        glasses: [
            { name: 'Gafas redondas', description: 'Suavizan las líneas angular de tu rostro.', image: 'https://picsum.photos/seed/glasses7/300/200.jpg' },
            { name: 'Gafas ovaladas', description: 'Contrastan con las líneas rectas de tu rostro.', image: 'https://picsum.photos/seed/glasses8/300/200.jpg' },
            { name: 'Gafas de aro grueso', description: 'Equilibran las líneas de tu rostro cuadrado.', image: 'https://picsum.photos/seed/glasses9/300/200.jpg' }
        ],
        necklines: [
            { name: 'Escote redondo', description: 'Suaviza las líneas angular de tu rostro.', image: 'https://picsum.photos/seed/neckline7/300/200.jpg' },
            { name: 'Escote con volantes', description: 'Añade suavidad a las líneas de tu rostro.', image: 'https://picsum.photos/seed/neckline8/300/200.jpg' },
            { name: 'Escote en pico', description: 'Crea un punto de interés que equilibra tu rostro.', image: 'https://picsum.photos/seed/neckline9/300/200.jpg' }
        ]
    },
    long: {
        hairstyles: [
            { name: 'Pelo con volumen en la parte superior', description: 'Añade anchura para equilibrar la longitud de tu rostro.', image: 'https://picsum.photos/seed/hairstyle10/300/200.jpg' },
            { name: 'Pelo con capas horizontales', description: 'Crea líneas horizontales para equilibrar tu rostro alargado.', image: 'https://picsum.photos/seed/hairstyle11/300/200.jpg' },
            { name: 'Corte con raya al medio', description: 'Añade simetría que complementa tu forma de rostro.', image: 'https://picsum.photos/seed/hairstyle12/300/200.jpg' }
        ],
        glasses: [
            { name: 'Gafas redondas', description: 'Suavizan la longitud de tu rostro.', image: 'https://picsum.photos/seed/glasses10/300/200.jpg' },
            { name: 'Gafas cuadradas', description: 'Añaden anchura para equilibrar tu rostro.', image: 'https://picsum.photos/seed/glasses11/300/200.jpg' },
            { name: 'Gafas con montura ancha', description: 'Añaden estructura horizontal a tu rostro.', image: 'https://picsum.photos/seed/glasses12/300/200.jpg' }
        ],
        necklines: [
            { name: 'Escote redondo', description: 'Añade anchura para equilibrar la longitud de tu rostro.', image: 'https://picsum.photos/seed/neckline10/300/200.jpg' },
            { name: 'Escote halter', description: 'Crea una línea horizontal que equilibra tu rostro.', image: 'https://picsum.photos/seed/neckline11/300/200.jpg' },
            { name: 'Escote con cuello alto', description: 'Suaviza la longitud de tu rostro.', image: 'https://picsum.photos/seed/neckline12/300/200.jpg' }
        ]
    }
};

// Inicialización de la aplicación
async function init() {
    try {
        // Cargar modelos de face-api.js
        await loadFaceApiModels();
        
        // Configurar eventos
        setupEventListeners();
        
        // Preparar el canvas de prueba
        prepareTryonCanvas();
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        showNotification('Hubo un error durante la inicialización. Por favor, recarga la página.', 'error');
    }
}

// Cargar modelos de face-api.js
async function loadFaceApiModels() {
    loadingIndicator.textContent = 'Cargando modelos de detección...';
    
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('https://justadreamer.github.io/face-api.js-models/'),
            faceapi.nets.faceLandmark68Net.loadFromUri('https://justadreamer.github.io/face-api.js-models/'),
            faceapi.nets.faceRecognitionNet.loadFromUri('https://justadreamer.github.io/face-api.js-models/'),
            faceapi.nets.faceExpressionNet.loadFromUri('https://justadreamer.github.io/face-api.js-models/')
        ]);
        
        modelsLoaded = true;
        loadingIndicator.classList.add('hidden');
        startCameraBtn.disabled = false;
        showNotification('Modelos cargados correctamente. ¡Prepárate para iniciar la cámara!', 'success');
    } catch (error) {
        console.error('Error al cargar los modelos:', error);
        loadingIndicator.textContent = 'Error al cargar los modelos. Por favor, recarga la página.';
        showNotification('No se pudieron cargar los modelos de detección. Por favor, recarga la página.', 'error');
    }
}

// Configurar eventos
function setupEventListeners() {
    // Iniciar cámara
    startCameraBtn.addEventListener('click', async () => {
        if (cameraActive) {
            stopCamera();
            startCameraBtn.textContent = 'Iniciar Cámara';
            analyzeFaceBtn.disabled = true;
            toggleLandmarksBtn.classList.add('hidden');
            return;
        }
        
        try {
            await setupCamera();
            startCameraBtn.textContent = 'Detener Cámara';
            analyzeFaceBtn.disabled = false;
            toggleLandmarksBtn.classList.remove('hidden');
        } catch (error) {
            showNotification('No se pudo iniciar la cámara. Por favor, verifica los permisos.', 'error');
        }
    });
    
    // Analizar rostro
    analyzeFaceBtn.addEventListener('click', async () => {
        analyzeFaceBtn.disabled = true;
        retryAnalysisBtn.classList.add('hidden');
        
        try {
            await detectFace();
            
            if (faceDetected) {
                analyzeFaceShape();
                displayResults();
                resultsSection.classList.remove('hidden');
            } else {
                retryAnalysisBtn.classList.remove('hidden');
                showNotification('No se detectó ningún rostro. Por favor, intenta de nuevo.', 'warning');
            }
        } catch (error) {
            console.error('Error durante el análisis facial:', error);
            retryAnalysisBtn.classList.remove('hidden');
            showNotification('Hubo un error durante el análisis. Por favor, intenta de nuevo.', 'error');
        } finally {
            analyzeFaceBtn.disabled = false;
        }
    });
    
    // Reintentar análisis
    retryAnalysisBtn.addEventListener('click', () => {
        analyzeFaceBtn.click();
    });
    
    // Alternar visibilidad de puntos clave
    toggleLandmarksBtn.addEventListener('click', () => {
        isLandmarksVisible = !isLandmarksVisible;
        overlay.style.display = isLandmarksVisible ? 'block' : 'none';
        toggleLandmarksBtn.textContent = isLandmarksVisible ? 'Ocultar Puntos Clave' : 'Mostrar Puntos Clave';
    });
    
    // Tabs de recomendaciones
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and content
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
    
    // Opciones de prueba
    document.querySelectorAll('.tryon-option-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.tryon-option-item').forEach(opt => opt.classList.remove('active'));
            item.classList.add('active');
            
            const type = item.dataset.type;
            loadTryonItems(type);
        });
    });
    
    // Selección de tipo de prueba
    document.querySelectorAll('input[name="tryon-type"]').forEach(input => {
        input.addEventListener('change', () => {
            const type = input.value;
            loadTryonItems(type);
        });
    });
}

// Configuración y control de la cámara
async function setupCamera() {
    if (stream) {
        stopCamera();
    }
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        
        video.srcObject = stream;
        cameraActive = true;
        
        // Esperar a que el video esté cargado
        await new Promise(resolve => {
            video.onloadedmetadata = resolve;
        });
        
        return video;
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        throw error;
    }
}

// Detener la cámara
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        cameraActive = false;
    }
    
    if (video.srcObject) {
        video.srcObject = null;
    }
}

// Detección facial con face-api.js
async function detectFace() {
    if (!modelsLoaded) {
        throw new Error('Modelos de face-api.js no cargados');
    }
    
    if (!cameraActive) {
        throw new Error('La cámara no está activa');
    }
    
    try {
        // Detectar rostro
        const detections = await faceapi.detectSingleFace(
            video, 
            new faceapi.TinyFaceDetector.Options({ inputSize: 320, scoreThreshold: 0.5 })
        ).withFaceLandmarks();
        
        if (!detections) {
            return false;
        }
        
        // Guardar puntos de referencia
        landmarks = detections.landmarks.positions;
        
        // Dibujar puntos de referencia
        drawLandmarks(detections);
        
        // Determinar si se detectó un rostro
        faceDetected = true;
        return true;
    } catch (error) {
        console.error('Error durante la detección facial:', error);
        throw error;
    }
}

// Dibujar puntos de referencia
function drawLandmarks(detections) {
    if (!detections) return;
    
    const ctx = overlay.getContext('2d');
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    
    // Dibujar puntos de referencia
    ctx.fillStyle = 'rgba(74, 111, 165, 0.7)';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    detections.landmarks.positions.forEach(point => {
        const x = point.x;
        const y = point.y;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
    
    // Dibujar contorno del rostro
    const faceContour = [
        ...detections.landmarks.getJawOutline(),
        ...detections.landmarks.getJawOutline().slice().reverse()
    ];
    
    ctx.beginPath();
    ctx.moveTo(faceContour[0].x, faceContour[0].y);
    
    for (let i = 1; i < faceContour.length; i++) {
        ctx.lineTo(faceContour[i].x, faceContour[i].y);
    }
    
    ctx.closePath();
    ctx.strokeStyle = 'rgba(74, 111, 165, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Analizar la forma del rostro
function analyzeFaceShape() {
    if (!landmarks) return;
    
    // Calcular proporciones del rostro
    const foreheadY = landmarks[19].y; // Punto en la frente
    const chinY = landmarks[8].y; // Punto en el mentón
    const leftCheekX = landmarks[4].x; // Punto en la mejilla izquierda
    const rightCheekX = landmarks[12].x; // Punto en la mejilla derecha
    const jawWidth = Math.abs(rightCheekX - leftCheekX); // Ancho del maxilar
    const faceHeight = Math.abs(chinY - foreheadY); // Altura del rostro
    
    // Calcular el ratio de anchura a altura
    const ratio = jawWidth / faceHeight;
    
    // Determinar la forma del rostro basada en el ratio
    if (ratio > 0.8 && ratio < 1.2) {
        // Proporciones cercanas a 1:1
        faceShape = 'ovalado';
    } else if (ratio <= 0.8) {
        // Más ancho que alto
        faceShape = 'redondo';
    } else if (ratio >= 1.2 && jawWidth > faceHeight * 0.8) {
        // Más alto que ancho, con maxilar ancho
        faceShape = 'cuadrado';
    } else {
        // Más alto que ancho
        faceShape = 'alargado';
    }
    
    console.log(`Forma del rostro detectada: ${faceShape}`);
}

// Mostrar resultados
function displayResults() {
    // Mostrar forma del rostro
    shapeResult.textContent = `Tu forma de rostro es ${faceShape}`;
    
    // Mostrar icono correspondiente
    let iconClass = '';
    switch (faceShape) {
        case 'ovalado':
            iconClass = '🟢';
            break;
        case 'redondo':
            iconClass = '🔵';
            break;
        case 'cuadrado':
            iconClass = '⬛';
            break;
        case 'alargado':
            iconClass = '⬜';
            break;
        default:
            iconClass = '❓';
    }
    shapeIcon.textContent = iconClass;
    
    // Generar recomendaciones
    generateRecommendations();
}

// Generar recomendaciones según la forma del rostro
function generateRecommendations() {
    if (!faceShape) return;
    
    // Recomendaciones de peinados
    hairstyleRecommendations.innerHTML = generateRecommendationCards(recommendations[faceShape].hairstyles);
    
    // Recomendaciones de gafas
    glassesRecommendations.innerHTML = generateRecommendationCards(recommendations[faceShape].glasses);
    
    // Recomendaciones de escotes
    necklineRecommendations.innerHTML = generateRecommendationCards(recommendations[faceShape].necklines);
}

// Generar tarjetas de recomendación
function generateRecommendationCards(items) {
    return items.map(item => `
        <div class="recommendation-card">
            <img src="${item.image}" alt="${item.name}">
            <div class="recommendation-card-content">
                <h3>${item.name}</h3>
                <p>${item.description}</p>
            </div>
        </div>
    `).join('');
}

// Preparar el canvas de prueba
function prepareTryonCanvas() {
    tryonCanvas.width = 640;
    tryonCanvas.height = 480;
    
    const ctx = tryonCanvas.getContext('2d');
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, tryCanvas.width, tryonCanvas.height);
    
    // Cargar elementos iniciales para probar
    loadTryonItems('hairstyle');
}

// Cargar elementos para probar
function loadTryonItems(type) {
    // Limpiar contenedor
    tryonItemsContainer.innerHTML = '';
    
    // Crear elementos para probar
    tryonItems[type].forEach((item, index) => {
        const tryonItem = document.createElement('div');
        tryonItem.className = 'tryon-item';
        tryonItem.dataset.index = index;
        tryonItem.dataset.type = type;
        
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.width = item.width;
        img.height = item.height;
        
        tryonItem.appendChild(img);
        tryonItemsContainer.appendChild(tryonItem);
        
        // Añadir evento de clic para seleccionar el elemento
        tryonItem.addEventListener('click', () => {
            document.querySelectorAll('.tryon-item').forEach(item => item.classList.remove('selected'));
            tryonItem.classList.add('selected');
            
            // Posicionar el elemento sobre el rostro
            positionTryonItem(tryonItem);
        });
    });
}

// Posicionar elemento sobre el rostro
function positionTryonItem(item) {
    if (!landmarks) return;
    
    const type = item.dataset.type;
    const index = parseInt(item.dataset.index);
    const img = item.querySelector('img');
    
    // Calcular posición basada en puntos de referencia
    const faceWidth = Math.abs(landmarks[12].x - landmarks[4].x);
    const faceHeight = Math.abs(landmarks[8].y - landmarks[19].y);
    
    let x, y, width, height;
    
    switch (type) {
        case 'hairstyle':
            // Posicionar en la parte superior del rostro
            x = landmarks[19].x - faceWidth * 0.3;
            y = landmarks[19].y - faceHeight * 0.5;
            width = faceWidth * 1.6;
            height = faceHeight * 1.5;
            break;
        case 'glasses':
            // Posicionar sobre los ojos
            x = landmarks[37].x;
            y = landmarks[37].y - faceHeight * 0.05;
            width = faceWidth * 0.8;
            height = faceHeight * 0.3;
            break;
        case 'makeup':
            // Posicionar en el rostro
            x = landmarks[0].x;
            y = landmarks[0].y;
            width = faceWidth * 1.2;
            height = faceHeight * 1.2;
            break;
    }
    
    // Aplicar transformaciones
    img.style.position = 'absolute';
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.style.transform = 'none';
    
    // Redibujar puntos de referencia si están visibles
    if (isLandmarksVisible) {
        drawLandmarks();
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Estilos para la notificación
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = type === 'error' ? '#dc3545' : 
                                     type === 'success' ? '#28a745' : 
                                     type === 'warning' ? '#ffc107' : '#17a2b8';
    notification.style.color = type === 'warning' ? '#212529' : 'white';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    notification.style.zIndex = '1000';
    notification.style.minWidth = '250px';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Añadir a DOM
    document.body.appendChild(notification);
    
    // Mostrar notificación
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Ocultar y eliminar después de 5 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Limpieza al cerrar la página
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// Inicializar la aplicación
window.addEventListener('DOMContentLoaded', init);