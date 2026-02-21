import Navigo from 'navigo';
import { renderIndexPage } from './pages/index/index.js';
import { renderDashboardPage } from './pages/dashboardPage/dashboardPage.js';

const router = new Navigo('/', { hash: false });
const appName = 'Obyava';

const routeMap = [
  { path: '/', view: renderIndexPage, title: 'Home' },
  { path: '/dashboard', view: renderDashboardPage, title: 'Dashboard' },
  { path: '/login', title: 'Login' },
  { path: '/register', title: 'Register' },
  { path: '/advertisements', title: 'Advertisements' },
  {
    path: '/advertisements/:userID/advertisement',
    title: (params) => `Advertisement ${params.userID ? `- ${params.userID}` : ''}`,
  },
  {
    path: '/addminDashboard/:userID',
    title: (params) => `Admin Dashboard ${params.userID ? `- ${params.userID}` : ''}`,
  },
  {
    path: '/userProfileDashboard/:userID',
    title: (params) => `User Profile Dashboard ${params.userID ? `- ${params.userID}` : ''}`,
  },
];

function renderPlaceholder(path) {
  const section = document.createElement('section');
  section.className = 'page';
  section.innerHTML = `<h1>${path}</h1><p>Page is mapped but not implemented yet.</p>`;
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
    });
  });

  router.notFound(() => {
    setPageTitle('Not Found');
    mainElement.replaceChildren(renderPlaceholder('/not-found'));
  });

  router.resolve();
}
