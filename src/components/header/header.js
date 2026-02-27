import './header.css';
import template from './header.html?raw';
import { getCurrentUser, isUserAdmin, signOut, onAuthStateChange } from '../../services/authService.js';
import { getPendingAdsCount } from '../../services/adsService.js';
import { confirm, alert } from '../../services/modalService.js';

let adminNotificationCheckInterval = null;
let currentHeaderElement = null;
let authResolutionRequestId = 0;

function setAuthLoadingState(headerElement, isLoading) {
  const navbarNav = headerElement.querySelector('.navbar-nav');
  if (!navbarNav) return;

  navbarNav.classList.toggle('auth-loading', isLoading);
}

async function resolveAndApplyAuthState(headerElement) {
  const requestId = ++authResolutionRequestId;
  setAuthLoadingState(headerElement, true);

  try {
    const { user } = await getCurrentUser();

    if (requestId !== authResolutionRequestId) {
      return;
    }

    if (user) {
      const { isAdmin } = await isUserAdmin(user.id);

      if (requestId !== authResolutionRequestId) {
        return;
      }

      updateHeaderForAuthState(headerElement, true, isAdmin);
    } else {
      updateHeaderForAuthState(headerElement, false, false);
    }
  } catch (error) {
    console.error('Error resolving auth state:', error);

    if (requestId !== authResolutionRequestId) {
      return;
    }

    updateHeaderForAuthState(headerElement, false, false);
  } finally {
    if (requestId === authResolutionRequestId) {
      setAuthLoadingState(headerElement, false);
    }
  }
}

async function updateAdminNotificationBadge(headerElement) {
  const notificationBadge = headerElement.querySelector('#adminNotificationBadge');
  if (!notificationBadge) return;

  try {
    const count = await getPendingAdsCount();
    
    if (count > 0) {
      notificationBadge.classList.remove('hidden');
    } else {
      notificationBadge.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error checking pending ads count:', error);
    notificationBadge.classList.add('hidden');
  }
}

function startAdminNotificationCheck(headerElement) {
  currentHeaderElement = headerElement;
  
  // Initial check
  updateAdminNotificationBadge(headerElement);
  
  // Check every 5 seconds for pending ads (more frequent than before)
  if (adminNotificationCheckInterval) {
    clearInterval(adminNotificationCheckInterval);
  }
  
  adminNotificationCheckInterval = setInterval(() => {
    if (currentHeaderElement) {
      updateAdminNotificationBadge(currentHeaderElement);
    }
  }, 5000);
}

function stopAdminNotificationCheck() {
  if (adminNotificationCheckInterval) {
    clearInterval(adminNotificationCheckInterval);
    adminNotificationCheckInterval = null;
  }
  currentHeaderElement = null;
}

// Export for external calls
export function refreshAdminNotificationBadge() {
  if (currentHeaderElement) {
    updateAdminNotificationBadge(currentHeaderElement);
  }
}

export function createHeader(navigate) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const element = wrapper.firstElementChild;

  // Setup navigation links
  element.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
      
      // Close mobile navbar after navigation
      closeNavbar(element);
    });
  });

  // Setup logout button
  const logoutBtn = element.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const confirmed = await confirm('Are you sure you want to log out?', 'Log Out');
      if (confirmed) {
        try {
          await signOut();
          
          // Update UI
          updateHeaderForAuthState(element, false, false);
          
          // Close mobile navbar
          closeNavbar(element);
          
          // Navigate to home
          navigate('/');
          
          await alert('Logged out successfully', 'Success', 'success');
        } catch (error) {
          console.error('Error logging out:', error);
          await alert('Logout error: ' + error.message, 'Error', 'error');
        }
      }
    });
  }

  // Keep auth menu hidden until user + role are resolved
  setAuthLoadingState(element, true);
  resolveAndApplyAuthState(element);
  
  // Setup auth state listener for real-time updates
  onAuthStateChange(() => {
    resolveAndApplyAuthState(element);
  });

  return element;
}

function updateHeaderForAuthState(headerElement, isLoggedIn, isAdmin = false) {
  const loggedOutItems = headerElement.querySelectorAll('.logged-out-only');
  const loggedInItems = headerElement.querySelectorAll('.logged-in-only');
  const adminItems = headerElement.querySelectorAll('.admin-only');
  const newAdLink = headerElement.querySelector('.new-ad-link');
  if (isLoggedIn) {
    loggedOutItems.forEach(item => item.classList.add('d-none'));
    loggedInItems.forEach(item => item.classList.remove('d-none'));
    
    if (isAdmin) {
      adminItems.forEach(item => item.classList.remove('d-none'));
      // Hide "New Ad" link for admin users
      if (newAdLink) {
        newAdLink.classList.add('d-none');
      }
      startAdminNotificationCheck(headerElement);
    } else {
      adminItems.forEach(item => item.classList.add('d-none'));
      // Show "New Ad" link for regular users
      if (newAdLink) {
        newAdLink.classList.remove('d-none');
      }
      stopAdminNotificationCheck();
    }
  } else {
    loggedOutItems.forEach(item => item.classList.remove('d-none'));
    loggedInItems.forEach(item => item.classList.add('d-none'));
    adminItems.forEach(item => item.classList.add('d-none'));
    stopAdminNotificationCheck();
  }
}

function closeNavbar(headerElement) {
  const navbarCollapse = headerElement.querySelector('.navbar-collapse');
  if (navbarCollapse && navbarCollapse.classList.contains('show')) {
    navbarCollapse.classList.remove('show');
  }
}
