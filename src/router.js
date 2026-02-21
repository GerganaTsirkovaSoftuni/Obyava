import Navigo from 'navigo';
import { renderIndexPage } from './pages/index/index.js';
import { renderDashboardPage } from './pages/dashboardPage/dashboardPage.js';
import { renderLoginPage } from './pages/loginPage/loginPage.js';
import { renderRegisterPage } from './pages/registerPage/registerPage.js';
import { renderAdvertisementPage } from './pages/advertisementPage/advertisementPage.js';
import { renderCreateAdPage } from './pages/createAdPage/createAdPage.js';
import { renderProfilePage } from './pages/profilePage/profilePage.js';

const router = new Navigo('/', { hash: false });
const appName = 'Obyava';

const routeMap = [
  { path: '/', view: renderIndexPage, title: 'Начало' },
  { path: '/login', view: renderLoginPage, title: 'Вход' },
  { path: '/register', view: renderRegisterPage, title: 'Регистрация' },
  { path: '/dashboard', view: renderDashboardPage, title: 'Админ панел' },
  { path: '/profile', view: renderProfilePage, title: 'Профил' },
  { path: '/advertisement/:id', view: renderAdvertisementPage, title: 'Обява' },
  { path: '/create-advertisement', view: renderCreateAdPage, title: 'Създай обява' },
  { path: '/edit-advertisement/:id', view: renderCreateAdPage, title: 'Редактирай обява' },
];

function renderPlaceholder(path) {
  const section = document.createElement('section');
  section.className = 'container py-5 text-center';
  section.innerHTML = `
    <div class="py-5">
      <i class="bi bi-exclamation-triangle display-1 text-warning"></i>
      <h1 class="mt-4">Страницата не е намерена</h1>
      <p class="text-muted">Маршрутът <code>${path}</code> не съществува.</p>
      <a href="/" class="btn btn-primary mt-3" data-link>
        <i class="bi bi-house-door me-2"></i>Към начална страница
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
      const params = match?.data ?? {};
      setPageTitle(resolveRouteTitle(route, params));
      const content = route.view
        ? route.view({ navigate, params })
        : renderPlaceholder(route.path);
      mainElement.replaceChildren(content);
      
      // Scroll to top on navigation
      window.scrollTo(0, 0);
    });
  });

  router.notFound(() => {
    setPageTitle('Не е намерена');
    mainElement.replaceChildren(renderPlaceholder('/404'));
    window.scrollTo(0, 0);
  });

  router.resolve();
}
