import './advertisementPage.css';
import template from './advertisementPage.html?raw';
import { getAdvertisementById, deleteAdvertisement, archiveAdvertisement, submitForReview, approveAdvertisement, rejectAdvertisement, getRejectionReason } from '../../services/adsService.js';
import { getSession, isUserAdmin } from '../../services/authService.js';
import { confirm, alert, promptText } from '../../services/modalService.js';

const statusTranslations = {
  'Draft': 'Draft',
  'Pending': 'Pending Approval',
  'Published': 'Published',
  'Archived': 'Archived',
  'Rejected': 'Rejected'
};

async function loadAdvertisement(adUuid) {
  const ad = await getAdvertisementById(adUuid);
  
  // Map the Supabase data format to the expected UI format
  return {
    uuid: ad.uuid,
    title: ad.title,
    description: ad.description,
    price: ad.price,
    item_condition: ad.item_condition,
    category: ad.categories?.name || 'Unknown category',
    location: ad.location,
    status: ad.status,
    created_at: ad.created_at,
    images: ad.advertisement_images?.map(img => img.file_path) || [],
    seller: {
      id: ad.owner_id,
      full_name: ad.users?.full_name || 'Unknown',
      phone: ad.owner_phone || ad.users?.phone || '',
      email: ad.users?.email || ''
    }
  };
}

export async function renderAdvertisementPage({ navigate, params }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const section = wrapper.firstElementChild;

  const adUuid = params.id;

  // Get elements
  const loadingState = section.querySelector('#loadingState');
  const adContent = section.querySelector('#adContent');
  const errorState = section.querySelector('#errorState');
  
  const adTitle = section.querySelector('#adTitle');
  const adDescription = section.querySelector('#adDescription');
  const adPrice = section.querySelector('#adPrice');
  const adCategory = section.querySelector('#adCategory');
  const adCondition = section.querySelector('#adCondition');
  const adLocation = section.querySelector('#adLocation');
  const adDate = section.querySelector('#adDate');
  const adStatus = section.querySelector('#adStatus');
  const adBreadcrumb = section.querySelector('#adBreadcrumb');
  const carouselImages = section.querySelector('#carouselImages');
  const sellerName = section.querySelector('#sellerName');
  const sellerPhone = section.querySelector('#sellerPhone');
  const sellerEmail = section.querySelector('#sellerEmail');
  const sellerPhoneRow = section.querySelector('#sellerPhoneRow');
  const sellerEmailRow = section.querySelector('#sellerEmailRow');
  const sellerContactActions = section.querySelector('#sellerContactActions');
  const callSellerBtn = section.querySelector('#callSellerBtn');
  const emailSellerBtn = section.querySelector('#emailSellerBtn');
  const moreSellerAdsSection = section.querySelector('#moreSellerAdsSection');
  const moreSellerAdsBtn = section.querySelector('#moreSellerAdsBtn');

  const ownerActions = section.querySelector('#ownerActions');
  const adminActions = section.querySelector('#adminActions');

  async function displayAdvertisement() {
    try {
      const ad = await loadAdvertisement(adUuid);

      adTitle.textContent = ad.title;
      adBreadcrumb.textContent = ad.title;
      adDescription.textContent = ad.description;
      adPrice.textContent = ad.price ? `${ad.price} EUR` : 'Negotiable';
      adCategory.textContent = ad.category;
      adCondition.textContent = ad.item_condition === 'new' ? 'Condition: New' : 'Condition: Used';
      adLocation.textContent = ad.location;
      adDate.textContent = new Date(ad.created_at).toLocaleDateString('en-US');

      // Seller info
      sellerName.textContent = ad.seller.full_name;
      const hasPhone = Boolean(ad.seller.phone && ad.seller.phone.trim());
      const hasEmail = Boolean(ad.seller.email && ad.seller.email.trim());

      sellerPhone.textContent = hasPhone ? ad.seller.phone : 'Not provided';
      sellerEmail.textContent = hasEmail ? ad.seller.email : 'Not provided';

      sellerPhoneRow.classList.toggle('d-none', !hasPhone);
      sellerEmailRow.classList.toggle('d-none', !hasEmail);

      const normalizedPhone = hasPhone
        ? ad.seller.phone.replace(/[^\+\d]/g, '')
        : '';

      // Contact buttons will be shown/hidden based on isOwner check below
      
      // Images (if multiple)
      if (ad.images && ad.images.length > 0) {
        carouselImages.innerHTML = ad.images.map((img, index) => `
          <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <img src="${img}" class="d-block w-100 ad-main-image" alt="Image ${index + 1}">
          </div>
        `).join('');
      }

      // Check ownership and role
      const { session } = await getSession();
      const currentUserId = session?.user?.id || null;
      const isAdmin = session && currentUserId ? (await isUserAdmin(currentUserId)).isAdmin : false;
      const isOwner = currentUserId === ad.seller.id;
      
      // Fetch rejection reason for owner/admin to derive effective status on details page
      let isRejectedAd = false;
      if (isOwner || isAdmin) {
        try {
          isRejectedAd = Boolean(await getRejectionReason(ad.uuid));
        } catch (err) {
          console.warn('Could not fetch rejection reason:', err);
        }
      }

      const effectiveStatus = isRejectedAd ? 'Rejected' : ad.status;
      const statusClass = `status-${String(effectiveStatus || '').toLowerCase()}`;
      const statusLabel = statusTranslations[effectiveStatus] || effectiveStatus || 'Unknown';
      adStatus.innerHTML = `
        <span class="status-badge ${statusClass}">
          Status: ${statusLabel}
        </span>
      `;

      const canShowSellerContactActions = !isOwner && !isAdmin;

      // Show contact buttons only for non-owner regular users
      if (canShowSellerContactActions) {
        const normalizedPhone = hasPhone
          ? ad.seller.phone.replace(/[^\+\d]/g, '')
          : '';

        if (hasPhone && normalizedPhone) {
          callSellerBtn.href = `tel:${normalizedPhone}`;
          callSellerBtn.classList.remove('d-none');
        } else {
          callSellerBtn.classList.add('d-none');
        }

        if (hasEmail) {
          emailSellerBtn.href = `mailto:${ad.seller.email}`;
          emailSellerBtn.classList.remove('d-none');
        } else {
          emailSellerBtn.classList.add('d-none');
        }

        sellerContactActions.classList.toggle('d-none', !(hasPhone || hasEmail));
      } else {
        // Hide contact buttons for owners and admins
        sellerContactActions.classList.add('d-none');
        callSellerBtn.classList.add('d-none');
        emailSellerBtn.classList.add('d-none');
      }

      // Show "More from this seller" button for non-owners
      if (!isOwner) {
        moreSellerAdsSection.classList.remove('d-none');
        moreSellerAdsBtn.addEventListener('click', () => {
          navigate(`/user/${ad.seller.id}/ads`);
        });
      } else {
        moreSellerAdsSection.classList.add('d-none');
      }

      if (isOwner && ad.status !== 'Archived' && !isRejectedAd) {
        ownerActions.classList.remove('d-none');
        
        // Show appropriate action buttons based on status
        if (ad.status === 'Draft') {
          section.querySelector('#publishBtn').classList.remove('d-none');
        }
        if (ad.status === 'Published' || ad.status === 'Pending') {
          section.querySelector('#archiveBtn').classList.remove('d-none');
        }

        // Setup action handlers
        section.querySelector('#editBtn')?.addEventListener('click', () => {
          navigate(`/edit-advertisement/${ad.uuid}`);
        });

        section.querySelector('#deleteBtn')?.addEventListener('click', async () => {
          const confirmed = await confirm('Are you sure you want to delete this advertisement? This action cannot be undone.', 'Delete Advertisement');
          if (confirmed) {
            try {
              await deleteAdvertisement(ad.uuid);
              await alert('Advertisement deleted successfully', 'Success', 'success');
              navigate('/profile');
            } catch (error) {
              console.error('Error deleting ad:', error);
              await alert('Error deleting advertisement: ' + error.message, 'Error', 'error');
            }
          }
        });

        section.querySelector('#publishBtn')?.addEventListener('click', async () => {
          try {
            await submitForReview(ad.uuid);
            await alert('Advertisement submitted for review', 'Success', 'success');
            displayAdvertisement(); // Reload to show updated status
          } catch (error) {
            console.error('Error submitting ad:', error);
            await alert('Error submitting advertisement: ' + error.message, 'Error', 'error');
          }
        });

        section.querySelector('#archiveBtn')?.addEventListener('click', async () => {
          const confirmed = await confirm('Are you sure you want to archive this advertisement? Archived ads won\'t be visible to other users.', 'Archive Advertisement');
          if (confirmed) {
            try {
              await archiveAdvertisement(ad.uuid);
              await alert('Advertisement archived successfully', 'Success', 'success');
              displayAdvertisement(); // Reload to show updated status
            } catch (error) {
              console.error('Error archiving ad:', error);
              await alert('Error archiving advertisement: ' + error.message, 'Error', 'error');
            }
          }
        });
      }

      const canShowAdminActions = isAdmin;

      if (canShowAdminActions) {
        adminActions.classList.remove('d-none');

        const approveBtn = section.querySelector('#approveBtn');
        const rejectBtn = section.querySelector('#rejectBtn');
        const adminArchiveBtn = section.querySelector('#adminArchiveBtn');
        const adminDeleteBtn = section.querySelector('#adminDeleteBtn');

        const canReview = ad.status === 'Pending' && !isRejectedAd;
        approveBtn?.classList.toggle('d-none', !canReview);
        rejectBtn?.classList.toggle('d-none', !canReview);
        adminArchiveBtn?.classList.toggle('d-none', ad.status === 'Archived');
        adminDeleteBtn?.classList.remove('d-none');

        section.querySelector('#approveBtn')?.addEventListener('click', async () => {
          try {
            await approveAdvertisement(ad.uuid);
            await alert('Advertisement approved', 'Success', 'success');
            displayAdvertisement(); // Reload to show updated status
          } catch (error) {
            console.error('Error approving ad:', error);
            await alert('Error approving advertisement: ' + error.message, 'Error', 'error');
          }
        });

        section.querySelector('#rejectBtn')?.addEventListener('click', async () => {
          const reason = await promptText(
            'Please provide a reason for rejecting this advertisement.',
            'Reject Advertisement',
            { placeholder: 'Enter rejection reason...', maxLength: 500 }
          );
          if (reason) {
            try {
              await rejectAdvertisement(ad.uuid, reason);
              await alert('Advertisement rejected', 'Success', 'success');
              displayAdvertisement(); // Reload to show updated status
            } catch (error) {
              console.error('Error rejecting ad:', error);
              await alert('Error rejecting advertisement: ' + error.message, 'Error', 'error');
            }
          }
        });

        section.querySelector('#adminArchiveBtn')?.addEventListener('click', async () => {
          const confirmed = await confirm('Are you sure you want to archive this advertisement?', 'Archive Advertisement');
          if (confirmed) {
            try {
              await archiveAdvertisement(ad.uuid);
              await alert('Advertisement archived', 'Success', 'success');
              displayAdvertisement(); // Reload to show updated status
            } catch (error) {
              console.error('Error archiving ad:', error);
              await alert('Error archiving advertisement: ' + error.message, 'Error', 'error');
            }
          }
        });

        section.querySelector('#adminDeleteBtn')?.addEventListener('click', async () => {
          const confirmed = await confirm('WARNING: Deletion is irreversible. Are you sure?', 'Delete Advertisement');
          if (confirmed) {
            try {
              await deleteAdvertisement(ad.uuid);
              await alert('Advertisement deleted', 'Success', 'success');
              navigate('/dashboard');
            } catch (error) {
              console.error('Error deleting ad:', error);
              await alert('Error deleting advertisement: ' + error.message, 'Error', 'error');
            }
          }
        });
      } else {
        adminActions.classList.add('d-none');
      }

      loadingState.classList.add('d-none');
      adContent.classList.remove('d-none');

    } catch (error) {
      console.error('Error loading advertisement:', error);
      loadingState.classList.add('d-none');
      errorState.classList.remove('d-none');
    }
  }

  await displayAdvertisement();

  return section;
}
