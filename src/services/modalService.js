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
export function confirm(message, title = 'Confirm') {
  return new Promise((resolve) => {
    initModal();
    
    const titleElement = modalContainer.querySelector('.modal-title');
    const bodyElement = modalContainer.querySelector('.modal-body');
    const cancelBtn = modalContainer.querySelector('.modal-btn-cancel');
    const confirmBtn = modalContainer.querySelector('.modal-btn-confirm');

    titleElement.textContent = title;
    bodyElement.textContent = message;
    
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
