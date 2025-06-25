document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splashScreen');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mainContent = document.getElementById('mainContent');

    // 1. Asegura que la splash screen esté visible al cargar
    splashScreen.classList.remove('hidden'); 
    
    // 2. Y que welcomeScreen y mainContent estén ocultos por defecto
    welcomeScreen.classList.add('hidden');
    mainContent.classList.add('hidden'); 
    
    // 3. Ocultar la splash screen después de un tiempo y mostrar la bienvenida
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        // Espera a que la animación de ocultar de la splash screen termine
        splashScreen.addEventListener('transitionend', () => {
            welcomeScreen.classList.remove('hidden'); // Muestra la pantalla de bienvenida
        }, { once: true }); // El evento se dispara una sola vez
    }, 3000); // 3000 milisegundos = 3 segundos
});