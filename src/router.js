import Navigo from 'navigo';
import { renderIndexPage } from './pages/index/index.js';
import { renderDashboardPage } from './pages/dashboardPage/dashboardPage.js';
import { renderLoginPage } from './pages/loginPage/loginPage.js';
import { renderRegisterPage } from './pages/registerPage/registerPage.js';
import { renderAdvertisementPage } from './pages/advertisementPage/advertisementPage.js';
import { renderCreateAdPage } from './pages/createAdPage/createAdPage.js';
import { renderProfilePage } from './pages/profilePage/profilePage.js';
import { renderUserAdsPage } from './pages/userAdsPage/userAdsPage.js';
import { renderNotFoundPage } from './pages/notFoundPage/notFoundPage.js';

const router = new Navigo('/', { hash: false });
const appName = 'Obyava';

function showRoutePreloader() {
  if (window.preloaderControl) {
    window.preloaderControl.showPreloader();
  }
}

function hideRoutePreloader() {
  if (window.preloaderControl) {
    window.preloaderControl.hidePreloader();
  }
}

const routeMap = [
  { path: '/', view: renderIndexPage, title: 'Home' },
  { path: '/login', view: renderLoginPage, title: 'Login' },
  { path: '/register', view: renderRegisterPage, title: 'Register' },
  { path: '/dashboard', view: renderDashboardPage, title: 'Admin Dashboard' },
  { path: '/profile', view: renderProfilePage, title: 'Profile' },
  { path: '/profile/', view: renderProfilePage, title: 'Profile' },
  { path: '/advertisement/:id', view: renderAdvertisementPage, title: 'Advertisement' },
  { path: '/user/:id/ads', view: renderUserAdsPage, title: 'User Ads' },
  { path: '/create-advertisement', view: renderCreateAdPage, title: 'Create Advertisement' },
  { path: '/edit-advertisement/:id', view: renderCreateAdPage, title: 'Edit Advertisement' },
];

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
      const content = route.view({ navigate, params });
      mainElement.replaceChildren(content);
      
      // Scroll to top on navigation
      window.scrollTo(0, 0);
    });
  });

  router.notFound(() => {
    setPageTitle('Not Found');
    mainElement.replaceChildren(renderNotFoundPage({ navigate }));
    window.scrollTo(0, 0);
  });

  router.resolve();
}
