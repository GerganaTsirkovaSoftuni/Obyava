import Navigo from 'navigo';
import { renderIndexPage } from './pages/index/index.js';
import { renderDashboardPage } from './pages/dashboardPage/dashboardPage.js';
import { renderLoginPage } from './pages/loginPage/loginPage.js';
import { renderRegisterPage } from './pages/registerPage/registerPage.js';
import { renderAdvertisementPage } from './pages/advertisementPage/advertisementPage.js';
import { renderCreateAdPage } from './pages/createAdPage/createAdPage.js';
import { renderProfilePage } from './pages/profilePage/profilePage.js';
import { renderUserAdsPage } from './pages/userAdsPage/userAdsPage.js';

const router = new Navigo('/', { hash: false });
const appName = 'Obyava';

function getRoutePreloader() {
  let preloader = document.querySelector('.app-route-preloader');

  if (!preloader) {
    preloader = document.createElement('div');
    preloader.className = 'app-route-preloader d-none';
    preloader.innerHTML = `
      <div class="app-route-preloader-inner">
        <div class="app-route-preloader-ring"></div>
        <div class="app-route-preloader-glow"></div>
        <p class="app-route-preloader-text mb-0">Loading</p>
      </div>
    `;
    document.body.appendChild(preloader);
  }

  return preloader;
}

function showRoutePreloader() {
  getRoutePreloader().classList.remove('d-none');
}

function hideRoutePreloader() {
  getRoutePreloader().classList.add('d-none');
}

const routeMap = [
  { path: '/', view: renderIndexPage, title: 'Home' },
  { path: '/login', view: renderLoginPage, title: 'Login' },
  { path: '/register', view: renderRegisterPage, title: 'Register' },
  { path: '/dashboard', view: renderDashboardPage, title: 'Admin Dashboard' },
  { path: '/profile', view: renderProfilePage, title: 'Profile' },
  { path: '/advertisement/:id', view: renderAdvertisementPage, title: 'Advertisement' },
  { path: '/user/:id/ads', view: renderUserAdsPage, title: 'User Ads' },
  { path: '/create-advertisement', view: renderCreateAdPage, title: 'Create Advertisement' },
  { path: '/edit-advertisement/:id', view: renderCreateAdPage, title: 'Edit Advertisement' },
];

function renderPlaceholder(path) {
  const section = document.createElement('section');
  section.className = 'container py-5 text-center';
  section.innerHTML = `
    <div class="py-5">
      <i class="bi bi-exclamation-triangle display-1 text-warning"></i>
      <h1 class="mt-4">Page Not Found</h1>
      <p class="text-muted">Route <code>${path}</code> does not exist.</p>
      <a href="/" class="btn btn-primary mt-3" data-link>
        <i class="bi bi-house-door me-2"></i>Go to Home
      </a>
    </div>
  `;
  
  // Setup link navigation
  const link = section.querySelector('[data-link]');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/');
    });
  }
  
  return section;
}

export function navigate(path) {
  router.navigate(path);
}

function setPageTitle(title) {
  document.title = title ? `${title} | ${appName}` : appName;
}

function resolveRouteTitle(route, params) {
  if (typeof route.title === 'function') {
    return route.title(params);
  }

  return route.title;
}

export function setupRoutes(mainElement) {
  routeMap.forEach((route) => {
    router.on(route.path, (match) => {
      showRoutePreloader();
      const params = match?.data ?? {};
      setPageTitle(resolveRouteTitle(route, params));
      const content = route.view
        ? route.view({ navigate, params })
        : renderPlaceholder(route.path);
      mainElement.replaceChildren(content);
      
      // Scroll to top on navigation
      window.scrollTo(0, 0);

      requestAnimationFrame(() => {
        hideRoutePreloader();
      });
    });
  });

  router.notFound(() => {
    showRoutePreloader();
    setPageTitle('Not Found');
    mainElement.replaceChildren(renderPlaceholder('/404'));
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      hideRoutePreloader();
    });
  });

  router.resolve();
}
