import './index.css';
import template from './index.html?raw';
import { getPublishedAds } from '../../services/adsService.js';
import { getSession } from '../../services/authService.js';

function createAdCard(ad) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

  col.innerHTML = `
    <div class="card ad-card shadow-sm" data-ad-uuid="${ad.uuid}">
      <img src="${ad.image_url || '/placeholder-image.png'}" class="ad-card-img" alt="${ad.title}">
      <div class="card-body">
        <h5 class="ad-card-title">${ad.title}</h5>
        <p class="ad-card-price">${ad.price ? ad.price + ' лв.' : 'По договаряне'}</p>
        <span class="ad-card-category">${ad.category}</span>
        <div class="ad-card-footer">
          <i class="bi bi-geo-alt me-1"></i>${ad.location || 'Неизвестна локация'}
        </div>
      </div>
    </div>
  `;

  col.addEventListener('click', () => {
    window.location.href = `/advertisement/${ad.uuid}`;
  });

  return col;
}

async function loadAdvertisements(searchQuery = '', categoryId = '') {
  try {
    const ads = await getPublishedAds({
      searchQuery,
      category_id: categoryId,
      limit: 50
    });

    // Format data for display
    return ads.map(ad => ({
      uuid: ad.uuid,
      title: ad.title,
      description: ad.description,
      price: ad.price,
      category: ad.categories?.name || 'Неизвестна категория',
      location: ad.location,
      image_url: ad.advertisement_images?.[0]?.file_path || null,
      status: ad.status
    }));
  } catch (error) {
    console.error('Error loading advertisements:', error);
    return [];
  }
}

export function renderIndexPage({ navigate }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const section = wrapper.firstElementChild;

  const searchForm = section.querySelector('#searchForm');
  const adsGrid = section.querySelector('#adsGrid');
  const emptyState = section.querySelector('#emptyState');
  const loadingState = section.querySelector('#loadingState');
  const createAdBtn = section.querySelector('#createAdBtn');

  // Check if user is logged in
  getSession().then(({ session }) => {
    if (session) {
      createAdBtn.classList.remove('d-none');
      createAdBtn.addEventListener('click', () => navigate('/create-advertisement'));
    }
  });

  async function displayAds(searchQuery = '', category = '') {
    try {
      loadingState.classList.remove('d-none');
      emptyState.classList.add('d-none');
      adsGrid.innerHTML = '';

      const ads = await loadAdvertisements(searchQuery, category);

      loadingState.classList.add('d-none');

      if (ads.length === 0) {
        emptyState.classList.remove('d-none');
        return;
      }

      ads.forEach(ad => {
        const adCard = createAdCard(ad);
        adsGrid.appendChild(adCard);
      });

    } catch (error) {
      console.error('Error loading advertisements:', error);
      loadingState.classList.add('d-none');
      emptyState.classList.remove('d-none');
    }
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(searchForm);
    const searchQuery = formData.get('searchQuery');
    const category = formData.get('category');
    displayAds(searchQuery, category);
  });

  // Load initial ads
  displayAds();

  return section;
}
