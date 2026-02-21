import './dashboardPage.css';
import template from './dashboardPage.html?raw';

export function renderDashboardPage() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  return wrapper.firstElementChild;
}
