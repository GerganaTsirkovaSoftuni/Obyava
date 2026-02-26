import './index.css';
import template from './index.html?raw';
import { getCategories, getPublishedAds } from '../../services/adsService.js';
import { getSession } from '../../services/authService.js';

const INITIAL_VISIBLE_ADS = 16;
const LOAD_MORE_COUNT = 8;

function createAdCard(ad) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

  col.innerHTML = `
    <div class="card ad-card shadow-sm" data-ad-uuid="${ad.uuid}">
      <img src="${ad.image_url || '/placeholder-image.png'}" class="ad-card-img" alt="${ad.title}">
      <div class="card-body">
        <h5 class="ad-card-title">${ad.title}</h5>
        <p class="ad-card-price">${ad.price ? ad.price + ' EUR' : 'Negotiable'}</p>
        <span class="ad-card-category">Category: ${ad.category}</span>
        <div class="ad-card-footer">
          <i class="bi bi-geo-alt me-1"></i>${ad.location || 'Unknown location'}
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
      limit: 200
    });

    console.log('📢 Raw ads from API:', ads);
    console.log('📊 Total ads fetched:', ads.length);

    // Format data for display
    const formattedAds = ads.map(ad => ({
      uuid: ad.uuid,
      title: ad.title,
      description: ad.description,
      price: ad.price,
      category: ad.categories?.name || 'Unknown category',
      location: ad.location,
      image_url: ad.advertisement_images?.[0]?.file_path || null,
      status: ad.status
    }));

    console.log('📋 Formatted ads for display:', formattedAds);
    return formattedAds;
  } catch (error) {
    console.error('Error loading advertisements:', error);
    return [];
  }
}

async function populateCategories(section) {
  const categoryFilter = section.querySelector('#categoryFilter');

  try {
    const categories = await getCategories();

    categoryFilter.innerHTML = '<option value="">All categories</option>';

    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = String(category.id);
      option.textContent = category.name;
      categoryFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
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
  const paginationWrap = section.querySelector('#paginationWrap');
  const loadMoreBtn = section.querySelector('#loadMoreBtn');

  let allAds = [];
  let visibleAdsCount = INITIAL_VISIBLE_ADS;

  // Check if user is logged in
  getSession().then(({ session }) => {
    if (session) {
      createAdBtn.classList.remove('d-none');
      createAdBtn.addEventListener('click', () => navigate('/create-advertisement'));
    }
  });

  populateCategories(section);

  function renderAds() {
    console.log('🎨 renderAds called - allAds count:', allAds.length, 'visibleCount:', visibleAdsCount);
    adsGrid.innerHTML = '';

    if (allAds.length === 0) {
      console.log('❌ No ads to display - showing empty state');
      emptyState.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
      return;
    }

    console.log('✅ Rendering', Math.min(visibleAdsCount, allAds.length), 'ads');
    emptyState.classList.add('d-none');

    allAds.slice(0, visibleAdsCount).forEach((ad, index) => {
      console.log(`  Card ${index}:`, ad.title);
      const adCard = createAdCard(ad);
      adsGrid.appendChild(adCard);
    });

    if (allAds.length > INITIAL_VISIBLE_ADS && visibleAdsCount < allAds.length) {
      paginationWrap.classList.remove('d-none');
    } else {
      paginationWrap.classList.add('d-none');
    }
  }

  async function displayAds(searchQuery = '', category = '') {
    try {
      loadingState.classList.remove('d-none');
      emptyState.classList.add('d-none');
      adsGrid.innerHTML = '';
      paginationWrap.classList.add('d-none');

      allAds = await loadAdvertisements(searchQuery, category);
      visibleAdsCount = INITIAL_VISIBLE_ADS;

      loadingState.classList.add('d-none');
      renderAds();

    } catch (error) {
      console.error('Error loading advertisements:', error);
      loadingState.classList.add('d-none');
      emptyState.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
    }
  }

  loadMoreBtn.addEventListener('click', () => {
    visibleAdsCount += LOAD_MORE_COUNT;
    renderAds();
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(searchForm);
    const searchQuery = formData.get('searchQuery').trim();
    const category = formData.get('category').trim();
    displayAds(searchQuery, category);
  });

  // Load initial ads
  displayAds();

  return section;
}
