import './advertisementPage.css';
import template from './advertisementPage.html?raw';
import { getAdvertisementById, deleteAdvertisement, archiveAdvertisement, submitForReview, approveAdvertisement, rejectAdvertisement } from '../../services/adsService.js';
import { getSession, isUserAdmin } from '../../services/authService.js';

const categoryTranslations = {
  'electronics': 'Електроника',
  'vehicles': 'Превозни средства',
  'real-estate': 'Недвижими имоти',
  'jobs': 'Работа',
  'services': 'Услуги',
  'other': 'Други'
};

const statusTranslations = {
  'Draft': 'Чернова',
  'Pending': 'Чакаща одобрение',
  'Published': 'Публикувана',
  'Archived': 'Архивирана'
};

async function loadAdvertisement(adUuid) {
  const ad = await getAdvertisementById(adUuid);
  
  // Map the Supabase data format to the expected UI format
  return {
    uuid: ad.uuid,
    title: ad.title,
    description: ad.description,
    price: ad.price,
    category: ad.categories?.name || 'Неизвестна категория',
    location: ad.location,
    status: ad.status,
    created_at: ad.created_at,
    images: ad.advertisement_images?.map(img => img.file_path) || [],
    seller: {
      id: ad.owner_id,
      full_name: ad.users?.full_name || 'Неизвестен',
      phone: ad.owner_phone || ad.users?.phone || 'Не е посочен'
    }
  };
}

export function renderAdvertisementPage({ navigate, params }) {
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
  const adLocation = section.querySelector('#adLocation');
  const adDate = section.querySelector('#adDate');
  const adViews = section.querySelector('#adViews');
  const adStatus = section.querySelector('#adStatus');
  const adBreadcrumb = section.querySelector('#adBreadcrumb');
  const carouselImages = section.querySelector('#carouselImages');
  const sellerName = section.querySelector('#sellerName');
  const sellerPhone = section.querySelector('#sellerPhone');

  const ownerActions = section.querySelector('#ownerActions');
  const adminActions = section.querySelector('#adminActions');

  async function displayAdvertisement() {
    try {
      const ad = await loadAdvertisement(adUuid);

      adTitle.textContent = ad.title;
      adBreadcrumb.textContent = ad.title;
      adDescription.textContent = ad.description;
      adPrice.textContent = ad.price ? `${ad.price} лв.` : 'По договаряне';
      adCategory.textContent = ad.category;
      adLocation.textContent = ad.location;
      adDate.textContent = new Date(ad.created_at).toLocaleDateString('bg-BG');
      
      // Status badge
      const statusClass = `status-${ad.status}`;
      adStatus.innerHTML = `
        <span class="status-badge ${statusClass}">
          ${statusTranslations[ad.status] || ad.status}
        </span>
      `;

      // Seller info
      sellerName.textContent = ad.seller.full_name;
      sellerPhone.textContent = ad.seller.phone;

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
      const isAdmin = session ? await isUserAdmin() : false;
      const isOwner = currentUserId === ad.seller.id;

      if (isOwner && ad.status !== 'archived') {
        ownerActions.classList.remove('d-none');
        
        // Show appropriate action buttons based on status
        if (ad.status === 'draft') {
          section.querySelector('#publishBtn').classList.remove('d-none');
        }
        if (ad.status === 'published') {
          section.querySelector('#archiveBtn').classList.remove('d-none');
        }

        // Setup action handlers
        section.querySelector('#editBtn')?.addEventListener('click', () => {
          navigate(`/edit-advertisement/${ad.uuid}`);
        });

        section.querySelector('#deleteBtn')?.addEventListener('click', async () => {
          if (confirm('Сигурни ли сте, че искате да изтриете тази обява?')) {
            try {
              await deleteAdvertisement(ad.uuid);
              alert('Обявата е изтрита успешно');
              navigate('/profile');
            } catch (error) {
              console.error('Error deleting ad:', error);
              alert('Грешка при изтриване на обявата: ' + error.message);
            }
          }
        });

        section.querySelector('#publishBtn')?.addEventListener('click', async () => {
          try {
            await submitForReview(ad.uuid);
            alert('Обявата е изпратена за одобрение');
            displayAdvertisement(); // Reload to show updated status
          } catch (error) {
            console.error('Error submitting ad:', error);
            alert('Грешка при изпращане на обявата: ' + error.message);
          }
        });

        section.querySelector('#archiveBtn')?.addEventListener('click', async () => {
          if (confirm('Сигурни ли сте, че искате да архивирате тази обява?')) {
            try {
              await archiveAdvertisement(ad.uuid);
              alert('Обявата е архивирана');
              displayAdvertisement(); // Reload to show updated status
            } catch (error) {
              console.error('Error archiving ad:', error);
              alert('Грешка при архивиране на обявата: ' + error.message);
            }
          }
        });
      }

      if (isAdmin) {
        adminActions.classList.remove('d-none');

        section.querySelector('#approveBtn')?.addEventListener('click', async () => {
          try {
            await approveAdvertisement(ad.uuid);
            alert('Обявата е одобрена');
            displayAdvertisement(); // Reload to show updated status
          } catch (error) {
            console.error('Error approving ad:', error);
            alert('Грешка при одобряване на обявата: ' + error.message);
          }
        });

        section.querySelector('#rejectBtn')?.addEventListener('click', async () => {
          const reason = prompt('Причина за отхвърляне на обявата:');
          if (reason) {
            try {
              await rejectAdvertisement(ad.uuid, reason);
              alert('Обявата е отхвърлена');
              displayAdvertisement(); // Reload to show updated status
            } catch (error) {
              console.error('Error rejecting ad:', error);
              alert('Грешка при отхвърляне на обявата: ' + error.message);
            }
          }
        });

        section.querySelector('#adminArchiveBtn')?.addEventListener('click', async () => {
          if (confirm('Сигурни ли сте, че искате да архивирате тази обява?')) {
            try {
              await archiveAdvertisement(ad.uuid);
              alert('Обявата е архивирана');
              displayAdvertisement(); // Reload to show updated status
            } catch (error) {
              console.error('Error archiving ad:', error);
              alert('Грешка при архивиране на обявата: ' + error.message);
            }
          }
        });
      }

      section.querySelector('#contactBtn')?.addEventListener('click', () => {
        // Show phone number or contact modal
        if (ad.seller.phone && ad.seller.phone !== 'Не е посочен') {
          alert(`Телефон за контакт: ${ad.seller.phone}`);
        } else {
          alert('Контактна информация не е налична');
        }
      });

      loadingState.classList.add('d-none');
      adContent.classList.remove('d-none');

    } catch (error) {
      console.error('Error loading advertisement:', error);
      loadingState.classList.add('d-none');
      errorState.classList.remove('d-none');
    }
  }

  displayAdvertisement();

  return section;
}
