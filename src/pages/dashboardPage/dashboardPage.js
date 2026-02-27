import './dashboardPage.css';
import template from './dashboardPage.html?raw';
import { getPendingAds, getPendingAdsCount, getAllAds, approveAdvertisement, rejectAdvertisement, archiveAdvertisement, deleteAdvertisement } from '../../services/adsService.js';
import { getAllUsers, updateUserRole, deleteUser, getPlatformStats } from '../../services/userService.js';
import { getCurrentUser } from '../../services/authService.js';
import { confirm, alert, promptText } from '../../services/modalService.js';
import { escapeHtml } from '../../services/sanitizeService.js';
import { refreshAdminNotificationBadge } from '../../components/header/header.js';

const PAGE_SIZE = 8;

const statusTranslations = {
  'Draft': 'Draft',
  'Pending': 'Pending Approval',
  'Published': 'Published',
  'Archived': 'Archived',
  'Rejected': 'Rejected'
};

function createAdminAdRow(ad, onAction, navigate) {
  const row = document.createElement('div');
  row.className = 'admin-ad-row';

  const safeTitle = escapeHtml(ad.title);
  const safeImageUrl = escapeHtml(ad.image_url || '/placeholder.png');
  const safeUserName = escapeHtml(ad.user_name);
  
  row.innerHTML = `
    <div class="row align-items-center">
      <div class="col-auto admin-ad-image-col">
        <img src="${safeImageUrl}" class="admin-ad-image" alt="${safeTitle}">
      </div>
      <div class="col admin-ad-info-col">
        <h6 class="admin-ad-title mb-1">${safeTitle}</h6>
        <div class="admin-ad-details">
          <span class="me-3"><i class="bi bi-person me-1"></i>${safeUserName}</span>
          <span class="me-3"><i class="bi bi-tag me-1"></i>${ad.price ? ad.price + ' EUR' : 'Negotiable'}</span>
          <span class="me-3"><i class="bi bi-calendar me-1"></i>${new Date(ad.created_at).toLocaleDateString('en-US')}</span>
        </div>
      </div>
      <div class="col-auto admin-ad-status-col">
        <span class="status-badge status-${String(ad.status || '').toLowerCase()}">${statusTranslations[ad.status]}</span>
      </div>
      <div class="col-auto admin-ad-actions-col">
        <div class="admin-actions">
          <button class="btn btn-sm btn-outline-primary view-btn admin-action-btn" data-id="${ad.id}" title="View" aria-label="View">
            <i class="bi bi-eye"></i><span class="action-label"> View</span>
          </button>
          ${ad.status === 'Pending' ? `
            <button class="btn btn-sm btn-success approve-btn admin-action-btn" data-uuid="${ad.uuid}" title="Approve" aria-label="Approve">
              <i class="bi bi-check-circle"></i><span class="action-label"> Approve</span>
            </button>
            <button class="btn btn-sm btn-danger reject-btn admin-action-btn" data-uuid="${ad.uuid}" title="Reject" aria-label="Reject">
              <i class="bi bi-x-circle"></i><span class="action-label"> Reject</span>
            </button>
          ` : ''}
          ${ad.status !== 'Archived' ? `
            <button class="btn btn-sm btn-warning archive-btn admin-action-btn" data-uuid="${ad.uuid}" title="Archive" aria-label="Archive">
              <i class="bi bi-archive"></i><span class="action-label"> Archive</span>
            </button>
          ` : ''}
          <button class="btn btn-sm btn-danger delete-btn admin-action-btn" data-uuid="${ad.uuid}" title="Delete" aria-label="Delete">
            <i class="bi bi-trash"></i><span class="action-label"> Delete</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  row.querySelector('.view-btn').addEventListener('click', () => {
    navigate(`/advertisement/${ad.uuid}`);
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

function createUserRow(user, onAction, currentAdminId) {
  const row = document.createElement('div');
  row.className = 'user-row';

  const isCurrentAdmin = user.id === currentAdminId;
  const showToggleRole = !isCurrentAdmin;
  const showViewAds = user.role !== 'admin';
  const showDelete = user.role !== 'admin' && !isCurrentAdmin;
  
  const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
  const safeFullName = escapeHtml(user.full_name);
  const safeEmail = escapeHtml(user.email);
  const safeInitials = escapeHtml(initials);
  
  row.innerHTML = `
    <div class="row align-items-center">
      <div class="col-auto user-avatar-col">
        <div class="user-avatar">${safeInitials}</div>
      </div>
      <div class="col user-info-col">
        <h6 class="mb-1">${safeFullName}</h6>
        <p class="text-muted mb-0 small">${safeEmail}</p>
      </div>
      <div class="col-auto user-role-col">
        <span class="role-badge role-${user.role}">${user.role === 'admin' ? 'Admin' : 'User'}</span>
      </div>
      <div class="col-auto user-actions-col">
        <div class="d-flex gap-2 user-actions-wrap">
          ${showToggleRole ? `
            <button class="btn btn-sm btn-outline-primary toggle-role-btn user-action-btn" data-id="${user.id}" title="${user.role === 'admin' ? 'Set as User' : 'Set as Admin'}" aria-label="${user.role === 'admin' ? 'Set as User' : 'Set as Admin'}">
              <i class="bi bi-person-gear"></i><span class="action-label"> ${user.role === 'admin' ? 'Set as User' : 'Set as Admin'}</span>
            </button>
          ` : ''}
          ${showViewAds ? `
            <button class="btn btn-sm btn-outline-primary view-user-ads-btn user-action-btn" data-id="${user.id}" title="View Ads" aria-label="View Ads">
              <i class="bi bi-grid"></i><span class="action-label"> View Ads</span>
            </button>
          ` : ''}
          ${showDelete ? `
            <button class="btn btn-sm btn-danger delete-user-btn user-action-btn" data-id="${user.id}" title="Delete User" aria-label="Delete User">
              <i class="bi bi-trash"></i><span class="action-label"> Delete</span>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  const toggleRoleBtn = row.querySelector('.toggle-role-btn');
  if (toggleRoleBtn) {
    toggleRoleBtn.addEventListener('click', () => onAction('toggle-role', user.id));
  }

  const viewUserAdsBtn = row.querySelector('.view-user-ads-btn');
  if (viewUserAdsBtn) {
    viewUserAdsBtn.addEventListener('click', () => onAction('view-user-ads', user.id));
  }
  
  const deleteUserBtn = row.querySelector('.delete-user-btn');
  if (deleteUserBtn) {
    deleteUserBtn.addEventListener('click', () => onAction('delete-user', user.id));
  }
  
  return row;
}

async function loadPendingAds(searchTerm = '', offset = 0, limit = PAGE_SIZE + 1) {
  const ads = await getPendingAds({ limit: 10000 });
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredAds = ads.filter(ad => {
    if (!normalizedSearch) {
      return true;
    }

    const title = ad.title || '';
    const userName = ad.users?.full_name || '';
    const priceText = ad.price ? `${ad.price} eur` : 'negotiable';
    const searchSource = `${title} ${userName} ${priceText}`.toLowerCase();

    return searchSource.includes(normalizedSearch);
  });

  return filteredAds.map(ad => ({
    uuid: ad.uuid,
    title: ad.title,
    price: ad.price,
    status: ad.status,
    created_at: ad.created_at,
    user_name: ad.users?.full_name || 'Unknown',
    image_url: ad.advertisement_images?.[0]?.file_path || null
  })).slice(offset, offset + limit);
}

async function loadAllAds(statusFilter = '', searchTerm = '', offset = 0, limit = PAGE_SIZE + 1) {
  // IMPORTANT: Always fetch ALL ads without status filter to enable global sorting by status priority
  // Only use statusFilter for display filtering after sorting
  const allAds = await getAllAds({ limit: 10000 }); // Fetch large batch for proper sorting
  
  const formattedAds = allAds.map(ad => ({
    uuid: ad.uuid,
    title: ad.title,
    price: ad.price,
    status: ad.status,
    created_at: ad.created_at,
    user_name: ad.users?.full_name || 'Unknown',
    image_url: ad.advertisement_images?.[0]?.file_path || null
  }));

  // Sort: first by status priority, then by creation date (most recent first)
  const statusOrder = { 'Pending': 0, 'Published': 1, 'Rejected': 2, 'Draft': 3, 'Archived': 4 };
  formattedAds.sort((a, b) => {
    const orderA = statusOrder[a.status] ?? 999;
    const orderB = statusOrder[b.status] ?? 999;
    
    // First sort by status
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Then sort by creation date (most recent first)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Apply status filter for display (if any)
  let filteredAds = formattedAds;
  if (statusFilter) {
    filteredAds = formattedAds.filter(ad => ad.status === statusFilter);
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (normalizedSearch) {
    filteredAds = filteredAds.filter(ad => {
      const priceText = ad.price ? `${ad.price} eur` : 'negotiable';
      const searchSource = `${ad.title} ${ad.user_name} ${priceText}`.toLowerCase();
      return searchSource.includes(normalizedSearch);
    });
  }

  // Apply pagination to the sorted and filtered results
  const paginatedAds = filteredAds.slice(offset, offset + limit);

  return paginatedAds;
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

export async function renderDashboardPage({ navigate }) {
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
  const allAdsSectionTitle = section.querySelector('#allAdsSectionTitle');
  
  const usersList = section.querySelector('#usersList');
  const loadingUsers = section.querySelector('#loadingUsers');
  
  const statusFilterAll = section.querySelector('#statusFilterAll');
  const searchPending = section.querySelector('#searchPending');
  const searchAllAds = section.querySelector('#searchAllAds');
  const searchUsers = section.querySelector('#searchUsers');
  let currentAdminId = null;

  let pendingOffset = 0;
  let pendingHasMore = false;
  let isLoadingPendingMore = false;

  let allAdsOffset = 0;
  let allAdsHasMore = false;
  let activeAllAdsStatusFilter = '';
  let activePendingSearchTerm = '';
  let activeAllAdsSearchTerm = '';
  let isLoadingAllAdsMore = false;

  function updateAllAdsSectionTitle() {
    const statusLabel = activeAllAdsStatusFilter || 'All';
    allAdsSectionTitle.textContent = `${statusLabel} Advertisements`;
  }

  function setSearchInputEnabled(input, isEnabled) {
    if (!input) {
      return;
    }

    input.disabled = !isEnabled;
    input.placeholder = isEnabled ? 'Search...' : 'No data to search';

    if (!isEnabled) {
      input.value = '';
    }
  }

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
            refreshAdminNotificationBadge();
            loadPendingAdsData(true);
            loadAllAdsData(true);
          }
          break;
        case 'reject':
          const reason = await promptText(
            'Please provide a reason for rejecting this advertisement.',
            'Reject Advertisement',
            { placeholder: 'Enter rejection reason...', maxLength: 500 }
          );
          if (reason) {
            await rejectAdvertisement(adId, reason);
            await alert('Advertisement rejected', 'Success', 'success');
            refreshAdminNotificationBadge();
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
      switch (action) {
        case 'toggle-role':
          if (userId === currentAdminId) {
            await alert('You cannot change your own role.', 'Action not allowed', 'warning');
            return;
          }

          const roleConfirmed = await confirm('Change this user role?', 'Change User Role');
          if (roleConfirmed) {
            // Find user to get current role
            const users = await loadUsers();
            const user = users.find(u => u.id === userId);
            if (!user) {
              await alert('User not found', 'Error', 'error');
              return;
            }
            const newRole = user.role === 'admin' ? 'user' : 'admin';
            await updateUserRole(userId, newRole);
            await alert('Role updated', 'Success', 'success');
            loadUsersData();
          }
          break;
        case 'view-user-ads':
          navigate(`/user/${userId}/ads`);
          break;
        case 'delete-user':
          if (userId === currentAdminId) {
            await alert('You cannot delete your own account from the admin panel.', 'Action not allowed', 'warning');
            return;
          }

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
      await alert(error.message || 'Error executing action', 'Error', 'error');
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
        loadPendingAds(activePendingSearchTerm, pendingOffset, PAGE_SIZE + 1),
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
          const row = createAdminAdRow(ad, handleAdAction, navigate);
          pendingAdsList.appendChild(row);
        });
      }
      
      pendingCount.textContent = pendingTotal;
      pendingBadge.textContent = pendingTotal;
      setSearchInputEnabled(searchPending, pendingTotal > 0);

      if (pendingTotal === 0) {
        activePendingSearchTerm = '';
      }

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
      const adsChunk = await loadAllAds(activeAllAdsStatusFilter, activeAllAdsSearchTerm, allAdsOffset, PAGE_SIZE + 1);
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
          const row = createAdminAdRow(ad, handleAdAction, navigate);
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
      setSearchInputEnabled(searchAllAds, stats.total_ads > 0);

      if (stats.total_ads === 0) {
        activeAllAdsSearchTerm = '';
      }
      
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
        const row = createUserRow(user, handleUserAction, currentAdminId);
        usersList.appendChild(row);
      });
      
      usersCount.textContent = users.length;
      setSearchInputEnabled(searchUsers, users.length > 0);
      
    } catch (error) {
      console.error('Error loading users:', error);
      loadingUsers.classList.add('d-none');
    }
  }

  // Status filter change
  statusFilterAll.addEventListener('change', (e) => {
    activeAllAdsStatusFilter = e.target.value;
    updateAllAdsSectionTitle();
    loadAllAdsData(true);
  });

  searchPending.addEventListener('input', (e) => {
    activePendingSearchTerm = e.target.value;
    loadPendingAdsData(true);
  });

  searchAllAds.addEventListener('input', (e) => {
    activeAllAdsSearchTerm = e.target.value;
    loadAllAdsData(true);
  });

  updateAllAdsSectionTitle();

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
      pendingLoadMoreBtn.textContent = 'Load more...';
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
      allAdsLoadMoreBtn.textContent = 'Load more...';
    }
  });

  try {
    const { user } = await getCurrentUser();
    currentAdminId = user?.id || null;
  } catch (error) {
    console.error('Error loading current admin:', error);
    currentAdminId = null;
  }

  await Promise.all([
    loadPendingAdsData(true),
    loadAllAdsData(true),
    loadUsersData()
  ]);

  return section;
}
