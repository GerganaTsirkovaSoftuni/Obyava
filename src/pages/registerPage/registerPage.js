import registerPageHTML from './registerPage.html?raw';
import './registerPage.css';
import { signUp } from '../../services/authService.js';

export function renderRegisterPage({ navigate }) {
  const section = document.createElement('section');
  section.innerHTML = registerPageHTML;

  const form = section.querySelector('#registerForm');
  const errorMessage = section.querySelector('#errorMessage');
  const successMessage = section.querySelector('#successMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.add('d-none');
    successMessage.classList.add('d-none');

    const formData = new FormData(form);
    const fullName = formData.get('fullName');
    const phone = formData.get('phone');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    // Validate passwords match
    if (password !== confirmPassword) {
      errorMessage.textContent = 'Паролите не съвпадат';
      errorMessage.classList.remove('d-none');
      return;
    }

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Регистриране...';

    try {
      const { data, error } = await signUp(email, password, {
        full_name: fullName,
        phone: phone
      });
      
      if (error) throw error;
      
      // Success
      successMessage.textContent = 'Регистрацията е успешна! Моля, проверете имейла си за потвърждение.';
      successMessage.classList.remove('d-none');
      
      // Clear form
      form.reset();
      
      // Navigate to login after delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      errorMessage.textContent = error.message || 'Грешка при регистрация. Моля, опитайте отново.';
      errorMessage.classList.remove('d-none');
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Регистрирай се';
    }
  });

  return section;
}
