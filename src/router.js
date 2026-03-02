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
import { getCurrentUser, isUserAdmin } from './services/authService.js';

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
  { path: '/', view: renderIndexPage, title: 'Home', access: 'public' },
  { path: '/login', view: renderLoginPage, title: 'Login', access: 'guest' },
  { path: '/register', view: renderRegisterPage, title: 'Register', access: 'guest' },
  { path: '/dashboard', view: renderDashboardPage, title: 'Admin Dashboard', access: 'admin' },
  { path: '/profile', view: renderProfilePage, title: 'Profile', access: 'auth' },
  { path: '/profile/', view: renderProfilePage, title: 'Profile', access: 'auth' },
  { path: '/advertisement/:id', view: renderAdvertisementPage, title: 'Advertisement', access: 'public' },
  { path: '/user/:id/ads', view: renderUserAdsPage, title: 'User Ads', access: 'public' },
  { path: '/create-advertisement', view: renderCreateAdPage, title: 'Create Advertisement', access: 'auth' },
  { path: '/edit-advertisement/:id', view: renderCreateAdPage, title: 'Edit Advertisement', access: 'auth' },
];

async function canAccessRoute(route) {
  const routeAccess = route.access || 'public';

  if (routeAccess === 'public') {
    return { allowed: true };
  }

  const { user, error } = await getCurrentUser();

  if (error) {
    return { allowed: false, redirectTo: '/' };
  }

  if (routeAccess === 'guest') {
    return user
      ? { allowed: false, redirectTo: '/' }
      : { allowed: true };
  }

  if (!user) {
    return { allowed: false, redirectTo: '/' };
  }

  if (routeAccess === 'auth') {
    return { allowed: true };
  }

  if (routeAccess === 'admin') {
    const { isAdmin } = await isUserAdmin(user.id);
    return isAdmin
      ? { allowed: true }
      : { allowed: false, redirectTo: '/' };
  }

  return { allowed: true };
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
  let navigationRequestId = 0;

  routeMap.forEach((route) => {
    router.on(route.path, async (match) => {
      const requestId = ++navigationRequestId;
      showRoutePreloader();

      const params = match?.data ?? {};
      const access = await canAccessRoute(route);

      if (requestId !== navigationRequestId) {
        return;
      }

      if (!access.allowed) {
        navigate(access.redirectTo || '/');
        return;
      }

      setPageTitle(resolveRouteTitle(route, params));

      try {
        const content = await route.view({ navigate, params });

        if (requestId !== navigationRequestId) {
          return;
        }

        mainElement.replaceChildren(content);
        window.scrollTo(0, 0);
      } catch (error) {
        console.error(`Error rendering route ${route.path}:`, error);

        if (requestId !== navigationRequestId) {
          return;
        }

        setPageTitle('Not Found');
        mainElement.replaceChildren(renderNotFoundPage({ navigate }));
        window.scrollTo(0, 0);
      } finally {
        if (requestId === navigationRequestId) {
          hideRoutePreloader();
        }
      }
    });
  });

  router.notFound(() => {
    showRoutePreloader();
    setPageTitle('Not Found');
    mainElement.replaceChildren(renderNotFoundPage({ navigate }));
    window.scrollTo(0, 0);
    hideRoutePreloader();
  });

  router.resolve();
}
