import './userAdsPage.css';
import template from './userAdsPage.html?raw';
import { getPublishedAds } from '../../services/adsService.js';
import { escapeHtml } from '../../services/sanitizeService.js';

const PAGE_SIZE = 8;

function createAdCard(ad, navigate) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

  const safeUuid = escapeHtml(ad.uuid);
  const safeTitle = escapeHtml(ad.title);
  const safeImageUrl = escapeHtml(ad.image_url || '/placeholder-image.png');
  const safeLocation = escapeHtml(ad.location || 'Unknown location');

  col.innerHTML = `
    <div class="card user-ads-card shadow-sm" data-ad-uuid="${safeUuid}">
      <img src="${safeImageUrl}" class="user-ads-image" alt="${safeTitle}">
      <div class="card-body">
        <h5 class="card-title">${safeTitle}</h5>
        <p class="user-ads-price mb-2">${ad.price ? ad.price + ' EUR' : 'Negotiable'}</p>
        <p class="mb-0 text-muted small">
          <i class="bi bi-geo-alt me-1"></i>${safeLocation}
        </p>
      </div>
    </div>
  `;

  col.addEventListener('click', () => {
    navigate(`/advertisement/${ad.uuid}`);
  });

  return col;
}

export function renderUserAdsPage({ navigate, params }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const section = wrapper.firstElementChild;

  const userId = params?.id;
  const titleEl = section.querySelector('#sellerAdsTitle');
  const grid = section.querySelector('#sellerAdsGrid');
  const empty = section.querySelector('#sellerAdsEmpty');
  const loading = section.querySelector('#sellerAdsLoading');
  const paginationWrap = section.querySelector('#sellerAdsPaginationWrap');
  const loadMoreBtn = section.querySelector('#sellerAdsLoadMoreBtn');

  let allAds = [];
  let hasMoreAds = false;
  let currentOffset = 0;
  let isLoadingMore = false;
  let sellerDisplayName = 'this user';

  function renderAds() {
    grid.innerHTML = '';

    if (allAds.length === 0) {
      empty.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
      return;
    }

    empty.classList.add('d-none');

    allAds.forEach((ad) => {
      grid.appendChild(createAdCard(ad, navigate));
    });

    if (hasMoreAds && allAds.length > 0) {
      paginationWrap.classList.remove('d-none');
    } else {
      paginationWrap.classList.add('d-none');
    }
  }

  async function loadSellerAds(reset = false) {
    try {
      if (reset) {
        allAds = [];
        hasMoreAds = false;
        currentOffset = 0;
        loading.classList.remove('d-none');
        empty.classList.add('d-none');
        paginationWrap.classList.add('d-none');
      }

      const ads = await getPublishedAds({ owner_id: userId, limit: PAGE_SIZE + 1, offset: currentOffset });

      loading.classList.add('d-none');

      if (!ads || ads.length === 0) {
        if (reset) {
          allAds = [];
        }
        hasMoreAds = false;
        renderAds();
        return;
      }

      if (ads[0]?.users?.full_name) {
        sellerDisplayName = ads[0].users.full_name;
      }
      titleEl.textContent = `Published ads by ${sellerDisplayName}`;

      const visibleChunk = ads.slice(0, PAGE_SIZE);
      hasMoreAds = ads.length > PAGE_SIZE;

      const mappedChunk = visibleChunk.map((ad) => ({
        uuid: ad.uuid,
        title: ad.title,
        price: ad.price,
        location: ad.location,
        image_url: ad.advertisement_images?.[0]?.file_path || null
      }));

      if (reset) {
        allAds = mappedChunk;
      } else {
        allAds = [...allAds, ...mappedChunk];
      }

      currentOffset += mappedChunk.length;
      renderAds();
    } catch (error) {
      console.error('Error loading seller ads:', error);
      loading.classList.add('d-none');
      empty.classList.remove('d-none');
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
      await loadSellerAds(false);
    } finally {
      isLoadingMore = false;
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load more...';
    }
  });

  section.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });

  loadSellerAds(true);

  return section;
}
