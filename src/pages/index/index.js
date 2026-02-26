import './index.css';
import template from './index.html?raw';
import { getCategories, getPublishedAds } from '../../services/adsService.js';
import { getSession } from '../../services/authService.js';
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

  console.log('🎫 Created card:', {
    title: ad.title,
    className: col.className,
    hasHTMLContent: col.innerHTML.length > 0,
    element: col,
    image_url: ad.image_url
  });

  col.addEventListener('click', () => {
    navigate(`/advertisement/${ad.uuid}`);
  });

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

  console.log('🔍 Page render - section element:', section);
  console.log('🔍 Section class:', section?.className);
  console.log('🔍 Section HTML length:', section?.innerHTML?.length);
  console.log('🔍 Section parent when returned:', section?.parentElement);

  const searchForm = section.querySelector('#searchForm');
  const adsGrid = section.querySelector('#adsGrid');
  const emptyState = section.querySelector('#emptyState');
  const loadingState = section.querySelector('#loadingState');
  const createAdBtn = section.querySelector('#createAdBtn');
  const paginationWrap = section.querySelector('#paginationWrap');
  const loadMoreBtn = section.querySelector('#loadMoreBtn');

  console.log('✓ Found searchForm:', !!searchForm);
  console.log('✓ Found adsGrid:', !!adsGrid);
  console.log('✓ Found emptyState:', !!emptyState);
  console.log('✓ Found loadingState:', !!loadingState);

  let allAds = [];
  let hasMoreAds = false;
  let currentOffset = 0;
  let currentSearchQuery = '';
  let currentCategory = '';
  let isLoadingMore = false;

  // Check if user is logged in
  getSession().then(({ session }) => {
    if (session) {
      createAdBtn.classList.remove('d-none');
      createAdBtn.addEventListener('click', () => navigate('/create-advertisement'));
    }
  });

  populateCategories(section);

  function renderAds() {
    console.log('🎨 renderAds called - allAds count:', allAds.length);
    console.log('🎯 adsGrid element:', adsGrid);
    console.log('🎯 adsGrid HTML before clear:', adsGrid.innerHTML.substring(0, 100));
    
    adsGrid.innerHTML = '';

    if (allAds.length === 0) {
      console.log('❌ No ads to display - showing empty state');
      emptyState.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
      return;
    }

    console.log('✅ Rendering', allAds.length, 'ads');
    emptyState.classList.add('d-none');

    allAds.forEach((ad, index) => {
      console.log(`  Card ${index}:`, ad.title);
      const adCard = createAdCard(ad, navigate);
      console.log(`  Appending card ${index} to grid. Card element:`, adCard);
      adsGrid.appendChild(adCard);
      console.log(`  After append, grid has ${adsGrid.children.length} children`);
    });

    console.log('📊 Final grid state - children count:', adsGrid.children.length);
    console.log('📊 Grid HTML after render:', adsGrid.innerHTML.substring(0, 200));

    if (hasMoreAds && allAds.length > 0) {
      paginationWrap.classList.remove('d-none');
    } else {
      paginationWrap.classList.add('d-none');
    }
  }

  async function displayAds(searchQuery = '', category = '') {
    try {
      currentSearchQuery = searchQuery;
      currentCategory = category;
      currentOffset = 0;
      hasMoreAds = false;

      loadingState.classList.remove('d-none');
      emptyState.classList.add('d-none');
      adsGrid.innerHTML = '';
      paginationWrap.classList.add('d-none');

      const adsChunk = await loadAdvertisements(searchQuery, category, currentOffset, PAGE_SIZE + 1);
      const visibleChunk = adsChunk.slice(0, PAGE_SIZE);

      hasMoreAds = adsChunk.length > PAGE_SIZE;
      allAds = visibleChunk;
      currentOffset += visibleChunk.length;

      loadingState.classList.add('d-none');
      renderAds();

    } catch (error) {
      console.error('Error loading advertisements:', error);
      loadingState.classList.add('d-none');
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
      loadMoreBtn.textContent = 'Load 8 More';
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
  displayAds();

  console.log('🎬 INDEX PAGE - FINAL STATE BEFORE RETURN:');
  console.log('  Section element:', section);
  console.log('  Section parent:', section?.parentElement);
  console.log('  Section in DOM:', document.body.contains(section));
  console.log('  adsGrid children count:', adsGrid?.children?.length);
  console.log('  Full section HTML length:', section?.innerHTML?.length);
  
  return section;
}
