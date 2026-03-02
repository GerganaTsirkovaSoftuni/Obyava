import './styles/global.css';
import { createApp } from './app.js';

async function cleanupStaleServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Ignore cleanup errors to avoid blocking app startup.
  }
}

// Preloader Management
function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('hidden');
  }
}

function showPreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.remove('hidden');
  }
}

// Hide preloader when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hidePreloader);
} else {
  hidePreloader();
}

// Export for router navigation
window.preloaderControl = { showPreloader, hidePreloader };

cleanupStaleServiceWorkers().finally(() => {
  createApp(document.querySelector('#app'));
});
