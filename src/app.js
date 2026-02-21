import { createHeader } from './components/header/header.js';
import { createFooter } from './components/footer/footer.js';
import { navigate, setupRoutes } from './router.js';

export function createApp(rootElement) {
  const layout = document.createElement('div');
  layout.className = 'layout';

  const header = createHeader(navigate);
  const main = document.createElement('main');
  main.className = 'main-content';
  const footer = createFooter();

  layout.append(header, main, footer);
  rootElement.replaceChildren(layout);

  setupRoutes(main);
}
