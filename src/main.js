import './styles/global.css';
import { createApp } from './app.js';

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

createApp(document.querySelector('#app'));
