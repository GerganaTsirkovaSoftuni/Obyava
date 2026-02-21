import './profilePage.css';
import template from './profilePage.html?raw';
import { getUserProfile, updateUserProfile, updatePassword, deleteAccount } from '../../services/authService.js';
import { getUserAds, deleteAdvertisement, getUserAdStats } from '../../services/adsService.js';

const statusTranslations = {
  'Draft': 'Чернова',
  'Pending': 'Чакаща одобрение',
  'Published': 'Публикувана',
  'Archived': 'Архивирана'
};

function createUserAdCard(ad, navigate) {
  const card = document.createElement('div');
  card.className = 'card user-ad-card shadow-sm';
  
  card.innerHTML = `
    <div class="card-body">
      <div class="row align-items-center">
        <div class="col-auto">
          <img src="${ad.image_url || '/placeholder.png'}" class="user-ad-image" alt="${ad.title}">
        </div>
        <div class="col">
          <h5 class="user-ad-title">${ad.title}</h5>
          <p class="user-ad-price mb-2">${ad.price ? ad.price + ' лв.' : 'По договаряне'}</p>
          <span class="status-badge status-${ad.status}">${statusTranslations[ad.status]}</span>
        </div>
        <div class="col-auto">
          <div class="user-ad-actions">
            <button class="btn btn-sm btn-outline-primary view-btn" data-uuid="${ad.uuid}">
              <i class="bi bi-eye"></i>
            </button>
            ${ad.status === 'Draft' ? `
              <button class="btn btn-sm btn-outline-primary edit-btn" data-uuid="${ad.uuid}">
                <i class="bi bi-pencil"></i>
              </button>
            ` : ''}
            ${ad.status === 'Draft' || ad.status === 'Pending' ? `
              <button class="btn btn-sm btn-outline-danger delete-btn" data-uuid="${ad.uuid}">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  card.querySelector('.view-btn').addEventListener('click', () => {
    navigate(`/advertisement/${ad.uuid}`);
  });
  
  const editBtn = card.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      navigate(`/edit-advertisement/${ad.uuid}`);
    });
  }
  
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Сигурни ли сте, че искате да изтриете тази обява?')) {
        try {
          await deleteAdvertisement(ad.uuid);
          card.remove();
          alert('Обявата е изтрита успешно');
        } catch (error) {
          console.error('Error deleting ad:', error);
          alert('Грешка при изтриване на обявата: ' + error.message);
        }
      }
    });
  }
  
  return card;
}

async function loadUserProfile() {
  const profile = await getUserProfile();
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    avatar_url: profile.avatar_url
  };
}

async function loadUserAds(statusFilter = '') {
  const filters = statusFilter ? { status: statusFilter } : {};
  const ads = await getUserAds(filters);
  
  return ads.map(ad => ({
    uuid: ad.uuid,
    title: ad.title,
    price: ad.price,
    status: ad.status,
    image_url: ad.advertisement_images?.[0]?.file_path || null
  }));
}

export function renderProfilePage({ navigate }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const section = wrapper.firstElementChild;

  // Get elements
  const userName = section.querySelector('#userName');
  const userEmail = section.querySelector('#userEmail');
  const userPhone = section.querySelector('#userPhone');
  const totalAds = section.querySelector('#totalAds');
  const publishedAds = section.querySelector('#publishedAds');
  const pendingAds = section.querySelector('#pendingAds');
  const draftAds = section.querySelector('#draftAds');
  const userAdsList = section.querySelector('#userAdsList');
  const loadingAds = section.querySelector('#loadingAds');
  const emptyAds = section.querySelector('#emptyAds');
  const createNewAdBtn = section.querySelector('#createNewAdBtn');
  const statusFilters = section.querySelectorAll('input[name="statusFilter"]');
  
  const updateProfileForm = section.querySelector('#updateProfileForm');
  const changePasswordForm = section.querySelector('#changePasswordForm');
  const deleteAccountBtn = section.querySelector('#deleteAccountBtn');

  // Create new ad button
  createNewAdBtn.addEventListener('click', () => {
    navigate('/create-advertisement');
  });

  // Load user profile
  loadUserProfile().then(user => {
    userName.textContent = user.full_name;
    userEmail.textContent = user.email;
    userPhone.textContent = user.phone;
    
    // Populate settings form
    section.querySelector('#updateFullName').value = user.full_name;
    section.querySelector('#updatePhone').value = user.phone;
    section.querySelector('#updateEmail').value = user.email;
  });

  // Display user ads function
  async function displayUserAds(statusFilter = '') {
    loadingAds.classList.remove('d-none');
    emptyAds.classList.add('d-none');
    
    // Clear existing ads except loading/empty states
    const existingCards = userAdsList.querySelectorAll('.card.user-ad-card');
    existingCards.forEach(card => card.remove());
    
    try {
      const ads = await loadUserAds(statusFilter);
      
      loadingAds.classList.add('d-none');
      
      if (ads.length === 0) {
        emptyAds.classList.remove('d-none');
        return;
      }
      
      // Update stats using dedicated API
      const stats = await getUserAdStats();
      totalAds.textContent = stats.total;
      publishedAds.textContent = stats.published;
      pendingAds.textContent = stats.pending;
      draftAds.textContent = stats.drafts;
      
      ads.forEach(ad => {
        const adCard = createUserAdCard(ad, navigate);
        userAdsList.appendChild(adCard);
      });
      
    } catch (error) {
      console.error('Error loading ads:', error);
      loadingAds.classList.add('d-none');
      emptyAds.classList.remove('d-none');
    }
  }

  // Filter change handlers
  statusFilters.forEach(filter => {
    filter.addEventListener('change', (e) => {
      displayUserAds(e.target.value);
    });
  });

  // Initial load
  displayUserAds();

  // Update profile form
  updateProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(updateProfileForm);
    
    try {
      await updateUserProfile({
        full_name: formData.get('fullName'),
        phone: formData.get('phone')
      });
      
      alert('Профилът е обновен успешно!');
      // Reload profile data
      const user = await loadUserProfile();
      userName.textContent = user.full_name;
      userPhone.textContent = user.phone;
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Грешка при обновяване на профила: ' + error.message);
    }
  });

  // Change password form
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(changePasswordForm);
    const newPassword = formData.get('newPassword');
    const confirmNewPassword = formData.get('confirmNewPassword');
    
    if (newPassword !== confirmNewPassword) {
      alert('Паролите не съвпадат');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Паролата трябва да е поне 6 символа');
      return;
    }
    
    try {
      await updatePassword(newPassword);
      alert('Паролата е сменена успешно!');
      changePasswordForm.reset();
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Грешка при смяна на паролата: ' + error.message);
    }
  });

  // Delete account
  deleteAccountBtn.addEventListener('click', async () => {
    const confirmed = confirm('ВНИМАНИЕ: Това действие е необратимо! Всички ваши обяви също ще бъдат изтрити. Сигурни ли сте?');
    
    if (confirmed) {
      const doubleConfirm = confirm('Моля, потвърдете отново. Наистина ли искате да изтриете профила си?');
      
      if (doubleConfirm) {
        try {
          await deleteAccount();
          alert('Профилът е изтрит');
          navigate('/');
        } catch (error) {
          console.error('Error deleting account:', error);
          alert('Грешка при изтриване на профила: ' + error.message);
        }
      }
    }
  });

  return section;
}
