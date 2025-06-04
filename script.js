class FaceDetectionApp {
    constructor() {
        // Elementos del DOM
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.toggleBtn = document.getElementById('toggleCamera');
        this.statusText = document.getElementById('status');
        this.fpsCounter = document.getElementById('fpsCounter');
        this.showPointsCheckbox = document.getElementById('showPoints');
        this.showContourCheckbox = document.getElementById('showContour');
        this.sensitivitySlider = document.getElementById('sensitivity');

        // Variables de estado
        this.stream = null;
        this.faceMesh = null;
        this.animationFrameId = null;
        this.lastTimestamp = 0;
        this.frameCount = 0;
        this.currentFPS = 0;
        this.lastShapeDetection = 0; 
        this.detectionConfig = {
            showPoints: true,
            showContour: true,
            sensitivity: 0.5
        };

        // Diccionario de peinados (nuevo)
        this.HAIRSTYLES_BY_FACE = {
            ovalada: [
                "Corte largo con capas", 
                "Flequillo recto", 
                "Corte bob"
            ],
            redonda: [
                "Peinados altos para alargar", 
                "Capas asimétricas", 
                "Flequillo lateral"
            ],
            cuadrada: [
                "Ondas suaves", 
                "Corte pixie", 
                "Rulos para suavizar"
            ],
            alargada: [
                "Corte corto con volumen", 
                "Flequillo grueso", 
                "Ondas horizontales"
            ],
            corazón: [
                "Cascada de rizos", 
                "Media melena", 
                "Flequillo en pico"
            ]
        };

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            await this.loadMediaPipe();
            this.updateDetectionConfig();
            this.statusText.textContent = "Sistema listo";
            this.statusText.style.color = "#2ecc71";
        } catch (error) {
            this.handleError("Error al inicializar:", error);
        }
    }

    setupEventListeners() {
        this.toggleBtn.addEventListener('click', () => this.toggleCamera());
        this.showPointsCheckbox.addEventListener('change', () => this.updateDetectionConfig());
        this.showContourCheckbox.addEventListener('change', () => this.updateDetectionConfig());
        this.sensitivitySlider.addEventListener('input', () => this.updateDetectionConfig());
    }

    updateDetectionConfig() {
      
  
        this.detectionConfig = {
            showPoints: this.showPointsCheckbox.checked,
            showContour: this.showContourCheckbox.checked,
            sensitivity: parseFloat(this.sensitivitySlider.value)
        };

        if (this.faceMesh) {
            this.faceMesh.setOptions({
                minDetectionConfidence: this.detectionConfig.sensitivity,
                minTrackingConfidence: this.detectionConfig.sensitivity
            });
        }
    }

    async loadMediaPipe() {
    
        try {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });


            await this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.faceMesh.onResults((results) => this.processResults(results));
        } catch (error) {
            throw new Error(`Error al cargar MediaPipe: ${error.message}`);
        }
    }

    async toggleCamera() {
        try {
            if (!this.stream) {
                await this.startCamera();
            } else {
                this.stopCamera();
            }
        } catch (error) {
            this.handleError("Error al alternar cámara:", error);
        }
    }

    async startCamera() {
      
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user",
                    frameRate: { ideal: 30 }
                }
            });

            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.statusText.textContent = "Cámara activa";
                this.statusText.style.color = "#2ecc71";
                this.toggleBtn.textContent = "Detener Cámara";
                this.lastTimestamp = performance.now();
                this.processVideoFrame();
            };

        } catch (error) {
            if (error.name === 'NotAllowedError') {
                this.handleError("Permiso de cámara denegado. Por favor habilita los permisos.");
            } else {
                this.handleError("Error al acceder a la cámara:", error);
            }
        }
    }

    processVideoFrame() {
          console.log("RESULTADO");
        if (!this.stream) return;

        const now = performance.now();
        this.frameCount++;
        
        if (now - this.lastTimestamp >= 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.lastTimestamp));
            this.fpsCounter.textContent = `FPS: ${this.currentFPS}`;
            this.lastTimestamp = now;
            this.frameCount = 0;
        }

        if (this.faceMesh && this.video.readyState >= 2) {
            this.faceMesh.send({ image: this.video });
        }

        this.animationFrameId = requestAnimationFrame(() => this.processVideoFrame());
    }

   
    processResults(results) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // 1. Determinar tipo de rostro (nuevo)
            const faceShape = this.determineFaceShape(landmarks);
            
            // 2. Mostrar sugerencias (cada 5 segundos)
            if (!this.lastShapeDetection || Date.now() - this.lastShapeDetection > 5000) {
                this.showHairstyleSuggestions(faceShape);
                this.lastShapeDetection = Date.now();
            }

            // 3. Dibujar landmarks (original)
            if (this.detectionConfig.showPoints) this.drawLandmarks(landmarks);
            if (this.detectionConfig.showContour) this.drawFaceContour(landmarks);
        }
    }

    // ===== FUNCIONES NUEVAS =====
    determineFaceShape(landmarks) {
        // Puntos clave para cálculos (índices de landmarks)
        const jawline = [152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234];
        const forehead = [10];
        const cheekbones = [454, 234];

        // Calcular distancias
        const jawWidth = Math.abs(landmarks[jawline[0]].x - landmarks[jawline[10]].x);
        const faceHeight = Math.abs(landmarks[forehead[0]].y - landmarks[jawline[5]].y);
        const cheekboneWidth = Math.abs(landmarks[cheekbones[0]].x - landmarks[cheekbones[1]].x);

        // Ratios clave
        const ratioWidthHeight = jawWidth / faceHeight;
        const ratioCheekJaw = cheekboneWidth / jawWidth;

        // Clasificación (valores ajustables)
        if (ratioWidthHeight > 0.75 && ratioCheekJaw > 0.9) {
            return "redonda";
        } else if (ratioWidthHeight < 0.7 && ratioCheekJaw > 0.85) {
            return "ovalada";
        } else if (ratioWidthHeight > 0.8 && ratioCheekJaw < 0.85) {
            return "cuadrada";
        } else if (ratioWidthHeight < 0.65) {
            return "alargada";
        } else {
            return "corazón";
        }
    }

    showHairstyleSuggestions(faceShape) {
        const suggestions = this.HAIRSTYLES_BY_FACE[faceShape] || [];
        const suggestionsHTML = suggestions.map(s => `<li>${s}</li>`).join('');
        
        let container = document.getElementById('hairstyle-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.id = 'hairstyle-suggestions';
            container.style.cssText = `
                margin-top: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            `;
            container.innerHTML = `
                <h3 style="color: #2c3e50; margin-top: 0;">Para rostro ${faceShape}:</h3>
                <ul style="padding-left: 20px; margin-bottom: 0;">${suggestionsHTML}</ul>
            `;
            document.querySelector('.container').appendChild(container);
        } else {
            container.innerHTML = `
                <h3 style="color: #2c3e50; margin-top: 0;">Para rostro ${faceShape}:</h3>
                <ul style="padding-left: 20px; margin-bottom: 0;">${suggestionsHTML}</ul>
            `;
        }
    }
    drawLandmarks(landmarks) {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        for (const point of landmarks) {
            this.ctx.beginPath();
            this.ctx.arc(
                point.x * this.canvas.width,
                point.y * this.canvas.height,
                2, 0, 2 * Math.PI
            );
            this.ctx.fill();
        }
    }

    drawFaceContour(landmarks) {
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        const faceOvalIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288];
        for (let i = 0; i < faceOvalIndices.length; i++) {
            const index = faceOvalIndices[i];
            const point = landmarks[index];
            
            if (i === 0) {
                this.ctx.moveTo(
                    point.x * this.canvas.width,
                    point.y * this.canvas.height
                );
            } else {
                this.ctx.lineTo(
                    point.x * this.canvas.width,
                    point.y * this.canvas.height
                );
            }
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            this.stream = null;
            
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.statusText.textContent = "Cámara detenida";
            this.statusText.style.color = "#7f8c8d";
            this.toggleBtn.textContent = "Iniciar Cámara";
            this.fpsCounter.textContent = "FPS: 0";
        }
    }

    handleError(message, error = null) {
        console.error(message, error);
        this.statusText.textContent = typeof error === 'string' ? error : 
            error?.message || "Ocurrió un error";
        this.statusText.style.color = "#e74c3c";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FaceDetectionApp();
});