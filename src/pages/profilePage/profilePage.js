import './profilePage.css';
import template from './profilePage.html?raw';
import { getCurrentUser, getUserProfile, updateUserProfile, updatePassword, deleteAccount, isUserAdmin } from '../../services/authService.js';
import { getUserAds, deleteAdvertisement, archiveAdvertisement, getUserAdStats, getRejectionReason } from '../../services/adsService.js';
import { confirm, alert } from '../../services/modalService.js';
import { escapeHtml } from '../../services/sanitizeService.js';
import {
  validateRequired,
  validatePhoneField,
  validatePassword,
  validatePasswordConfirm,
  clearFormErrors,
  addRealTimeValidation
} from '../../services/validationService.js';

const statusTranslations = {
  'Draft': 'Draft',
  'Pending': 'Pending Approval',
  'Published': 'Published',
  'Archived': 'Archived',
  'Rejected': 'Rejected'
};

const PAGE_SIZE = 8;

// Helper functions to save/restore tab state
function saveTabState(tab, filter) {
  sessionStorage.setItem('profileActiveTab', tab);
  sessionStorage.setItem('profileStatusFilter', filter);
}

function getTabState() {
  return {
    tab: sessionStorage.getItem('profileActiveTab') || 'my-ads',
    filter: sessionStorage.getItem('profileStatusFilter') || ''
  };
}

function clearTabState() {
  sessionStorage.removeItem('profileActiveTab');
  sessionStorage.removeItem('profileStatusFilter');
}

function createUserAdCard(ad, navigate) {
  const card = document.createElement('div');
  card.className = 'card user-ad-card shadow-sm w-100';

  const safeUuid = escapeHtml(ad.uuid);
  const safeTitle = escapeHtml(ad.title);
  const safeImageUrl = ad.image_url ? escapeHtml(ad.image_url) : null;
  
  const imageHtml = safeImageUrl 
    ? `<img src="${safeImageUrl}" class="user-ad-image" alt="${safeTitle}">`
    : `<div class="user-ad-image user-ad-image-placeholder">
         <i class="bi bi-image"></i>
       </div>`;
  
  card.innerHTML = `
    <div class="card-body">
      <div class="row align-items-center">
        <div class="col-auto">
          ${imageHtml}
        </div>
        <div class="col">
          <h5 class="user-ad-title">${safeTitle}</h5>
          <p class="user-ad-price mb-2">${ad.price ? ad.price + ' EUR' : 'Negotiable'}</p>
          <div class="d-flex align-items-center gap-2 user-ad-status-wrap">
            <span class="status-badge status-${String(ad.status || '').toLowerCase()}">${statusTranslations[ad.status]}</span>
            ${ad.status === 'Rejected' ? `<span class="rejection-indicator" title="Click to see reason"><i class="bi bi-exclamation-circle-fill"></i> Rejection Reason</span>` : ''}
          </div>
        </div>
        <div class="col-auto">
          <div class="user-ad-actions">
            <button class="btn btn-sm btn-outline-primary view-btn profile-ad-action-btn has-text" data-uuid="${safeUuid}" title="View" aria-label="View">
              <i class="bi bi-eye"></i><span class="action-label"> View</span>
            </button>
            ${ad.status !== 'Archived' && ad.status !== 'Rejected' ? `
              <button class="btn btn-sm btn-outline-primary edit-btn profile-ad-action-btn has-text" data-uuid="${safeUuid}" title="Edit" aria-label="Edit">
                <i class="bi bi-pencil"></i><span class="action-label"> Edit</span>
              </button>
            ` : ''}
            ${ad.status === 'Published' || ad.status === 'Pending' ? `
              <button class="btn btn-sm btn-outline-warning archive-btn profile-ad-action-btn has-text" data-uuid="${safeUuid}" title="Archive" aria-label="Archive">
                <i class="bi bi-archive"></i><span class="action-label"> Archive</span>
              </button>
            ` : ''}
            ${ad.status !== 'Published' && ad.status !== 'Archived' && ad.status !== 'Rejected' ? `
              <button class="btn btn-sm btn-outline-danger delete-btn profile-ad-action-btn has-text" data-uuid="${safeUuid}" title="Delete" aria-label="Delete">
                <i class="bi bi-trash"></i><span class="action-label"> Delete</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Handle rejection reason display
  if (ad.status === 'Rejected') {
    const rejectionIndicator = card.querySelector('.rejection-indicator');
    rejectionIndicator.addEventListener('click', async () => {
      try {
        const rejection = await getRejectionReason(ad.uuid);
        if (rejection) {
          await alert(
            `Rejection Reason:\n\n${rejection.rejection_reason}`,
            'Advertisement Rejected',
            'error'
          );
        }
      } catch (error) {
        console.error('Error fetching rejection reason:', error);
      }
    });
  }
  
  // Add event listeners
  card.querySelector('.view-btn').addEventListener('click', () => {
    navigate(`/advertisement/${ad.uuid}`);
  });
  
  const editBtn = card.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // Save current tab and filter state before navigating to edit
      const activeTab = document.querySelector('#profileTabs .nav-link.active')?.getAttribute('data-bs-target')?.substring(1) || 'my-ads';
      const activeFilter = document.querySelector('input[name="statusFilter"]:checked')?.value || '';
      saveTabState(activeTab, activeFilter);
      
      navigate(`/edit-advertisement/${ad.uuid}`);
    });
  }
  
  const archiveBtn = card.querySelector('.archive-btn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', async () => {
      const confirmed = await confirm('Are you sure you want to archive this advertisement? Archived ads won\'t be visible to other users.', 'Archive Advertisement');
      if (confirmed) {
        try {
          // Get current active tab and filter to restore after reload
          const activeTab = document.querySelector('#profileTabs .nav-link.active')?.getAttribute('data-bs-target')?.substring(1) || 'my-ads';
          const activeFilter = document.querySelector('input[name="statusFilter"]:checked')?.value || '';
          saveTabState(activeTab, activeFilter);
          
          await archiveAdvertisement(ad.uuid);
          card.remove();
          await alert('Advertisement archived successfully', 'Success', 'success');
          // Refresh the ad list to update counts
          window.location.reload();
        } catch (error) {
          console.error('Error archiving ad:', error);
          await alert('Error archiving advertisement: ' + error.message, 'Error', 'error');
        }
      }
    });
  }
  
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await confirm('Are you sure you want to delete this advertisement? This action cannot be undone.', 'Delete Advertisement');
      if (confirmed) {
        try {
          // Get current active tab and filter to restore after reload
          const activeTab = document.querySelector('#profileTabs .nav-link.active')?.getAttribute('data-bs-target')?.substring(1) || 'my-ads';
          const activeFilter = document.querySelector('input[name="statusFilter"]:checked')?.value || '';
          saveTabState(activeTab, activeFilter);
          
          await deleteAdvertisement(ad.uuid);
          card.remove();
          await alert('Advertisement deleted successfully', 'Success', 'success');
          // Refresh the ad list to update counts
          window.location.reload();
        } catch (error) {
          console.error('Error deleting ad:', error);
          await alert('Error deleting advertisement: ' + error.message, 'Error', 'error');
        }
      }
    });
  }
  
  return card;
}

async function loadUserProfile() {
  // First get the current authenticated user
  const { user, error: authError } = await getCurrentUser();
  
  if (authError || !user) {
    throw new Error('You are not logged in');
  }
  
  // Then fetch their profile using the user ID
  const { profile, error: profileError } = await getUserProfile(user.id);
  
  if (profileError || !profile) {
    throw new Error('Error loading profile');
  }
  
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: user.email,
    phone: profile.phone
  };
}

async function loadUserAds(statusFilter = '', offset = 0, limit = PAGE_SIZE + 1) {
  const filters = statusFilter ? { status: statusFilter, offset, limit } : { offset, limit };
  const ads = await getUserAds(filters);
  
  return ads.map(ad => ({
    uuid: ad.uuid,
    title: ad.title,
    price: ad.price,
    status: ad.status,
    image_url: ad.advertisement_images?.[0]?.file_path || null
  }));
}

export async function renderProfilePage({ navigate }) {
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
  const archivedAds = section.querySelector('#archivedAds');
  const rejectedAds = section.querySelector('#rejectedAds');
  const userAdsList = section.querySelector('#userAdsList');
  const loadingAds = section.querySelector('#loadingAds');
  const emptyAds = section.querySelector('#emptyAds');
  const profileAdsPaginationWrap = section.querySelector('#profileAdsPaginationWrap');
  const profileAdsLoadMoreBtn = section.querySelector('#profileAdsLoadMoreBtn');
  const createNewAdBtn = section.querySelector('#createNewAdBtn');
  const statusFilters = section.querySelectorAll('input[name="statusFilter"]');
  const profileStatsRow = section.querySelector('#profileStatsRow');
  const profileTabs = section.querySelector('#profileTabs');
  const myAdsTabBtn = section.querySelector('#my-ads-tab');
  const settingsTabBtn = section.querySelector('#settings-tab');
  const myAdsTabItem = myAdsTabBtn?.closest('.nav-item');
  const myAdsPane = section.querySelector('#my-ads');
  const settingsPane = section.querySelector('#settings');
  const editProfileBtn = section.querySelector('#editProfileBtn');
  const dangerZoneCard = section.querySelector('#dangerZoneCard');
  
  const updateProfileForm = section.querySelector('#updateProfileForm');
  const updateProfileSubmitBtn = section.querySelector('#updateProfileSubmitBtn');
  const cancelProfileChangesBtn = section.querySelector('#cancelProfileChangesBtn');
  const changePasswordForm = section.querySelector('#changePasswordForm');
  const changePasswordSubmitBtn = section.querySelector('#changePasswordSubmitBtn');
  const deleteAccountBtn = section.querySelector('#deleteAccountBtn');

  let activeStatusFilter = '';
  let adsOffset = 0;
  let hasMoreAds = false;
  let isLoadingMoreAds = false;
  let originalProfileValues = null;

  // Create new ad button
  createNewAdBtn.addEventListener('click', () => {
    navigate('/create-advertisement');
  });

  editProfileBtn?.addEventListener('click', () => {
    if (!settingsTabBtn) {
      return;
    }

    const settingsTab = new window.bootstrap.Tab(settingsTabBtn);
    settingsTab.show();

    if (settingsPane) {
      const header = document.querySelector('.app-header');
      const headerHeight = header ? header.offsetHeight : 0;
      const top = settingsPane.getBoundingClientRect().top + window.scrollY;

      window.scrollTo({
        top: Math.max(0, top - headerHeight - 12),
        behavior: 'smooth'
      });
    }
  });

  async function applyAdminProfileLayout() {
    try {
      const { user } = await getCurrentUser();
      if (!user) {
        return false;
      }

      const { isAdmin } = await isUserAdmin(user.id);
      if (!isAdmin) {
        return false;
      }

      profileStatsRow?.classList.add('d-none');
      myAdsTabItem?.classList.add('d-none');
      myAdsPane?.classList.add('d-none');
      myAdsPane?.classList.remove('show', 'active');
      createNewAdBtn?.classList.add('d-none');
      profileTabs?.classList.add('d-none');
      editProfileBtn?.classList.add('d-none');
      deleteAccountBtn?.classList.add('d-none');
      dangerZoneCard?.classList.add('d-none');

      settingsPane?.classList.add('show', 'active');
      settingsPane?.classList.remove('d-none');

      if (settingsTabBtn) {
        const bsTab = new window.bootstrap.Tab(settingsTabBtn);
        bsTab.show();
      }

      return true;
    } catch (error) {
      console.error('Error applying admin profile layout:', error);
      return false;
    }
  }

  // Display user ads function
  async function displayUserAds(statusFilter = '', reset = true) {
    if (reset) {
      adsOffset = 0;
      hasMoreAds = false;
      loadingAds.classList.remove('d-none');
      emptyAds.classList.add('d-none');
      profileAdsPaginationWrap.classList.add('d-none');

      const existingCards = userAdsList.querySelectorAll('.card.user-ad-card');
      existingCards.forEach(card => card.remove());
    }
    
    try {
      const adsChunk = await loadUserAds(statusFilter, adsOffset, PAGE_SIZE + 1);
      const ads = adsChunk.slice(0, PAGE_SIZE);
      hasMoreAds = adsChunk.length > PAGE_SIZE;
      adsOffset += ads.length;

      if (reset) {
        loadingAds.classList.add('d-none');
      }

      if (reset && ads.length === 0) {
        emptyAds.classList.remove('d-none');
        profileAdsPaginationWrap.classList.add('d-none');
        return;
      }

      emptyAds.classList.add('d-none');
      
      ads.forEach(ad => {
        const adCard = createUserAdCard(ad, navigate);
        userAdsList.appendChild(adCard);
      });

      if (hasMoreAds) {
        profileAdsPaginationWrap.classList.remove('d-none');
      } else {
        profileAdsPaginationWrap.classList.add('d-none');
      }
      
    } catch (error) {
      console.error('Error loading ads:', error);
      loadingAds.classList.add('d-none');
      emptyAds.classList.remove('d-none');
      profileAdsPaginationWrap.classList.add('d-none');
    }
  }

  async function refreshProfileAdCounters() {
    try {
      const stats = await getUserAdStats();
      totalAds.textContent = stats.total;
      publishedAds.textContent = stats.published;
      pendingAds.textContent = stats.pending;
      draftAds.textContent = stats.drafts;
      archivedAds.textContent = stats.archived;
      rejectedAds.textContent = stats.rejected;
    } catch (error) {
      console.error('Error refreshing profile ad counters:', error);
    }
  }

  // Filter change handlers
  statusFilters.forEach(filter => {
    filter.addEventListener('change', (e) => {
      activeStatusFilter = e.target.value;
      displayUserAds(activeStatusFilter, true);
    });
  });

  profileAdsLoadMoreBtn.addEventListener('click', async () => {
    if (isLoadingMoreAds || !hasMoreAds) {
      return;
    }

    isLoadingMoreAds = true;
    profileAdsLoadMoreBtn.disabled = true;
    profileAdsLoadMoreBtn.textContent = 'Loading...';

    try {
      await displayUserAds(activeStatusFilter, false);
    } finally {
      isLoadingMoreAds = false;
      profileAdsLoadMoreBtn.disabled = false;
      profileAdsLoadMoreBtn.textContent = 'Load more...';
    }
  });

  // Get form inputs for validation
  const updateFullNameInput = updateProfileForm.querySelector('#updateFullName');
  const updatePhoneInput = updateProfileForm.querySelector('#updatePhone');
  const currentPasswordInput = changePasswordForm.querySelector('#currentPassword');
  const newPasswordInput = changePasswordForm.querySelector('#newPassword');
  const confirmNewPasswordInput = changePasswordForm.querySelector('#confirmNewPassword');

  function getNormalizedProfileValues() {
    return {
      fullName: updateFullNameInput.value.trim(),
      phone: updatePhoneInput.value.trim()
    };
  }

  function updateProfileSaveButtonState() {
    if (!originalProfileValues) {
      updateProfileSubmitBtn.disabled = true;
      cancelProfileChangesBtn.disabled = true;
      return;
    }

    const currentValues = getNormalizedProfileValues();
    const hasChanges =
      currentValues.fullName !== originalProfileValues.fullName ||
      currentValues.phone !== originalProfileValues.phone;

    updateProfileSubmitBtn.disabled = !hasChanges;
    cancelProfileChangesBtn.disabled = !hasChanges;
  }

  function updatePasswordSaveButtonState() {
    const hasChanges =
      currentPasswordInput.value.trim() !== '' ||
      newPasswordInput.value.trim() !== '' ||
      confirmNewPasswordInput.value.trim() !== '';

    changePasswordSubmitBtn.disabled = !hasChanges;
  }

  async function syncProfileFormFromServer() {
    const user = await loadUserProfile();
    userName.textContent = user.full_name;
    userEmail.textContent = user.email;
    userPhone.textContent = user.phone || '';

    updateFullNameInput.value = user.full_name || '';
    updatePhoneInput.value = user.phone || '';
    section.querySelector('#updateEmail').value = user.email;

    originalProfileValues = {
      fullName: (user.full_name || '').trim(),
      phone: (user.phone || '').trim()
    };

    updateProfileSaveButtonState();
  }

  updateProfileSubmitBtn.disabled = true;
  cancelProfileChangesBtn.disabled = true;
  try {
    await syncProfileFormFromServer();
  } catch (error) {
    console.error('Error loading profile:', error);
  }

  // Add real-time validation for profile form
  addRealTimeValidation(updateFullNameInput, (input) => validateRequired(input, 'Full name'));
  addRealTimeValidation(updatePhoneInput, validatePhoneField);
  updateFullNameInput.addEventListener('input', updateProfileSaveButtonState);
  updatePhoneInput.addEventListener('input', updateProfileSaveButtonState);
  cancelProfileChangesBtn.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });

  cancelProfileChangesBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await syncProfileFormFromServer();
      clearFormErrors(updateProfileForm);
    } catch (error) {
      console.error('Error reloading profile data:', error);
      await alert('Error reloading profile data: ' + error.message, 'Error', 'error');
    }
  });

  // Add real-time validation for password form
  addRealTimeValidation(currentPasswordInput, (input) => validateRequired(input, 'Current password'));
  addRealTimeValidation(newPasswordInput, validatePassword);
  addRealTimeValidation(confirmNewPasswordInput, (input) => validatePasswordConfirm(input, newPasswordInput.value));
  currentPasswordInput.addEventListener('input', updatePasswordSaveButtonState);
  newPasswordInput.addEventListener('input', updatePasswordSaveButtonState);
  confirmNewPasswordInput.addEventListener('input', updatePasswordSaveButtonState);
  changePasswordSubmitBtn.disabled = true;

  // Update profile form
  updateProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (updateProfileSubmitBtn.disabled) {
      return;
    }

    clearFormErrors(updateProfileForm);

    // Validate fields
    const isFullNameValid = validateRequired(updateFullNameInput, 'Full name');
    const isPhoneValid = validatePhoneField(updatePhoneInput);

    if (!isFullNameValid || !isPhoneValid) {
      return;
    }

    const formData = new FormData(updateProfileForm);
    
    try {
      const { user: currentUser, error: currentUserError } = await getCurrentUser();

      if (currentUserError || !currentUser) {
        throw new Error('You are not logged in');
      }

      const { error: updateError } = await updateUserProfile(currentUser.id, {
        full_name: formData.get('fullName').trim(),
        phone: formData.get('phone').trim()
      });

      if (updateError) {
        throw updateError;
      }

      originalProfileValues = {
        fullName: formData.get('fullName').trim(),
        phone: formData.get('phone').trim()
      };
      updateProfileSaveButtonState();
      
      await alert('Profile updated successfully!', 'Success', 'success');
      // Reload profile data
      const user = await loadUserProfile();
      userName.textContent = user.full_name;
      userPhone.textContent = user.phone || '';
    } catch (error) {
      console.error('Error updating profile:', error);
      await alert('Error updating profile: ' + error.message, 'Error', 'error');
    }
  });

  // Change password form
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (changePasswordSubmitBtn.disabled) {
      return;
    }

    clearFormErrors(changePasswordForm);

    const formData = new FormData(changePasswordForm);
    const currentPassword = formData.get('currentPassword').trim();
    const newPassword = formData.get('newPassword').trim();
    const confirmNewPassword = formData.get('confirmNewPassword').trim();

    // Validate fields
    const isCurrentPasswordValid = validateRequired(currentPasswordInput, 'Current password');
    const isNewPasswordValid = validatePassword(newPasswordInput);
    const isConfirmPasswordValid = validatePasswordConfirm(confirmNewPasswordInput, newPassword);

    if (!isCurrentPasswordValid || !isNewPasswordValid || !isConfirmPasswordValid) {
      return;
    }
    
    try {
      await updatePassword(newPassword);
      await alert('Password changed successfully!', 'Success', 'success');
      changePasswordForm.reset();
      clearFormErrors(changePasswordForm);
      updatePasswordSaveButtonState();
    } catch (error) {
      console.error('Error changing password:', error);
      await alert('Error changing password: ' + error.message, 'Error', 'error');
    }
  });

  // Delete account
  deleteAccountBtn.addEventListener('click', async () => {
    const confirmed = await confirm(
      'WARNING: This action is irreversible. All your advertisements will also be deleted. Are you sure?',
      'Delete Account',
      { variant: 'warning' }
    );
    
    if (confirmed) {
      const doubleConfirm = await confirm(
        'Please confirm again. Do you really want to delete your profile?',
        'Final Confirmation',
        { variant: 'warning' }
      );
      
      if (doubleConfirm) {
        try {
          await deleteAccount();
          await alert('Profile deleted', 'Success', 'success');
          navigate('/');
        } catch (error) {
          console.error('Error deleting account:', error);
          await alert('Error deleting profile: ' + error.message, 'Error', 'error');
        }
      }
    }
  });

  const isAdminProfile = await applyAdminProfileLayout();

  if (!isAdminProfile) {
    const savedState = getTabState();

    if (savedState.tab && savedState.tab !== 'my-ads') {
      const tabToActivate = section.querySelector(`#${savedState.tab}-tab`);

      if (tabToActivate) {
        const bsTab = new window.bootstrap.Tab(tabToActivate);
        bsTab.show();
      }
    }

    if (savedState.filter !== activeStatusFilter) {
      activeStatusFilter = savedState.filter;
      const filterToActivate = section.querySelector(`input[name="statusFilter"][value="${savedState.filter}"]`);
      if (filterToActivate) {
        filterToActivate.checked = true;
      }
    }

    clearTabState();

    await refreshProfileAdCounters();
    await displayUserAds(activeStatusFilter, true);
  }

  return section;
}
