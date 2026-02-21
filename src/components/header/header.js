import './header.css';
import template from './header.html?raw';
import { getSession, isUserAdmin, signOut, onAuthStateChange } from '../../services/authService.js';

export function createHeader(navigate) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const element = wrapper.firstElementChild;

  // Setup navigation links
  element.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });

  // Setup logout button
  const logoutBtn = element.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Сигурни ли сте, че искате да излезете?')) {
        try {
          await signOut();
          
          // Update UI
          updateHeaderForAuthState(element, false, false);
          
          // Navigate to home
          navigate('/');
          
          alert('Излязохте успешно');
        } catch (error) {
          console.error('Error logging out:', error);
          alert('Грешка при излизане: ' + error.message);
        }
      }
    });
  }

  // Check authentication state and update header
  checkAuthState(element);
  
  // Setup auth state listener for real-time updates
  onAuthStateChange((event, session) => {
    const isLoggedIn = !!session;
    if (isLoggedIn) {
      isUserAdmin().then(isAdmin => {
        updateHeaderForAuthState(element, true, isAdmin);
      });
    } else {
      updateHeaderForAuthState(element, false, false);
    }
  });

  return element;
}

function updateHeaderForAuthState(headerElement, isLoggedIn, isAdmin = false) {
  const loggedOutItems = headerElement.querySelectorAll('.logged-out-only');
  const loggedInItems = headerElement.querySelectorAll('.logged-in-only');
  const adminItems = headerElement.querySelectorAll('.admin-only');

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
    const { session } = await getSession();
    const isLoggedIn = !!session;
    let isAdmin = false;
    
    if (isLoggedIn) {
      isAdmin = await isUserAdmin();
    }
    
    updateHeaderForAuthState(headerElement, isLoggedIn, isAdmin);
  } catch (error) {
    console.error('Error checking auth state:', error);
    updateHeaderForAuthState(headerElement, false, false);
  }
}
