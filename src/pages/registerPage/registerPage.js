import registerPageHTML from './registerPage.html?raw';
import './registerPage.css';
import { signUp } from '../../services/authService.js';
import {
  validateRequired,
  validateEmailField,
  validatePhoneField,
  validatePassword,
  validatePasswordConfirm,
  clearFormErrors,
  addRealTimeValidation
} from '../../services/validationService.js';

export function renderRegisterPage({ navigate }) {
  const section = document.createElement('section');
  section.innerHTML = registerPageHTML;

  const form = section.querySelector('#registerForm');
  const errorMessage = section.querySelector('#errorMessage');
  const successMessage = section.querySelector('#successMessage');
  
  const fullNameInput = form.querySelector('#fullName');
  const phoneInput = form.querySelector('#phone');
  const emailInput = form.querySelector('#email');
  const passwordInput = form.querySelector('#password');
  const confirmPasswordInput = form.querySelector('#confirmPassword');

  function resetRegisterForm() {
    form.reset();
    clearFormErrors(form);
    [fullNameInput, phoneInput, emailInput, passwordInput, confirmPasswordInput].forEach((input) => {
      input.classList.remove('is-valid', 'is-invalid');
    });
  }

  // Add real-time validation
  addRealTimeValidation(fullNameInput, (input) => validateRequired(input, 'Full name'));
  addRealTimeValidation(phoneInput, validatePhoneField);
  addRealTimeValidation(emailInput, validateEmailField);
  addRealTimeValidation(passwordInput, validatePassword);
  addRealTimeValidation(confirmPasswordInput, (input) => validatePasswordConfirm(input, passwordInput.value));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.add('d-none');
    successMessage.classList.add('d-none');
    clearFormErrors(form);

    const formData = new FormData(form);
    const fullName = formData.get('fullName').trim();
    const phone = formData.get('phone').trim();
    const email = formData.get('email').trim();
    const password = formData.get('password').trim();
    const confirmPassword = formData.get('confirmPassword').trim();

    // Validate all fields
    const isFullNameValid = validateRequired(fullNameInput, 'Full name');
    const isPhoneValid = validatePhoneField(phoneInput);
    const isEmailValid = validateEmailField(emailInput);
    const isPasswordValid = validatePassword(passwordInput);
    const isConfirmPasswordValid = validatePasswordConfirm(confirmPasswordInput, password);

    if (!isFullNameValid || !isPhoneValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

    try {
      const { data, error } = await signUp(email, password, {
        full_name: fullName,
        phone: phone
      });
      
      if (error) throw error;
      
      // Success
      successMessage.textContent = 'Registration successful! Please check your email to confirm your account.';
      successMessage.classList.remove('d-none');
      
      // Clear form
      form.reset();
      clearFormErrors(form);
      
      // Navigate to login after delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      errorMessage.textContent = error.message || 'Registration failed. Please try again.';
      errorMessage.classList.remove('d-none');

      const normalizedMessage = (error?.message || '').toLowerCase();
      const isExistingUserError =
        (normalizedMessage.includes('already') && normalizedMessage.includes('registered')) ||
        normalizedMessage.includes('user already registered');

      if (normalizedMessage.includes('email') || normalizedMessage.includes('registered')) {
        emailInput.classList.remove('is-valid');
        emailInput.classList.add('is-invalid');
      }

      if (normalizedMessage.includes('password')) {
        passwordInput.classList.remove('is-valid');
        confirmPasswordInput.classList.remove('is-valid');
        passwordInput.classList.add('is-invalid');
        confirmPasswordInput.classList.add('is-invalid');
      }

      if (!normalizedMessage.includes('email') && !normalizedMessage.includes('password')) {
        [fullNameInput, phoneInput, emailInput, passwordInput, confirmPasswordInput].forEach((input) => {
          input.classList.remove('is-valid');
          input.classList.add('is-invalid');
        });
      }

      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Create Account';
    }
  });

  return section;
}
