import './header.css';
import template from './header.html?raw';
import { getCurrentUser, isUserAdmin, signOut, onAuthStateChange } from '../../services/authService.js';
import { confirm, alert } from '../../services/modalService.js';

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

  // Check authentication state and update header
  checkAuthState(element);
  
  // Setup auth state listener for real-time updates
  onAuthStateChange(async (event, session) => {
    try {
      if (session) {
        const { user } = await getCurrentUser();
        if (user) {
          const { isAdmin } = await isUserAdmin(user.id);
          updateHeaderForAuthState(element, true, isAdmin);
          return;
        }
      }

      updateHeaderForAuthState(element, false, false);
    } catch (error) {
      console.error('Error handling auth state change:', error);
      updateHeaderForAuthState(element, false, false);
    }
  });

  return element;
}

function updateHeaderForAuthState(headerElement, isLoggedIn, isAdmin = false) {
  const loggedOutItems = headerElement.querySelectorAll('.logged-out-only');
  const loggedInItems = headerElement.querySelectorAll('.logged-in-only');
  const adminItems = headerElement.querySelectorAll('.admin-only');
  const navbarNav = headerElement.querySelector('.navbar-nav');

  // Remove auth loading state
  if (navbarNav) {
    navbarNav.classList.remove('auth-loading');
  }

  if (isLoggedIn) {
    loggedOutItems.forEach(item => item.classList.add('d-none'));
    loggedInItems.forEach(item => item.classList.remove('d-none'));
    
    if (isAdmin) {
      adminItems.forEach(item => item.classList.remove('d-none'));
    } else {
      adminItems.forEach(item => item.classList.add('d-none'));
    }
  } else {
    loggedOutItems.forEach(item => item.classList.remove('d-none'));
    loggedInItems.forEach(item => item.classList.add('d-none'));
    adminItems.forEach(item => item.classList.add('d-none'));
  }
}

async function checkAuthState(headerElement) {
  try {
    const { user } = await getCurrentUser();
    const isLoggedIn = !!user;
    let isAdmin = false;
    
    if (isLoggedIn) {
      const { isAdmin: adminStatus } = await isUserAdmin(user.id);
      isAdmin = adminStatus;
    }
    
    updateHeaderForAuthState(headerElement, isLoggedIn, isAdmin);
  } catch (error) {
    console.error('Error checking auth state:', error);
    updateHeaderForAuthState(headerElement, false, false);
  }
}

function closeNavbar(headerElement) {
  const navbarCollapse = headerElement.querySelector('.navbar-collapse');
  if (navbarCollapse && navbarCollapse.classList.contains('show')) {
    navbarCollapse.classList.remove('show');
  }
}
