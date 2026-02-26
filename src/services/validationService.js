/**
 * Form Validation Service
 * Provides reusable validation functions for form inputs
 */

/**
 * Validate if a value is empty or contains only whitespace
 * @param {string} value - Value to validate
 * @returns {boolean} - True if invalid (empty or whitespace only)
 */
export function isEmpty(value) {
  return !value || value.trim().length === 0;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic check)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export function isValidPhone(phone) {
  const phoneRegex = /^\+359\s?\d{3}\s?\d{3}\s?\d{3}$/;
  return phoneRegex.test((phone || '').trim());
}

/**
 * Show error for a specific input field
 * @param {HTMLElement} input - Input element
 * @param {string} message - Error message to display
 */
export function showError(input, message) {
  // Remove any existing error
  clearError(input);
  
  // Add error class
  input.classList.add('is-invalid');
  input.classList.remove('is-valid');
  
  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'invalid-feedback';
  errorDiv.textContent = message;
  
  // Insert error message after input
  input.parentElement.appendChild(errorDiv);
}

/**
 * Clear error for a specific input field
 * @param {HTMLElement} input - Input element
 */
export function clearError(input) {
  input.classList.remove('is-invalid');
  
  // Remove error message
  const errorDiv = input.parentElement.querySelector('.invalid-feedback');
  if (errorDiv) {
    errorDiv.remove();
  }
}

/**
 * Show success state for a specific input field
 * @param {HTMLElement} input - Input element
 */
export function showSuccess(input) {
  clearError(input);
  input.classList.add('is-valid');
  input.classList.remove('is-invalid');
}

/**
 * Clear all validation states from input
 * @param {HTMLElement} input - Input element
 */
export function clearValidation(input) {
  input.classList.remove('is-valid', 'is-invalid');
  clearError(input);
}

/**
 * Validate required field
 * @param {HTMLElement} input - Input element
 * @param {string} fieldName - Human-readable field name
 * @returns {boolean} - True if valid
 */
export function validateRequired(input, fieldName) {
  const value = input.value;
  
  if (isEmpty(value)) {
    showError(input, `${fieldName} is required`);
    return false;
  }
  
  showSuccess(input);
  return true;
}

/**
 * Validate email field
 * @param {HTMLElement} input - Input element
 * @returns {boolean} - True if valid
 */
export function validateEmailField(input) {
  const value = input.value;
  
  if (isEmpty(value)) {
    showError(input, 'Email is required');
    return false;
  }
  
  if (!isValidEmail(value)) {
    showError(input, 'Please enter a valid email address');
    return false;
  }
  
  showSuccess(input);
  return true;
}

/**
 * Validate phone field
 * @param {HTMLElement} input - Input element
 * @returns {boolean} - True if valid
 */
export function validatePhoneField(input) {
  const value = input.value;
  
  if (isEmpty(value)) {
    showError(input, 'Phone number is required');
    return false;
  }
  
  if (!isValidPhone(value)) {
    showError(input, 'Please enter a valid phone number in format +359 888 123 456');
    return false;
  }
  
  showSuccess(input);
  return true;
}

/**
 * Validate password field
 * @param {HTMLElement} input - Input element
 * @param {number} minLength - Minimum length (default: 6)
 * @returns {boolean} - True if valid
 */
export function validatePassword(input, minLength = 6) {
  const value = input.value;
  
  if (isEmpty(value)) {
    showError(input, 'Password is required');
    return false;
  }
  
  if (value.length < minLength) {
    showError(input, `Password must be at least ${minLength} characters`);
    return false;
  }
  
  showSuccess(input);
  return true;
}

/**
 * Validate password confirmation
 * @param {HTMLElement} input - Confirm password input element
 * @param {string} password - Original password value
 * @returns {boolean} - True if valid
 */
export function validatePasswordConfirm(input, password) {
  const value = input.value;
  
  if (isEmpty(value)) {
    showError(input, 'Please confirm your password');
    return false;
  }
  
  if (value !== password) {
    showError(input, 'Passwords do not match');
    return false;
  }
  
  showSuccess(input);
  return true;
}

/**
 * Clear all errors in a form
 * @param {HTMLFormElement} form - Form element
 */
export function clearFormErrors(form) {
  const inputs = form.querySelectorAll('.form-control, .form-select');
  inputs.forEach(input => clearValidation(input));
}

/**
 * Add real-time validation to input
 * @param {HTMLElement} input - Input element
 * @param {Function} validator - Validation function
 */
export function addRealTimeValidation(input, validator) {
  input.addEventListener('blur', () => validator(input));
  input.addEventListener('input', () => {
    if (input.classList.contains('is-invalid') || input.classList.contains('is-valid')) {
      validator(input);
    }
  });
}
