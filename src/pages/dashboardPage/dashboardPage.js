import './dashboardPage.css';
import template from './dashboardPage.html?raw';
import { getPendingAds, getAllAds, approveAdvertisement, rejectAdvertisement, archiveAdvertisement, deleteAdvertisement } from '../../services/adsService.js';
import { getAllUsers, updateUserRole, deleteUser, getPlatformStats } from '../../services/userService.js';

const statusTranslations = {
  'Draft': 'Чернова',
  'Pending': 'Чакаща одобрение',
  'Published': 'Публикувана',
  'Archived': 'Архивирана'
};

function createAdminAdRow(ad, onAction) {
  const row = document.createElement('div');
  row.className = 'admin-ad-row';
  
  row.innerHTML = `
    <div class="row align-items-center">
      <div class="col-auto">
        <img src="${ad.image_url || '/placeholder.png'}" class="admin-ad-image" alt="${ad.title}">
      </div>
      <div class="col">
        <h6 class="admin-ad-title mb-1">${ad.title}</h6>
        <div class="admin-ad-details">
          <span class="me-3"><i class="bi bi-person me-1"></i>${ad.user_name}</span>
          <span class="me-3"><i class="bi bi-tag me-1"></i>${ad.price ? ad.price + ' лв.' : 'По договаряне'}</span>
          <span class="me-3"><i class="bi bi-calendar me-1"></i>${new Date(ad.created_at).toLocaleDateString('bg-BG')}</span>
        </div>
      </div>
      <div class="col-auto">
        <span class="status-badge status-${ad.status}">${statusTranslations[ad.status]}</span>
      </div>
      <div class="col-auto">
        <div class="admin-actions">
          <button class="btn btn-sm btn-outline-primary view-btn" data-id="${ad.id}">
            <i class="bi bi-eye"></i>
          </button>
          ${ad.status === 'Pending' ? `
            <button class="btn btn-sm btn-success approve-btn" data-uuid="${ad.uuid}">
              <i class="bi bi-check-circle"></i> Одобри
            </button>
            <button class="btn btn-sm btn-danger reject-btn" data-uuid="${ad.uuid}">
              <i class="bi bi-x-circle"></i> Отхвърли
            </button>
          ` : ''}
          ${ad.status !== 'Archived' ? `
            <button class="btn btn-sm btn-warning archive-btn" data-uuid="${ad.uuid}">
              <i class="bi bi-archive"></i>
            </button>
          ` : ''}
          <button class="btn btn-sm btn-danger delete-btn" data-uuid="${ad.uuid}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  row.querySelector('.view-btn').addEventListener('click', () => {
    window.location.href = `/advertisement/${ad.uuid}`;
  });
  
  const approveBtn = row.querySelector('.approve-btn');
  if (approveBtn) {
    approveBtn.addEventListener('click', () => onAction('approve', ad.uuid));
  }
  
  const rejectBtn = row.querySelector('.reject-btn');
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => onAction('reject', ad.uuid));
  }
  
  const archiveBtn = row.querySelector('.archive-btn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', () => onAction('archive', ad.uuid));
  }
  
  const deleteBtn = row.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => onAction('delete', ad.uuid));
  }
  
  return row;
}

function createUserRow(user, onAction) {
  const row = document.createElement('div');
  row.className = 'user-row';
  
  const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  row.innerHTML = `
    <div class="row align-items-center">
      <div class="col-auto">
        <div class="user-avatar">${initials}</div>
      </div>
      <div class="col">
        <h6 class="mb-1">${user.full_name}</h6>
        <p class="text-muted mb-0 small">${user.email}</p>
      </div>
      <div class="col-auto">
        <span class="role-badge role-${user.role}">${user.role === 'admin' ? 'Админ' : 'Потребител'}</span>
      </div>
      <div class="col-auto">
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary toggle-role-btn" data-id="${user.id}">
            <i class="bi bi-person-gear"></i> ${user.role === 'admin' ? 'Направи потребител' : 'Направи админ'}
          </button>
          ${user.role !== 'admin' ? `
            <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}">
              <i class="bi bi-trash"></i>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  const toggleRoleBtn = row.querySelector('.toggle-role-btn');
  toggleRoleBtn.addEventListener('click', () => onAction('toggle-role', user.id));
  
  const deleteUserBtn = row.querySelector('.delete-user-btn');
  if (deleteUserBtn) {
    deleteUserBtn.addEventListener('click', () => onAction('delete-user', user.id));
  }
  
  return row;
}

async function loadPendingAds() {
  const ads = await getPendingAds();
  return ads.map(ad => ({
    uuid: ad.uuid,
    title: ad.title,
    price: ad.price,
    status: ad.status,
    created_at: ad.created_at,
    user_name: ad.users?.full_name || 'Неизвестен',
    image_url: ad.advertisement_images?.[0]?.file_path || null
  }));
}

async function loadAllAds(statusFilter = '') {
  const filters = statusFilter ? { status: statusFilter } : {};
  const ads = await getAllAds(filters);
  
  return ads.map(ad => ({
    uuid: ad.uuid,
    title: ad.title,
    price: ad.price,
    status: ad.status,
    created_at: ad.created_at,
    user_name: ad.users?.full_name || 'Неизвестен',
    image_url: ad.advertisement_images?.[0]?.file_path || null
  }));
}

async function loadUsers() {
  const users = await getAllUsers();
  return users.map(user => ({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role
  }));
}

export function renderDashboardPage({ navigate }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const section = wrapper.firstElementChild;

  // Get elements
  const pendingCount = section.querySelector('#pendingCount');
  const publishedCount = section.querySelector('#publishedCount');
  const usersCount = section.querySelector('#usersCount');
  const totalAdsCount = section.querySelector('#totalAdsCount');
  const pendingBadge = section.querySelector('#pendingBadge');
  
  const pendingAdsList = section.querySelector('#pendingAdsList');
  const loadingPending = section.querySelector('#loadingPending');
  const emptyPending = section.querySelector('#emptyPending');
  
  const allAdsList = section.querySelector('#allAdsList');
  const loadingAllAds = section.querySelector('#loadingAllAds');
  
  const usersList = section.querySelector('#usersList');
  const loadingUsers = section.querySelector('#loadingUsers');
  
  const statusFilterAll = section.querySelector('#statusFilterAll');

  // Ad action handler
  async function handleAdAction(action, adId) {
    try {
      console.log(`Admin action: ${action} on ad ${adId}`);
      
      switch (action) {
        case 'approve':
          if (confirm('Одобри тази обява?')) {
            await approveAdvertisement(adId);
            alert('Обявата е одобрена');
            loadPendingAdsData();
            loadAllAdsData();
          }
          break;
        case 'reject':
          const reason = prompt('Причина за отхвърляне:');
          if (reason) {
            await rejectAdvertisement(adId, reason);
            alert('Обявата е отхвърлена');
            loadPendingAdsData();
            loadAllAdsData();
          }
          break;
        case 'archive':
          if (confirm('Архивирай тази обява?')) {
            await archiveAdvertisement(adId);
            alert('Обявата е архивирана');
            loadAllAdsData();
          }
          break;
        case 'delete':
          if (confirm('ВНИМАНИЕ: Изтриването е необратимо! Сигурни ли сте?')) {
            await deleteAdvertisement(adId);
            alert('Обявата е изтрита');
            loadPendingAdsData();
            loadAllAdsData();
          }
          break;
      }
    } catch (error) {
      console.error('Error handling ad action:', error);
      alert('Грешка при изпълнение на действието');
    }
  }

  // User action handler
  async function handleUserAction(action, userId) {
    try {
      console.log(`Admin action: ${action} on user ${userId}`);
      
      switch (action) {
        case 'toggle-role':
          if (confirm('Промени ролята на този потребител?')) {
            // Find user to get current role
            const users = await loadUsers();
            const user = users.find(u => u.id === userId);
            const newRole = user.role === 'admin' ? 'user' : 'admin';
            await updateUserRole(userId, newRole);
            alert('Ролята е променена');
            loadUsersData();
          }
          break;
        case 'delete-user':
          if (confirm('ВНИМАНИЕ: Изтриването ще премахне и всички обяви на потребителя! Сигурни ли сте?')) {
            await deleteUser(userId);
            alert('Потребителят е изтрит');
            loadUsersData();
            loadAllAdsData(); // Refresh ads as some might have been deleted
          }
          break;
      }
    } catch (error) {
      console.error('Error handling user action:', error);
      alert('Грешка при изпълнение на действието');
    }
  }

  // Load pending ads
  async function loadPendingAdsData() {
    loadingPending.classList.remove('d-none');
    emptyPending.classList.add('d-none');
    
    const existingRows = pendingAdsList.querySelectorAll('.admin-ad-row');
    existingRows.forEach(row => row.remove());
    
    try {
      const ads = await loadPendingAds();
      
      loadingPending.classList.add('d-none');
      
      if (ads.length === 0) {
        emptyPending.classList.remove('d-none');
      } else {
        ads.forEach(ad => {
          const row = createAdminAdRow(ad, handleAdAction);
          pendingAdsList.appendChild(row);
        });
      }
      
      pendingCount.textContent = ads.length;
      pendingBadge.textContent = ads.length;
      
    } catch (error) {
      console.error('Error loading pending ads:', error);
      loadingPending.classList.add('d-none');
    }
  }

  // Load all ads
  async function loadAllAdsData(statusFilter = '') {
    loadingAllAds.classList.remove('d-none');
    
    const existingRows = allAdsList.querySelectorAll('.admin-ad-row');
    existingRows.forEach(row => row.remove());
    
    try {
      const ads = await loadAllAds(statusFilter);
      
      loadingAllAds.classList.add('d-none');
      
      if (ads.length === 0) {
        allAdsList.innerHTML = '<div class="text-center py-5 text-muted">Няма намерени обяви</div>';
      } else {
        ads.forEach(ad => {
          const row = createAdminAdRow(ad, handleAdAction);
          allAdsList.appendChild(row);
        });
      }
      
      // Update stats using platform stats API
      const stats = await getPlatformStats();
      publishedCount.textContent = stats.published_ads;
      totalAdsCount.textContent = stats.total_ads;
      
    } catch (error) {
      console.error('Error loading all ads:', error);
      loadingAllAds.classList.add('d-none');
    }
  }

  // Load users
  async function loadUsersData() {
    loadingUsers.classList.remove('d-none');
    
    const existingRows = usersList.querySelectorAll('.user-row');
    existingRows.forEach(row => row.remove());
    
    try {
      const users = await loadUsers();
      
      loadingUsers.classList.add('d-none');
      
      users.forEach(user => {
        const row = createUserRow(user, handleUserAction);
        usersList.appendChild(row);
      });
      
      usersCount.textContent = users.length;
      
    } catch (error) {
      console.error('Error loading users:', error);
      loadingUsers.classList.add('d-none');
    }
  }

  // Status filter change
  statusFilterAll.addEventListener('change', (e) => {
    loadAllAdsData(e.target.value);
  });

  // Initial load
  loadPendingAdsData();
  loadAllAdsData();
  loadUsersData();

  return section;
}
