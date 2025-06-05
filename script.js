// Reemplaza esto con tu API key de Google Gemini
const GEMINI_API_KEY = 'AIzaSyCwFKPO-Zec8uIG2Sl5zAAr9SMPoOdtyMc';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Elementos del DOM
const fileOption = document.getElementById('fileOption');
const cameraOption = document.getElementById('cameraOption');
const fileInputContainer = document.getElementById('fileInputContainer');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const captureButton = document.getElementById('captureButton');
const confirmButton = document.getElementById('confirmButton');
const retakeButton = document.getElementById('retakeButton');
const capturedImage = document.getElementById('capturedImage');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const loading = document.getElementById('loading');
const faceAnalysis = document.getElementById('faceAnalysis');
const cards = document.getElementById('cards');

let stream = null;
let capturedPhoto = null;

// Función para cambiar entre opciones
function switchInput(type) {
    if (type === 'file') {
        fileOption.classList.add('active');
        cameraOption.classList.remove('active');
        fileInputContainer.classList.add('active');
        cameraContainer.classList.remove('active');
        stopCamera();
        resetCameraUI();
    } else {
        fileOption.classList.remove('active');
        cameraOption.classList.add('active');
        fileInputContainer.classList.remove('active');
        cameraContainer.classList.add('active');
        startCamera();
    }
}

function resetCameraUI() {
    captureButton.style.display = 'block';
    confirmButton.style.display = 'none';
    retakeButton.style.display = 'none';
    capturedImage.style.display = 'none';
    video.style.display = 'block';
    capturedPhoto = null;
}

// Función para iniciar la cámara
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        video.srcObject = stream;
    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        alert('No se pudo acceder a la cámara. Por favor, asegúrate de dar los permisos necesarios.');
    }
}

// Función para detener la cámara
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
    }
}

// Event listeners para los botones de opción
fileOption.addEventListener('click', () => switchInput('file'));
cameraOption.addEventListener('click', () => switchInput('camera'));

// Event listener para el botón de captura
captureButton.addEventListener('click', () => {
    if (!video.videoWidth || !video.videoHeight) {
        alert('La cámara no está lista. Espera unos segundos y vuelve a intentar.');
        return;
    }

    // Crear canvas con dimensiones más pequeñas
    const canvas = document.createElement('canvas');
    // Reducir dimensiones a 480x360 para optimizar tamaño
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Dibujar el frame actual del video con las nuevas dimensiones
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir a blob en formato PNG con compresión
    canvas.toBlob((blob) => {
        if (!blob || blob.size < 10000) {
            alert('La foto capturada no es válida. Intenta tomar la foto de nuevo, asegurándote de que la cámara esté enfocada.');
            resetCameraUI();
            return;
        }

        // Verificar el tamaño del blob
        console.log('Tamaño del blob antes de procesar:', blob.size);

        // Si el blob es muy grande, intentar reducir más la calidad
        if (blob.size > 200000) {
            canvas.toBlob((compressedBlob) => {
                if (compressedBlob) {
                    const file = new File([compressedBlob], 'foto_capturada.png', {
                        type: 'image/png',
                        lastModified: new Date().getTime()
                    });
                    processCapturedImage(file);
                }
            }, 'image/png', 0.7); // Reducir calidad a 70%
        } else {
            const file = new File([blob], 'foto_capturada.png', {
                type: 'image/png',
                lastModified: new Date().getTime()
            });
            processCapturedImage(file);
        }
    }, 'image/png', 0.8); // Reducir calidad inicial a 80%
});

// Función para procesar la imagen capturada
function processCapturedImage(file) {
    // Guardar la foto capturada
    capturedPhoto = file;

    // Mostrar la imagen capturada
    capturedImage.src = URL.createObjectURL(file);
    capturedImage.style.display = 'block';
    video.style.display = 'none';

    // Actualizar UI
    captureButton.style.display = 'none';
    confirmButton.style.display = 'block';
    retakeButton.style.display = 'block';

    console.log('Foto capturada:', file, 'Tipo:', file.type, 'Tamaño:', file.size);
}

// Event listener para el botón de confirmar
confirmButton.addEventListener('click', async () => {
    if (!capturedPhoto) {
        alert('No hay foto para confirmar. Por favor, toma una foto primero.');
        return;
    }

    try {
        // Verificar el tamaño del archivo
        if (capturedPhoto.size > 300000) {
            alert('La imagen es demasiado grande. Por favor, intenta tomar la foto de nuevo.');
            resetCameraUI();
            return;
        }

        stopCamera();
        // Ocultar la imagen de la cámara y los botones
        capturedImage.style.display = 'none';
        confirmButton.style.display = 'none';
        retakeButton.style.display = 'none';

        // Mostrar loading antes de procesar
        mostrarPantallaCargando();

        // Verificar el archivo antes de procesar
        console.log('Procesando foto:', capturedPhoto, 'Tipo:', capturedPhoto.type, 'Tamaño:', capturedPhoto.size);

        if (capturedPhoto.size < 10000) {
            throw new Error('La imagen capturada es demasiado pequeña o inválida');
        }

        await processImage(capturedPhoto);
    } catch (error) {
        console.error('Error al confirmar foto:', error);
        alert('Hubo un error al procesar la foto. Por favor, intenta de nuevo.');
        ocultarPantallaCargando();
        resetCameraUI();
    }
});

// Event listener para el botón de volver a tomar
retakeButton.addEventListener('click', () => {
    resetCameraUI();
});

// Event listener para el input de archivo
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        await processImage(file);
    }
});

async function processImage(file) {
    // Mostrar la imagen
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    preview.innerHTML = '';
    preview.appendChild(img);

    // Log para debug
    console.log('Archivo a procesar:', file, 'Tipo:', file.type, 'Tamaño:', file.size);

    // Mostrar loading
    loading.classList.add('active');
    document.getElementById('loadingOverlay').style.display = 'flex';
    mostrarPantallaCargando();
    faceAnalysis.style.display = 'none';
    cards.innerHTML = '';

    try {
        // Convertir la imagen a base64
        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64Image = e.target.result.split(',')[1];
            // Detectar el tipo MIME real del archivo
            const mimeType = file.type || 'image/png';
            // Pasar el tipo MIME a analyzeImage
            const analysis = await analyzeImage(base64Image, mimeType);

            // Mostrar el tipo de rostro
            document.getElementById('faceType').textContent = analysis.faceType;
            faceAnalysis.style.display = 'block';

            // Mostrar las recomendaciones
            analysis.recommendations.forEach(p => {
                const div = document.createElement('div');
                div.className = 'card';
                div.innerHTML = `
                    <h3>✂️ ${p.name}</h3>
                    <p>${p.description}</p>
                    <iframe class="preview-frame" 
                            src="https://www.google.com/search?igu=1&q=${encodeURIComponent(p.query)}&tbm=isch"
                            loading="lazy">
                    </iframe>
                    <a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p.query)}" 
                       target="_blank" 
                       rel="noopener noreferrer">
                        Ver más ejemplos
                    </a>
                `;
                cards.appendChild(div);
            });
            // Ocultar loading SOLO después de mostrar las tarjetas
            loading.classList.remove('active');
            document.getElementById('loadingOverlay').style.display = 'none';
            ocultarPantallaCargando();
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un error al analizar la imagen. Por favor, intenta de nuevo.');
        loading.classList.remove('active');
        document.getElementById('loadingOverlay').style.display = 'none';
        ocultarPantallaCargando();
    }
}

async function analyzeImage(imageData, mimeType) {
    try {
        // Verificar que el tipo MIME sea PNG
        if (mimeType !== 'image/png') {
            throw new Error('La imagen debe estar en formato PNG');
        }

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Analiza esta imagen de un rostro humano y recomienda 3 peinados que se adapten bien a la forma de la cara. Para cada peinado, proporciona: 1) Nombre del peinado, 2) Breve descripción, 3) Tipo de rostro al que mejor se adapta, 4) Una query de búsqueda en inglés para Google Images. RESPONDE SOLO EN ESPAÑOL y SOLO con el JSON, sin markdown ni backticks, con esta estructura: {faceType: 'tipo de rostro', recommendations: [{name: 'nombre', description: 'descripción', query: 'términos de búsqueda en inglés'}]}"
                    }, {
                        inline_data: {
                            mime_type: 'image/png',
                            data: imageData
                        }
                    }]
                }]
            })
        });

        if (!response.ok) {
            if (response.status === 503) {
                throw new Error('El servicio de Gemini está temporalmente no disponible. Por favor, intenta de nuevo en unos minutos.');
            }
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
            throw new Error('La API no devolvió una respuesta válida. Puede que la imagen no sea adecuada o haya un problema de conexión.');
        }
        const responseText = data.candidates[0].content.parts[0].text;

        // Limpiar la respuesta de posibles backticks y markdown
        const cleanJson = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Error al analizar la imagen:', error);
        alert('No se pudo analizar la imagen. ' + error.message);
        throw error;
    }
}

function mostrarPantallaCargando() {
    document.getElementById('pantallaCargando').classList.remove('oculta');
}

function ocultarPantallaCargando() {
    document.getElementById('pantallaCargando').classList.add('oculta');
}