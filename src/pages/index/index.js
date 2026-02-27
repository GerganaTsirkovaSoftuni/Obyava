import './index.css';
import template from './index.html?raw';
import { getCategories, getPublishedAds } from '../../services/adsService.js';
import { getCurrentUser, isUserAdmin } from '../../services/authService.js';
import { escapeHtml } from '../../services/sanitizeService.js';

const PAGE_SIZE = 8;

function createAdCard(ad, navigate) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

  const safeUuid = escapeHtml(ad.uuid);
  const safeTitle = escapeHtml(ad.title);
  const safeImageUrl = escapeHtml(ad.image_url || '/placeholder-image.png');
  const safeCategory = escapeHtml(ad.category);
  const safeLocation = escapeHtml(ad.location || 'Unknown location');

  col.innerHTML = `
    <div class="card ad-card shadow-sm" data-ad-uuid="${safeUuid}">
      <img src="${safeImageUrl}" class="ad-card-img" alt="${safeTitle}">
      <div class="card-body">
        <h5 class="ad-card-title">${safeTitle}</h5>
        <p class="ad-card-price">${ad.price ? ad.price + ' EUR' : 'Negotiable'}</p>
        <span class="ad-card-category">Category: ${safeCategory}</span>
        <div class="ad-card-footer">
          <i class="bi bi-geo-alt me-1"></i>${safeLocation}
        </div>
      </div>
    </div>
  `;

  col.addEventListener('click', () => {
    navigate(`/advertisement/${ad.uuid}`);
  });

  return col;
}

function createAdCardSkeleton() {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';
  col.innerHTML = `
    <div class="card ad-card-skeleton shadow-sm" aria-hidden="true">
      <div class="ad-skeleton-image"></div>
      <div class="card-body">
        <div class="ad-skeleton-line title"></div>
        <div class="ad-skeleton-line price"></div>
        <div class="ad-skeleton-pill"></div>
        <div class="ad-skeleton-footer"></div>
      </div>
    </div>
  `;

  return col;
}

async function loadAdvertisements(searchQuery = '', categoryId = '', offset = 0, limit = PAGE_SIZE + 1) {
  try {
    const ads = await getPublishedAds({
      searchQuery,
      category_id: categoryId,
      limit,
      offset
    });

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

export async function renderIndexPage({ navigate }) {
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
  let hasMoreAds = false;
  let currentOffset = 0;
  let currentSearchQuery = '';
  let currentCategory = '';
  let isLoadingMore = false;

  try {
    const { user } = await getCurrentUser();
    if (user) {
      const { isAdmin } = await isUserAdmin(user.id);
      if (!isAdmin) {
        createAdBtn.classList.remove('d-none');
        createAdBtn.addEventListener('click', () => navigate('/create-advertisement'));
      }
    }
  } catch (error) {
    console.error('Error checking create-ad visibility:', error);
    createAdBtn.classList.add('d-none');
  }

  await populateCategories(section);

  function renderAds() {
    adsGrid.innerHTML = '';

    if (allAds.length === 0) {
      emptyState.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
      return;
    }

    emptyState.classList.add('d-none');

    allAds.forEach((ad, index) => {
      const adCard = createAdCard(ad, navigate);
      adsGrid.appendChild(adCard);
    });

    if (hasMoreAds && allAds.length > 0) {
      paginationWrap.classList.remove('d-none');
    } else {
      paginationWrap.classList.add('d-none');
    }
  }

  function renderAdsSkeleton(count = PAGE_SIZE) {
    adsGrid.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      adsGrid.appendChild(createAdCardSkeleton());
    }
  }

  async function displayAds(searchQuery = '', category = '') {
    try {
      currentSearchQuery = searchQuery;
      currentCategory = category;
      currentOffset = 0;
      hasMoreAds = false;

      emptyState.classList.add('d-none');
      renderAdsSkeleton(PAGE_SIZE);
      paginationWrap.classList.add('d-none');

      const adsChunk = await loadAdvertisements(searchQuery, category, currentOffset, PAGE_SIZE + 1);
      const visibleChunk = adsChunk.slice(0, PAGE_SIZE);

      hasMoreAds = adsChunk.length > PAGE_SIZE;
      allAds = visibleChunk;
      currentOffset += visibleChunk.length;

      renderAds();

    } catch (error) {
      console.error('Error loading advertisements:', error);
      adsGrid.innerHTML = '';
      emptyState.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
    }
  }

  loadMoreBtn.addEventListener('click', async () => {
    if (isLoadingMore || !hasMoreAds) {
      return;
    }

    isLoadingMore = true;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';

    try {
      const adsChunk = await loadAdvertisements(currentSearchQuery, currentCategory, currentOffset, PAGE_SIZE + 1);
      const visibleChunk = adsChunk.slice(0, PAGE_SIZE);

      hasMoreAds = adsChunk.length > PAGE_SIZE;
      allAds = [...allAds, ...visibleChunk];
      currentOffset += visibleChunk.length;

      renderAds();
    } catch (error) {
      console.error('Error loading more advertisements:', error);
    } finally {
      isLoadingMore = false;
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load more...';
    }
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(searchForm);
    const searchQuery = formData.get('searchQuery').trim();
    const category = formData.get('category').trim();
    displayAds(searchQuery, category);
  });

  // Load initial ads
  loadingState.classList.add('d-none');
  await displayAds();
  
  return section;
}
