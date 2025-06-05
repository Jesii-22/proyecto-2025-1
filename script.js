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

// Función para optimizar el tamaño de la imagen
async function optimizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Crear un canvas con dimensiones reducidas
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                // Calcular nuevas dimensiones manteniendo la proporción
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Dibujar la imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a blob con calidad reducida
                canvas.toBlob((blob) => {
                    // Crear un nuevo archivo con el blob optimizado
                    const optimizedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(optimizedFile);
                }, 'image/jpeg', 0.7); // Calidad del 70%
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

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

        // Optimizar la imagen
        const optimizedFile = await optimizeImage(file);
        console.log('Archivo optimizado:', optimizedFile.name, optimizedFile.type, optimizedFile.size);

        // Mostrar la imagen capturada
        const imageUrl = URL.createObjectURL(optimizedFile);
        capturedImage.src = imageUrl;
        capturedImage.style.display = 'block';
        video.style.display = 'none';
        captureButton.style.display = 'none';
        confirmButton.style.display = 'inline-block';
        retakeButton.style.display = 'inline-block';

        // Guardar la foto optimizada
        capturedPhoto = optimizedFile;

        // Ocultar la pantalla de carga si está visible
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');

        return optimizedFile;
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
    try {
        if (!capturedPhoto) {
            throw new Error('No hay foto para confirmar. Por favor, toma una foto primero.');
        }

        // Detener la cámara
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        // Mostrar pantalla de carga
        pantallaCargando.classList.remove('oculta');
        loadingOverlay.classList.add('active');

        // Procesar la foto optimizada
        await processImage(capturedPhoto);
    } catch (error) {
        console.error('Error al confirmar la foto:', error);
        alert(error.message);
        // Asegurar que se oculte la pantalla de carga
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');
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

        // Optimizar la imagen
        const optimizedFile = await optimizeImage(file);
        console.log('Archivo optimizado:', optimizedFile.name, optimizedFile.type, optimizedFile.size);

        // Mostrar la imagen
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
        };
        reader.readAsDataURL(optimizedFile);

        // Enviar a Gemini
        await sendToGemini(optimizedFile);
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
                        text: "Analiza esta imagen y proporciona recomendaciones de peinados basadas en la forma del rostro. IMPORTANTE: RESPONDE TODO EN ESPAÑOL, excepto los términos de búsqueda que deben ser en inglés. Incluye:\n\n1. Un análisis detallado de la forma del rostro\n2. Tres recomendaciones de peinados específicos\n3. Explicación de por qué cada peinado sería beneficioso\n4. Sugerencias de estilos y técnicas de peinado\n\nFormato de respuesta (TODO EN ESPAÑOL excepto los términos de búsqueda):\n\nANÁLISIS DEL ROSTRO:\n[Análisis detallado en español]\n\nRECOMENDACIONES DE PEINADOS:\n\n1. [Nombre del peinado en español]\n- Descripción: [Descripción detallada en español]\n- Beneficios: [Explicación en español de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas en español]\n- Búsqueda: [Términos de búsqueda en inglés para Google Images]\n\n2. [Nombre del peinado en español]\n- Descripción: [Descripción detallada en español]\n- Beneficios: [Explicación en español de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas en español]\n- Búsqueda: [Términos de búsqueda en inglés para Google Images]\n\n3. [Nombre del peinado en español]\n- Descripción: [Descripción detallada en español]\n- Beneficios: [Explicación en español de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas en español]\n- Búsqueda: [Términos de búsqueda en inglés para Google Images]\n\nCONSEJOS ADICIONALES:\n[Lista de consejos generales en español para el cuidado y mantenimiento del cabello]"
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
                    const busqueda = lines.find(line => line.startsWith('- Búsqueda:'))?.replace('- Búsqueda:', '').trim() || title;

                    card.innerHTML = `
                        <h3>✂️ ${title}</h3>
                        <p>${description}</p>
                        <p><strong>Beneficios:</strong> ${beneficios}</p>
                        <p><strong>Técnicas:</strong> ${tecnicas}</p>
                        <iframe class="preview-frame" 
                                src="https://www.google.com/search?igu=1&q=${encodeURIComponent(busqueda)}&tbm=isch"
                                loading="lazy">
                        </iframe>
                        <a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(busqueda)}" 
                           target="_blank" 
                           rel="noopener noreferrer">
                            Ver más ejemplos
                        </a>
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