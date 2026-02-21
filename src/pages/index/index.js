import './index.css';
import template from './index.html?raw';

export function renderIndexPage() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  return wrapper.firstElementChild;
}
