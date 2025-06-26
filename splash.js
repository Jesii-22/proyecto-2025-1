document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splashScreen');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mainContent = document.getElementById('mainContent');
    const startButton = document.getElementById('startButton'); // Asegúrate de obtener este botón

    // 1. Asegura que la splash screen esté visible al cargar
    splashScreen.classList.remove('hidden'); 
    
    // 2. Y que welcomeScreen y mainContent estén ocultos por defecto
    welcomeScreen.classList.add('hidden');
    mainContent.classList.add('hidden'); 

    // Crea un nuevo elemento de audio para el sonido de brillo
    const sparkleSound = new Audio('sparkle.mp3'); // Asegúrate que esta ruta sea correcta
    sparkleSound.volume = 0.6; // Ajusta el volumen (0.0 a 1.0)

    // Ocultar la splash screen después de un tiempo
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        // Espera a que la animación de ocultar de la splash screen termine
        splashScreen.addEventListener('transitionend', () => {
            welcomeScreen.classList.remove('hidden'); // Muestra la pantalla de bienvenida
        }, { once: true });
    }, 3000); // 3000 milisegundos = 3 segundos

    // *** ¡Añadimos esto! Reproducir el sonido al hacer clic en el botón "Comenzar" ***
    if (startButton) {
        startButton.addEventListener('click', () => {
            sparkleSound.play().catch(e => console.error("Error al reproducir el sonido:", e));
            // Aquí iría el resto de la lógica de tu botón "Comenzar"
            // Por ejemplo, lo que hace el script.js para ir al mainContent
        });
    }

    // Si tu lógica para pasar a mainContent está en script.js,
    // asegúrate de que el clic del botón activa esa lógica allí,
    // y que el sonido se reproduce en este archivo.
});