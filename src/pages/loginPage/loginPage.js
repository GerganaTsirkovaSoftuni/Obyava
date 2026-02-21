import loginPageHTML from './loginPage.html?raw';
import './loginPage.css';
import { signIn } from '../../services/authService.js';

export function renderLoginPage({ navigate }) {
  const section = document.createElement('section');
  section.innerHTML = loginPageHTML;

  const form = section.querySelector('#loginForm');
  const errorMessage = section.querySelector('#errorMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.add('d-none');

    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Влизане...';

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) throw error;
      
      // Success - navigate to home
      navigate('/');
      
    } catch (error) {
      errorMessage.textContent = error.message || 'Грешка при влизане. Моля, проверете имейл и парола.';
      errorMessage.classList.remove('d-none');
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Влез';
    }
  });

  return section;
}
