import './notFoundPage.css';
import template from './notFoundPage.html?raw';

export function renderNotFoundPage({ navigate }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const section = wrapper.firstElementChild;

  section.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });

  return section;
}
