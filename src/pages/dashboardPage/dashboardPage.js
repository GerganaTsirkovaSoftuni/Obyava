import './dashboardPage.css';
import template from './dashboardPage.html?raw';
import { getPendingAds, getPendingAdsCount, getAllAds, approveAdvertisement, rejectAdvertisement, archiveAdvertisement, deleteAdvertisement } from '../../services/adsService.js';
import { getAllUsers, updateUserRole, deleteUser, getPlatformStats } from '../../services/userService.js';
import { confirm, alert } from '../../services/modalService.js';
import { escapeHtml } from '../../services/sanitizeService.js';

const PAGE_SIZE = 8;

const statusTranslations = {
  'Draft': 'Draft',
  'Pending': 'Pending Approval',
  'Published': 'Published',
  'Archived': 'Archived'
};

function createAdminAdRow(ad, onAction) {
  const row = document.createElement('div');
  row.className = 'admin-ad-row';

  const safeTitle = escapeHtml(ad.title);
  const safeImageUrl = escapeHtml(ad.image_url || '/placeholder.png');
  const safeUserName = escapeHtml(ad.user_name);
  
  row.innerHTML = `
    <div class="row align-items-center">
      <div class="col-auto">
        <img src="${safeImageUrl}" class="admin-ad-image" alt="${safeTitle}">
      </div>
      <div class="col">
        <h6 class="admin-ad-title mb-1">${safeTitle}</h6>
        <div class="admin-ad-details">
          <span class="me-3"><i class="bi bi-person me-1"></i>${safeUserName}</span>
          <span class="me-3"><i class="bi bi-tag me-1"></i>${ad.price ? ad.price + ' EUR' : 'Negotiable'}</span>
          <span class="me-3"><i class="bi bi-calendar me-1"></i>${new Date(ad.created_at).toLocaleDateString('en-US')}</span>
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
              <i class="bi bi-check-circle"></i> Approve
            </button>
            <button class="btn btn-sm btn-danger reject-btn" data-uuid="${ad.uuid}">
              <i class="bi bi-x-circle"></i> Reject
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
  const safeFullName = escapeHtml(user.full_name);
  const safeEmail = escapeHtml(user.email);
  const safeInitials = escapeHtml(initials);
  
  row.innerHTML = `
    <div class="row align-items-center">
      <div class="col-auto">
        <div class="user-avatar">${safeInitials}</div>
      </div>
      <div class="col">
        <h6 class="mb-1">${safeFullName}</h6>
        <p class="text-muted mb-0 small">${safeEmail}</p>
      </div>
      <div class="col-auto">
        <span class="role-badge role-${user.role}">${user.role === 'admin' ? 'Admin' : 'User'}</span>
      </div>
      <div class="col-auto">
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary toggle-role-btn" data-id="${user.id}">
            <i class="bi bi-person-gear"></i> ${user.role === 'admin' ? 'Set as User' : 'Set as Admin'}
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

async function loadPendingAds(offset = 0, limit = PAGE_SIZE + 1) {
  const ads = await getPendingAds({ offset, limit });
  return ads.map(ad => ({
    uuid: ad.uuid,
    title: ad.title,
    price: ad.price,
    status: ad.status,
    created_at: ad.created_at,
    user_name: ad.users?.full_name || 'Unknown',
    image_url: ad.advertisement_images?.[0]?.file_path || null
  }));
}

async function loadAllAds(statusFilter = '', offset = 0, limit = PAGE_SIZE + 1) {
  const filters = statusFilter ? { status: statusFilter, offset, limit } : { offset, limit };
  const ads = await getAllAds(filters);
  
  return ads.map(ad => ({
    uuid: ad.uuid,
    title: ad.title,
    price: ad.price,
    status: ad.status,
    created_at: ad.created_at,
    user_name: ad.users?.full_name || 'Unknown',
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
  const pendingPaginationWrap = section.querySelector('#pendingPaginationWrap');
  const pendingLoadMoreBtn = section.querySelector('#pendingLoadMoreBtn');
  
  const allAdsList = section.querySelector('#allAdsList');
  const loadingAllAds = section.querySelector('#loadingAllAds');
  const emptyAllAds = section.querySelector('#emptyAllAds');
  const allAdsPaginationWrap = section.querySelector('#allAdsPaginationWrap');
  const allAdsLoadMoreBtn = section.querySelector('#allAdsLoadMoreBtn');
  
  const usersList = section.querySelector('#usersList');
  const loadingUsers = section.querySelector('#loadingUsers');
  
  const statusFilterAll = section.querySelector('#statusFilterAll');

  let pendingOffset = 0;
  let pendingHasMore = false;
  let isLoadingPendingMore = false;

  let allAdsOffset = 0;
  let allAdsHasMore = false;
  let activeAllAdsStatusFilter = '';
  let isLoadingAllAdsMore = false;

  // Ad action handler
  async function handleAdAction(action, adId) {
    try {
      console.log(`Admin action: ${action} on ad ${adId}`);
      
      switch (action) {
        case 'approve':
          const approveConfirmed = await confirm('Approve this advertisement?', 'Approve Advertisement');
          if (approveConfirmed) {
            await approveAdvertisement(adId);
            await alert('Advertisement approved', 'Success', 'success');
            loadPendingAdsData(true);
            loadAllAdsData(true);
          }
          break;
        case 'reject':
          const reason = prompt('Reason for rejection:');
          if (reason) {
            await rejectAdvertisement(adId, reason);
            await alert('Advertisement rejected', 'Success', 'success');
            loadPendingAdsData(true);
            loadAllAdsData(true);
          }
          break;
        case 'archive':
          const archiveConfirmed = await confirm('Archive this advertisement?', 'Archive Advertisement');
          if (archiveConfirmed) {
            await archiveAdvertisement(adId);
            await alert('Advertisement archived', 'Success', 'success');
            loadAllAdsData(true);
          }
          break;
        case 'delete':
          const deleteConfirmed = await confirm('WARNING: Deletion is irreversible. Are you sure?', 'Delete Advertisement');
          if (deleteConfirmed) {
            await deleteAdvertisement(adId);
            await alert('Advertisement deleted', 'Success', 'success');
            loadPendingAdsData(true);
            loadAllAdsData(true);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling ad action:', error);
      await alert('Error executing action', 'Error', 'error');
    }
  }

  // User action handler
  async function handleUserAction(action, userId) {
    try {
      console.log(`Admin action: ${action} on user ${userId}`);
      
      switch (action) {
        case 'toggle-role':
          const roleConfirmed = await confirm('Change this user role?', 'Change User Role');
          if (roleConfirmed) {
            // Find user to get current role
            const users = await loadUsers();
            const user = users.find(u => u.id === userId);
            const newRole = user.role === 'admin' ? 'user' : 'admin';
            await updateUserRole(userId, newRole);
            await alert('Role updated', 'Success', 'success');
            loadUsersData();
          }
          break;
        case 'delete-user':
          const deleteUserConfirmed = await confirm('WARNING: Deleting this user will also remove all their advertisements. Are you sure?', 'Delete User');
          if (deleteUserConfirmed) {
            await deleteUser(userId);
            await alert('User deleted', 'Success', 'success');
            loadUsersData();
            loadAllAdsData(true); // Refresh ads as some might have been deleted
          }
          break;
      }
    } catch (error) {
      console.error('Error handling user action:', error);
      await alert('Error executing action', 'Error', 'error');
    }
  }

  // Load pending ads
  async function loadPendingAdsData(reset = true) {
    if (reset) {
      pendingOffset = 0;
      pendingHasMore = false;
      loadingPending.classList.remove('d-none');
      emptyPending.classList.add('d-none');
      pendingPaginationWrap.classList.add('d-none');
      
      const existingRows = pendingAdsList.querySelectorAll('.admin-ad-row');
      existingRows.forEach(row => row.remove());
    }
    
    try {
      const [adsChunk, pendingTotal] = await Promise.all([
        loadPendingAds(pendingOffset, PAGE_SIZE + 1),
        getPendingAdsCount()
      ]);

      const ads = adsChunk.slice(0, PAGE_SIZE);
      pendingHasMore = adsChunk.length > PAGE_SIZE;
      pendingOffset += ads.length;

      if (reset) {
        loadingPending.classList.add('d-none');
      }

      if (reset && ads.length === 0) {
        emptyPending.classList.remove('d-none');
      } else {
        emptyPending.classList.add('d-none');
        ads.forEach(ad => {
          const row = createAdminAdRow(ad, handleAdAction);
          pendingAdsList.appendChild(row);
        });
      }
      
      pendingCount.textContent = pendingTotal;
      pendingBadge.textContent = pendingTotal;

      if (pendingHasMore) {
        pendingPaginationWrap.classList.remove('d-none');
      } else {
        pendingPaginationWrap.classList.add('d-none');
      }
      
    } catch (error) {
      console.error('Error loading pending ads:', error);
      loadingPending.classList.add('d-none');
      pendingPaginationWrap.classList.add('d-none');
    }
  }

  // Load all ads
  async function loadAllAdsData(reset = true) {
    if (reset) {
      allAdsOffset = 0;
      allAdsHasMore = false;
      loadingAllAds.classList.remove('d-none');
      emptyAllAds.classList.add('d-none');
      allAdsPaginationWrap.classList.add('d-none');

      const existingRows = allAdsList.querySelectorAll('.admin-ad-row');
      existingRows.forEach(row => row.remove());
    }
    
    try {
      const adsChunk = await loadAllAds(activeAllAdsStatusFilter, allAdsOffset, PAGE_SIZE + 1);
      const ads = adsChunk.slice(0, PAGE_SIZE);
      allAdsHasMore = adsChunk.length > PAGE_SIZE;
      allAdsOffset += ads.length;

      if (reset) {
        loadingAllAds.classList.add('d-none');
      }

      if (reset && ads.length === 0) {
        emptyAllAds.classList.remove('d-none');
      } else {
        emptyAllAds.classList.add('d-none');
        ads.forEach(ad => {
          const row = createAdminAdRow(ad, handleAdAction);
          allAdsList.appendChild(row);
        });
      }

      if (allAdsHasMore) {
        allAdsPaginationWrap.classList.remove('d-none');
      } else {
        allAdsPaginationWrap.classList.add('d-none');
      }
      
      // Update stats using platform stats API
      const stats = await getPlatformStats();
      publishedCount.textContent = stats.published_ads;
      totalAdsCount.textContent = stats.total_ads;
      
    } catch (error) {
      console.error('Error loading all ads:', error);
      loadingAllAds.classList.add('d-none');
      allAdsPaginationWrap.classList.add('d-none');
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
    activeAllAdsStatusFilter = e.target.value;
    loadAllAdsData(true);
  });

  pendingLoadMoreBtn.addEventListener('click', async () => {
    if (isLoadingPendingMore || !pendingHasMore) {
      return;
    }

    isLoadingPendingMore = true;
    pendingLoadMoreBtn.disabled = true;
    pendingLoadMoreBtn.textContent = 'Loading...';

    try {
      await loadPendingAdsData(false);
    } finally {
      isLoadingPendingMore = false;
      pendingLoadMoreBtn.disabled = false;
      pendingLoadMoreBtn.textContent = 'Load 8 More';
    }
  });

  allAdsLoadMoreBtn.addEventListener('click', async () => {
    if (isLoadingAllAdsMore || !allAdsHasMore) {
      return;
    }

    isLoadingAllAdsMore = true;
    allAdsLoadMoreBtn.disabled = true;
    allAdsLoadMoreBtn.textContent = 'Loading...';

    try {
      await loadAllAdsData(false);
    } finally {
      isLoadingAllAdsMore = false;
      allAdsLoadMoreBtn.disabled = false;
      allAdsLoadMoreBtn.textContent = 'Load 8 More';
    }
  });

  // Initial load
  loadPendingAdsData(true);
  loadAllAdsData(true);
  loadUsersData();

  return section;
}
