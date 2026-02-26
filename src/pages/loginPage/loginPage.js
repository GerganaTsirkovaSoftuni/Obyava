import loginPageHTML from './loginPage.html?raw';
import './loginPage.css';
import { signIn } from '../../services/authService.js';
import { 
  validateEmailField, 
  validatePassword, 
  clearFormErrors,
  addRealTimeValidation
} from '../../services/validationService.js';

export function renderLoginPage({ navigate }) {
  const section = document.createElement('section');
  section.innerHTML = loginPageHTML;

  const form = section.querySelector('#loginForm');
  const errorMessage = section.querySelector('#errorMessage');
  const emailInput = form.querySelector('#email');
  const passwordInput = form.querySelector('#password');

  // Add real-time validation
  addRealTimeValidation(emailInput, validateEmailField);
  addRealTimeValidation(passwordInput, validatePassword);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.add('d-none');
    clearFormErrors(form);

    // Validate all fields
    const isEmailValid = validateEmailField(emailInput);
    const isPasswordValid = validatePassword(passwordInput);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    const formData = new FormData(form);
    const email = formData.get('email').trim();
    const password = formData.get('password').trim();

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) throw error;
      
      // Success - navigate to home
      navigate('/');
      
    } catch (error) {
      errorMessage.textContent = error.message || 'Login failed. Please check your email and password.';
      errorMessage.classList.remove('d-none');

      emailInput.classList.remove('is-valid');
      passwordInput.classList.remove('is-valid');
      emailInput.classList.add('is-invalid');
      passwordInput.classList.add('is-invalid');
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
    }
  });

  return section;
}
