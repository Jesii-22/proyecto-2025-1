// API key de Google Gemini
const GEMINI_API_KEY = 'AIzaSyCUViWR4t4xl-s2fzBXDFkVVMIymR423lE'; // ¡Recordá la seguridad de tu API Key!
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Elementos del DOM - Nuevos y existentes
const welcomeScreen = document.getElementById('welcomeScreen');
const userNameInput = document.getElementById('userName');
const userLastNameInput = document.getElementById('userLastName');
const userAgeInput = document.getElementById('userAge');
const startButton = document.getElementById('startButton');
const mainContent = document.getElementById('mainContent');
const mainTitle = document.getElementById('mainTitle'); // Nuevo elemento para el título personalizado

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
const faceAnalysis = document.getElementById('faceAnalysis'); // La caja de texto del análisis
const cards = document.getElementById('cards');
const pantallaCargando = document.getElementById('pantallaCargando');
const loadingOverlay = document.getElementById('loadingOverlay');
const faceType = document.getElementById('faceType');
const additionalTips = document.getElementById('additionalTips'); // Nuevo elemento para los consejos
const tipsList = document.getElementById('tipsList'); // Nuevo elemento para la lista de consejos

// Nuevos elementos para el layout del análisis
const faceAnalysisContainer = document.getElementById('faceAnalysisContainer');
const analysisImage = document.getElementById('analysisImage');

let stream = null;
let capturedPhoto = null;
let userName = '';
let userLastName = '';
let userAge = '';

// --- Lógica de la pantalla de bienvenida ---
startButton.addEventListener('click', () => {
    userName = userNameInput.value.trim();
    userLastName = userLastNameInput.value.trim();
    userAge = userAgeInput.value.trim();

    if (userName && userLastName && userAge) {
        // Validar la edad para asegurarse de que sea un número positivo
        const ageNum = parseInt(userAge);
        if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
            alert('Por favor, ingresa una edad válida (entre 1 y 120 años).');
            return; // Detener la ejecución si la edad no es válida
        }

        welcomeScreen.classList.add('hidden'); // Oculta la pantalla de bienvenida
        mainContent.classList.remove('hidden'); // Muestra el contenido principal
        mainTitle.textContent = `¡Hola ${userName} ${userLastName}! Sube o sácate una foto y te daremos recomendaciones según la forma de tu rostro.`;

        // Asegura que la opción de archivo esté activa al iniciar
        switchInput('file');
    } else {
        alert('Por favor, completa todos los campos (Nombre, Apellido y Edad) para comenzar.');
    }
});


// Función para cambiar entre opciones (existente, sin cambios importantes)
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
    // Ocultar el contenedor de análisis y las tarjetas al resetear la cámara
    faceAnalysisContainer.classList.remove('active'); 
    cards.innerHTML = '';
    additionalTips.style.display = 'none';
}

// Función para iniciar la cámara (existente)
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

// Función para detener la cámara (existente)
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
    }
}

// Event listeners para los botones de opción (existente)
fileOption.addEventListener('click', () => switchInput('file'));
cameraOption.addEventListener('click', () => switchInput('camera'));

// Event listener para el botón de captura (existente, con la nueva lógica de `optimizeImage`)
captureButton.addEventListener('click', () => {
    if (!video.videoWidth || !video.videoHeight) {
        alert('La cámara no está lista. Espera unos segundos y vuelve a intentar.');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
        if (!blob || blob.size < 10000) {
            alert('La foto capturada no es válida. Intenta tomar la foto de nuevo, asegurándote de que la cámara esté enfocada.');
            resetCameraUI();
            return;
        }
        const file = new File([blob], 'foto_capturada.png', { type: 'image/png', lastModified: new Date().getTime() });
        try {
            // Reutilizamos processCapturedImage que ya llama a optimizeImage
            await processCapturedImage(file);
        } catch (error) {
            console.error("Error al capturar y procesar la imagen:", error);
            alert("Hubo un problema al procesar la imagen: " + error.message);
            resetCameraUI();
        }
    }, 'image/png', 0.9); // Calidad inicial, luego optimizeImage hará más
});

// Función para optimizar el tamaño de la imagen (Mejorada para reusabilidad)
async function optimizeImage(file, targetMimeType = 'image/jpeg', quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_DIMENSION = 800; // Max width or height

                let width = img.width;
                let height = img.height;

                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = Math.round((height * MAX_DIMENSION) / width);
                        width = MAX_DIMENSION;
                    } else {
                        width = Math.round((width * MAX_DIMENSION) / height);
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('No se pudo comprimir la imagen.'));
                        return;
                    }
                    const optimizedFile = new File([blob], file.name, {
                        type: targetMimeType,
                        lastModified: Date.now()
                    });
                    resolve(optimizedFile);
                }, targetMimeType, quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Función para procesar la imagen capturada (Existente, con la nueva lógica de `optimizeImage`)
async function processCapturedImage(file) {
    try {
        if (file.size > 5 * 1024 * 1024) { // Límite inicial de 5MB antes de la optimización
            throw new Error('La imagen original es demasiado grande. Por favor, sube una imagen más pequeña.');
        }
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo no es una imagen válida.');
        }

        const optimizedFile = await optimizeImage(file, 'image/jpeg', 0.7); // Usar JPEG para mejor compresión
        console.log('Archivo optimizado:', optimizedFile.name, optimizedFile.type, optimizedFile.size);

        if (optimizedFile.size > 300 * 1024) { // Límite final para Gemini, ej. 300KB
            throw new Error(`La imagen optimizada sigue siendo demasiado grande (${(optimizedFile.size / 1024).toFixed(2)} KB). Intenta con una imagen diferente.`);
        }

        const imageUrl = URL.createObjectURL(optimizedFile);
        capturedImage.src = imageUrl;
        capturedImage.style.display = 'block';
        video.style.display = 'none';
        captureButton.style.display = 'none';
        confirmButton.style.display = 'inline-block';
        retakeButton.style.display = 'inline-block';

        capturedPhoto = optimizedFile;

        // No mostrar la pantalla de carga aquí, se hará en sendToGemini
        // pantallaCargando.classList.add('oculta');
        // loadingOverlay.classList.remove('active');

        return optimizedFile;
    } catch (error) {
        console.error('Error al procesar la imagen:', error);
        alert(error.message);
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');
        throw error;
    }
}

// Event listener para el botón de confirmar (existente)
confirmButton.addEventListener('click', async () => {
    try {
        if (!capturedPhoto) {
            throw new Error('No hay foto para confirmar. Por favor, toma una foto primero.');
        }

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        // Antes de enviar a Gemini, muestra la imagen en el nuevo contenedor de análisis
        const imageUrl = URL.createObjectURL(capturedPhoto);
        analysisImage.src = imageUrl; // Asigna la imagen al nuevo elemento

        pantallaCargando.classList.remove('oculta');
        loadingOverlay.classList.add('active');

        await sendToGemini(capturedPhoto);
    } catch (error) {
        console.error('Error al confirmar la foto:', error);
        alert(error.message);
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');
    }
});

// Event listener para el botón de volver a tomar (existente)
retakeButton.addEventListener('click', () => {
    resetCameraUI();
});

// Event listener para el input de archivo (existente, con la nueva lógica de `optimizeImage`)
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        // Ocultar cualquier análisis o tarjeta previa al subir una nueva imagen
        faceAnalysisContainer.classList.remove('active');
        cards.innerHTML = '';
        additionalTips.style.display = 'none';

        await processImage(file);
    }
});

// Función para procesar la imagen (para file input)
async function processImage(file) {
    try {
        if (file.size > 5 * 1024 * 1024) { // Límite inicial
            throw new Error('La imagen original es demasiado grande. Por favor, sube una imagen más pequeña.');
        }
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo no es una imagen válida');
        }

        const optimizedFile = await optimizeImage(file, 'image/jpeg', 0.7);
        console.log('Archivo optimizado:', optimizedFile.name, optimizedFile.type, optimizedFile.size);

        if (optimizedFile.size > 300 * 1024) { // Límite final para Gemini
            throw new Error(`La imagen optimizada sigue siendo demasiado grande (${(optimizedFile.size / 1024).toFixed(2)} KB). Intenta con una imagen diferente.`);
        }

        // Antes de enviar a Gemini, muestra la imagen en el nuevo contenedor de análisis
        const imageUrl = URL.createObjectURL(optimizedFile);
        analysisImage.src = imageUrl; // Asigna la imagen al nuevo elemento

        // Quitar la vista previa antigua si no la usas más
        preview.innerHTML = ''; // Limpia el preview antiguo si lo deseas
        
        pantallaCargando.classList.remove('oculta');
        loadingOverlay.classList.add('active');

        await sendToGemini(optimizedFile);
    } catch (error) {
        console.error('Error al procesar la imagen:', error);
        alert(error.message);
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');
    }
}

// Función para enviar a Gemini (existente, con la adición de datos del usuario al prompt)
async function sendToGemini(file) {
    try {
        pantallaCargando.classList.remove('oculta');
        loadingOverlay.classList.add('active');

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async () => {
            const base64Image = reader.result.split(',')[1];

            // Añadir datos del usuario al prompt
            const userContext = `El usuario se llama ${userName} ${userLastName} y tiene ${userAge} años. `;
            const promptText = userContext + "Analiza esta imagen y proporciona recomendaciones de peinados basadas en la forma del rostro. IMPORTANTE: RESPONDE TODO EN ESPAÑOL, excepto los términos de búsqueda que deben ser en inglés. Incluye:\n\n1. Un análisis detallado de la forma del rostro\n2. Tres recomendaciones de peinados específicos\n3. Explicación de por qué cada peinado sería beneficioso\n4. Sugerencias de estilos y técnicas de peinado\n\nFormato de respuesta (TODO EN ESPAÑOL excepto los términos de búsqueda):\n\nANÁLISIS DEL ROSTRO:\n[Análisis detallado en español]\n\nRECOMENDACIONES DE PEINADOS:\n\n1. [Nombre del peinado en español]\n- Descripción: [Descripción detallada en español]\n- Beneficios: [Explicación en español de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas en español]\n- Búsqueda: [Términos de búsqueda en inglés para Google Images]\n\n2. [Nombre del peinado en español]\n- Descripción: [Descripción detallada en español]\n- Beneficios: [Explicación en español de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas en español]\n- Búsqueda: [Términos de búsqueda en inglés para Google Images]\n\n3. [Nombre del peinado en español]\n- Descripción: [Descripción detallada en español]\n- Beneficios: [Explicación en español de por qué funciona bien]\n- Técnicas: [Sugerencias de técnicas en español]\n- Búsqueda: [Términos de búsqueda en inglés para Google Images]\n\nCONSEJOS ADICIONALES:\n[Lista de consejos generales en español para el cuidado y mantenimiento del cabello]";

            const requestBody = {
                contents: [{
                    parts: [{
                        text: promptText
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
            // console.log('Respuesta de Gemini:', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('La API no devolvió una respuesta válida');
            }

            const text = data.candidates[0].content.parts[0].text;
            // console.log('Texto de la respuesta:', text);

            // Borrar contenido anterior de las tarjetas y análisis
            cards.innerHTML = '';
            faceType.textContent = '';
            additionalTips.style.display = 'none'; // Ocultar por si no hay tips
            tipsList.innerHTML = ''; // Limpiar tips anteriores

            // Procesar la respuesta
            const sections = text.split('\n\n');
            let currentSection = '';

            sections.forEach(section => {
                if (section.startsWith('ANÁLISIS DEL ROSTRO:')) {
                    currentSection = 'análisis';
                    const analysisContent = section.replace('ANÁLISIS DEL ROSTRO:', '').trim();
                    faceType.textContent = analysisContent;
                    faceAnalysisContainer.classList.add('active'); // Mostrar el contenedor principal del análisis
                } else if (section.startsWith('RECOMENDACIONES DE PEINADOS:')) {
                    currentSection = 'recomendaciones';
                } else if (section.startsWith('CONSEJOS ADICIONALES:')) {
                    currentSection = 'consejos';
                    const tipsContent = section.replace('CONSEJOS ADICIONALES:', '').trim();
                    if (tipsContent) { // Solo si hay contenido de consejos
                        tipsContent.split('\n').forEach(tip => {
                            const li = document.createElement('li');
                            li.textContent = tip.replace(/^- /, '').trim();
                            tipsList.appendChild(li);
                        });
                        additionalTips.style.display = 'block'; // Mostrar la sección de consejos
                    }
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
                                loading="lazy"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms">
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

            pantallaCargando.classList.add('oculta');
            loadingOverlay.classList.remove('active');
        };
    } catch (error) {
        console.error('Error al enviar a Gemini:', error);
        alert(`Error al analizar la imagen: ${error.message}`);
        pantallaCargando.classList.add('oculta');
        loadingOverlay.classList.remove('active');
    }
}

// Funciones de pantalla de carga (existente, sin cambios)
function mostrarPantallaCargando() {
    document.getElementById('pantallaCargando').classList.remove('oculta');
}

function ocultarPantallaCargando() {
    document.getElementById('pantallaCargando').classList.add('oculta');
}

// Inicialización: Ocultar el contenido principal al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    mainContent.classList.add('hidden');
    welcomeScreen.classList.remove('hidden'); // Asegurarse de que la pantalla de bienvenida esté visible
    // Asegurarse de que el contenedor de análisis y las tarjetas estén ocultas al inicio
    faceAnalysisContainer.classList.remove('active'); 
    cards.innerHTML = '';
    additionalTips.style.display = 'none';
});