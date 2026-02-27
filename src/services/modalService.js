/**
 * Modal Service
 * Provides reusable confirm and alert modals with consistent design
 */

let modalContainer = null;

/**
 * Initialize modal container
 */
function initModal() {
  if (modalContainer) return;

  modalContainer = document.createElement('div');
  modalContainer.id = 'app-modal-container';
  modalContainer.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"></h5>
        </div>
        <div class="modal-body"></div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn-cancel">Cancel</button>
          <button class="modal-btn modal-btn-confirm">OK</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalContainer);
}

/**
 * Show modal
 */
function showModal() {
  initModal();
  modalContainer.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Hide modal
 */
function hideModal() {
  if (modalContainer) {
    modalContainer.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Show confirmation dialog
 * @param {string} message - Message to display
 * @param {string} title - Dialog title (default: "Confirm")
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function confirm(message, title = 'Confirm', options = {}) {
  return new Promise((resolve) => {
    initModal();
    
    const titleElement = modalContainer.querySelector('.modal-title');
    const bodyElement = modalContainer.querySelector('.modal-body');
    const cancelBtn = modalContainer.querySelector('.modal-btn-cancel');
    const confirmBtn = modalContainer.querySelector('.modal-btn-confirm');

    titleElement.textContent = title;
    bodyElement.textContent = message;
    modalContainer.classList.remove('modal-warning-variant');

    if (options.variant === 'warning') {
      modalContainer.classList.add('modal-warning-variant');
    }
    
    // Show cancel button
    cancelBtn.style.display = 'inline-flex';
    confirmBtn.textContent = 'OK';
    confirmBtn.className = 'modal-btn modal-btn-confirm';

    // Remove old listeners
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newConfirmBtn = confirmBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Handle cancel
    newCancelBtn.addEventListener('click', () => {
      hideModal();
      resolve(false);
    });

    // Handle confirm
    newConfirmBtn.addEventListener('click', () => {
      hideModal();
      resolve(true);
    });

    // Handle backdrop click
    const backdrop = modalContainer.querySelector('.modal-backdrop');
    const handleBackdropClick = () => {
      hideModal();
      resolve(false);
      backdrop.removeEventListener('click', handleBackdropClick);
    };
    backdrop.addEventListener('click', handleBackdropClick);

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        hideModal();
        resolve(false);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    showModal();
  });
}

/**
 * Show text input dialog
 * @param {string} message - Message to display
 * @param {string} title - Dialog title (default: "Enter Text")
 * @param {Object} options - { placeholder: string, maxLength: number }
 * @returns {Promise<string|null>} - Resolves to the entered text or null if cancelled
 */
export function promptText(message, title = 'Enter Text', options = {}) {
  return new Promise((resolve) => {
    initModal();
    
    const titleElement = modalContainer.querySelector('.modal-title');
    const bodyElement = modalContainer.querySelector('.modal-body');
    const cancelBtn = modalContainer.querySelector('.modal-btn-cancel');
    const confirmBtn = modalContainer.querySelector('.modal-btn-confirm');

    titleElement.textContent = title;
    
    // Create input area
    const inputContainer = document.createElement('div');
    inputContainer.innerHTML = `
      <p style="margin-bottom: 1rem; color: #6c757d; font-size: 0.95rem;">${message}</p>
      <textarea 
        id="prompt-input"
        class="form-control"
        style="min-height: 100px; resize: vertical;"
        placeholder="${options.placeholder || ''}"
        ${options.maxLength ? `maxlength="${options.maxLength}"` : ''}
      ></textarea>
      <small style="color: #999; margin-top: 0.5rem; display: block;">
        <span id="char-count">0</span>/<span id="char-max">${options.maxLength || 'unlimited'}</span> characters
      </small>
    `;
    bodyElement.innerHTML = '';
    bodyElement.appendChild(inputContainer);
    
    const inputElement = bodyElement.querySelector('#prompt-input');
    const charCount = bodyElement.querySelector('#char-count');
    const charMax = options.maxLength ? options.maxLength : Infinity;
    
    // Update char count
    inputElement.addEventListener('input', () => {
      charCount.textContent = inputElement.value.length;
    });
    
    // Focus on input
    setTimeout(() => inputElement.focus(), 100);
    
    // Show cancel button
    cancelBtn.style.display = 'inline-flex';
    confirmBtn.textContent = 'Submit';
    confirmBtn.className = 'modal-btn modal-btn-confirm';

    // Remove old listeners
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newConfirmBtn = confirmBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Handle cancel
    newCancelBtn.addEventListener('click', () => {
      hideModal();
      resolve(null);
    });

    // Handle confirm
    const handleSubmit = () => {
      const value = inputElement.value.trim();
      if (!value && !options.allowEmpty) {
        inputElement.focus();
        inputElement.style.borderColor = '#dc3545';
        return;
      }
      hideModal();
      resolve(value);
    };
    
    newConfirmBtn.addEventListener('click', handleSubmit);
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleSubmit();
      }
    });

    // Handle backdrop click
    const backdrop = modalContainer.querySelector('.modal-backdrop');
    const handleBackdropClick = () => {
      hideModal();
      resolve(null);
      backdrop.removeEventListener('click', handleBackdropClick);
    };
    backdrop.addEventListener('click', handleBackdropClick);

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        hideModal();
        resolve(null);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    showModal();
  });
}

/**
 * Show alert dialog
 * @param {string} message - Message to display
 * @param {string} title - Dialog title (default: "Notice")
 * @param {string} type - Alert type: 'success', 'error', 'warning', 'info' (default: 'info')
 * @returns {Promise<void>}
 */
export function alert(message, title = 'Notice', type = 'info') {
  return new Promise((resolve) => {
    initModal();
    
    const titleElement = modalContainer.querySelector('.modal-title');
    const bodyElement = modalContainer.querySelector('.modal-body');
    const cancelBtn = modalContainer.querySelector('.modal-btn-cancel');
    const confirmBtn = modalContainer.querySelector('.modal-btn-confirm');

    titleElement.textContent = title;
    bodyElement.textContent = message;
    modalContainer.classList.remove('modal-warning-variant');
    
    // Hide cancel button
    cancelBtn.style.display = 'none';
    
    // Set button style based on type
    confirmBtn.textContent = 'OK';
    confirmBtn.className = `modal-btn modal-btn-confirm modal-btn-${type}`;

    // Remove old listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Handle confirm
    newConfirmBtn.addEventListener('click', () => {
      hideModal();
      resolve();
    });

    // Handle backdrop click
    const backdrop = modalContainer.querySelector('.modal-backdrop');
    const handleBackdropClick = () => {
      hideModal();
      resolve();
      backdrop.removeEventListener('click', handleBackdropClick);
    };
    backdrop.addEventListener('click', handleBackdropClick);

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        hideModal();
        resolve();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    showModal();
  });
}
