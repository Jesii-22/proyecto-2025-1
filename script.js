// Cargar modelos
async function loadModels() {
    // Reemplaza las rutas locales por URLs de CDN
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
    await faceapi.nets.ageGenderNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
    console.log('Modelos cargados desde CDN');
  }
  
  // Iniciar cámara
  async function startVideo() {
    const video = document.getElementById('video');
    
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error('Error al acceder a la cámara:', err));
    }
  }
  
  // Determinar forma del rostro
  function getFaceShape(landmarks) {
    const jawWidth = faceapi.euclideanDistance(landmarks.getJawOutline()[0], landmarks.getJawOutline()[16]);
    const foreheadWidth = faceapi.euclideanDistance(landmarks.getJawOutline()[0], landmarks.getJawOutline()[16]);
    const faceLength = faceapi.euclideanDistance(landmarks.getJawOutline()[8], landmarks.getNose()[6]);
  
    const ratio = jawWidth / faceLength;
  
    if (ratio > 0.9) return 'redondo';
    else if (ratio < 0.85 && foreheadWidth > jawWidth) return 'corazón';
    else if (Math.abs(jawWidth - foreheadWidth) < 0.1) return 'cuadrado';
    else return 'ovalado';
  }
  
  // Mostrar recomendaciones
  async function showRecommendations(shape, gender, age) {
    const response = await fetch('recommendations.json');
    const data = await response.json();
    
    const resultsDiv = document.getElementById('results-text');
    const recDiv = document.getElementById('recommendations');
    
    resultsDiv.innerHTML = `
      <p><strong>Forma de tu rostro:</strong> ${shape}</p>
      <p><strong>Género:</strong> ${gender}</p>
      <p><strong>Edad aproximada:</strong> ${Math.round(age)} años</p>
    `;
    
    recDiv.innerHTML = `
      <h3>Te recomendamos:</h3>
      <p><strong>Peinados:</strong> ${data[shape].peinados.join(', ')}</p>
      <p><strong>Gafas:</strong> ${data[shape].gafas.join(', ')}</p>
      <p><strong>Escotes:</strong> ${data[shape].escotes.join(', ')}</p>
    `;
  }
  
  // Detección en tiempo real
  async function detectFaces() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
  
    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withAgeAndGender();
      
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, detections);
      faceapi.draw.drawFaceLandmarks(canvas, detections);
      
      if (detections.length > 0) {
        const shape = getFaceShape(detections[0].landmarks);
        const gender = detections[0].gender;
        const age = detections[0].age;
        showRecommendations(shape, gender, age);
      }
    }, 1000);
  }
  
  // Inicializar
  document.getElementById('start-btn').addEventListener('click', async () => {
    await loadModels();
    await startVideo();
    detectFaces();
  });