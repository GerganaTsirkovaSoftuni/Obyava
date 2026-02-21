import './footer.css';
import template from './footer.html?raw';

export function createFooter() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  return wrapper.firstElementChild;
}
