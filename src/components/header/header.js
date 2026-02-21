import './header.css';
import template from './header.html?raw';

export function createHeader(navigate) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const element = wrapper.firstElementChild;

  element.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });

  return element;
}
