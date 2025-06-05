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
const pantallaCargando = document.getElementById('pantallaCargando');
const loadingOverlay = document.getElementById('loadingOverlay');
const faceType = document.getElementById('faceType');

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
async function processCapturedImage(file) {
    try {
        // Verificar el tamaño del blob
        if (file.size > 300 * 1024) { // 300KB
            throw new Error('La imagen es demasiado grande. Por favor, intenta con una imagen más pequeña.');
        }

        // Verificar el tipo MIME
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo no es una imagen válida');
        }

        // Mostrar la imagen capturada
        const imageUrl = URL.createObjectURL(file);
        capturedImage.src = imageUrl;
        capturedImage.style.display = 'block';
        video.style.display = 'none';
        captureButton.style.display = 'none';
        confirmButton.style.display = 'inline-block';
        retakeButton.style.display = 'inline-block';

        // Ocultar la pantalla de carga si está visible
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');

        return file;
    } catch (error) {
        console.error('Error al procesar la imagen:', error);
        alert(error.message);
        // Asegurar que se oculte la pantalla de carga
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');
        throw error;
    }
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

// Función para procesar la imagen
async function processImage(file) {
    try {
        // Verificar el tipo MIME
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo no es una imagen válida');
        }

        // Verificar el tamaño del archivo
        if (file.size > 300 * 1024) { // 300KB
            throw new Error('La imagen es demasiado grande. Por favor, intenta con una imagen más pequeña.');
        }

        // Mostrar la imagen
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
        };
        reader.readAsDataURL(file);

        // Enviar a Gemini
        await sendToGemini(file);
    } catch (error) {
        console.error('Error al procesar la imagen:', error);
        alert(error.message);
        // Asegurar que se oculte la pantalla de carga
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');
    }
}

// Función para enviar a Gemini
async function sendToGemini(file) {
    try {
        // Mostrar pantalla de carga
        pantallaCargando.classList.remove('oculta');
        loadingOverlay.classList.add('active');

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async () => {
            const base64Image = reader.result.split(',')[1];

            const requestBody = {
                contents: [{
                    parts: [{
                        text: "Analiza esta imagen y proporciona recomendaciones de peinados basadas en la forma del rostro. Incluye:\n\n1. Un análisis detallado de la forma del rostro\n2. Tres recomendaciones de peinados específicos\n3. Explicación de por qué cada peinado sería beneficioso\n4. Sugerencias de estilos y técnicas de peinado\n\nFormato de respuesta:\n\nANÁLISIS DEL ROSTRO:\n[Análisis detallado]\n\nRECOMENDACIONES DE PEINADOS:\n\n1. [Nombre del peinado]\n- Descripción: [Descripción detallada]\n- Beneficios: [Explicación de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas]\n\n2. [Nombre del peinado]\n- Descripción: [Descripción detallada]\n- Beneficios: [Explicación de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas]\n\n3. [Nombre del peinado]\n- Descripción: [Descripción detallada]\n- Beneficios: [Explicación de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas]\n\nCONSEJOS ADICIONALES:\n[Lista de consejos generales para el cuidado y mantenimiento del cabello]"
                    }, {
                        inline_data: {
                            mime_type: "image/png",
                            data: base64Image
                        }
                    }]
                }]
            };

            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': GEMINI_API_KEY
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Respuesta de Gemini:', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('La API no devolvió una respuesta válida');
            }

            const text = data.candidates[0].content.parts[0].text;
            console.log('Texto de la respuesta:', text);

            // Procesar la respuesta
            const sections = text.split('\n\n');
            let currentSection = '';
            let currentContent = '';

            sections.forEach(section => {
                if (section.startsWith('ANÁLISIS DEL ROSTRO:')) {
                    currentSection = 'análisis';
                    currentContent = section.replace('ANÁLISIS DEL ROSTRO:', '').trim();
                    faceType.textContent = currentContent;
                    faceAnalysis.style.display = 'block';
                } else if (section.startsWith('RECOMENDACIONES DE PEINADOS:')) {
                    currentSection = 'recomendaciones';
                } else if (section.startsWith('CONSEJOS ADICIONALES:')) {
                    currentSection = 'consejos';
                } else if (currentSection === 'recomendaciones' && section.match(/^\d+\./)) {
                    const card = document.createElement('div');
                    card.className = 'card';

                    const lines = section.split('\n');
                    const title = lines[0].replace(/^\d+\.\s*/, '');
                    const description = lines.find(line => line.startsWith('- Descripción:'))?.replace('- Descripción:', '').trim() || '';
                    const beneficios = lines.find(line => line.startsWith('- Beneficios:'))?.replace('- Beneficios:', '').trim() || '';
                    const tecnicas = lines.find(line => line.startsWith('- Técnicas:'))?.replace('- Técnicas:', '').trim() || '';

                    card.innerHTML = `
                        <h3>${title}</h3>
                        <p>${description}</p>
                        <p><strong>Beneficios:</strong> ${beneficios}</p>
                        <p><strong>Técnicas:</strong> ${tecnicas}</p>
                        <iframe class="preview-frame" src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>
                        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' tutorial')}" target="_blank">Ver tutorial en YouTube</a>
                    `;

                    cards.appendChild(card);
                }
            });

            // Ocultar pantallas de carga
            pantallaCargando.classList.add('oculta');
            loadingOverlay.classList.remove('active');
        };
    } catch (error) {
        console.error('Error al enviar a Gemini:', error);
        alert(`Error al analizar la imagen: ${error.message}`);
        // Asegurar que se oculte la pantalla de carga
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');
    }
}

function mostrarPantallaCargando() {
    document.getElementById('pantallaCargando').classList.remove('oculta');
}

function ocultarPantallaCargando() {
    document.getElementById('pantallaCargando').classList.add('oculta');
}