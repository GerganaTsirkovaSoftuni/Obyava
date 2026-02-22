import './userAdsPage.css';
import template from './userAdsPage.html?raw';
import { getPublishedAds } from '../../services/adsService.js';

const INITIAL_VISIBLE_ADS = 16;
const LOAD_MORE_COUNT = 8;

function createAdCard(ad, navigate) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

  col.innerHTML = `
    <div class="card user-ads-card shadow-sm" data-ad-uuid="${ad.uuid}">
      <img src="${ad.image_url || '/placeholder-image.png'}" class="user-ads-image" alt="${ad.title}">
      <div class="card-body">
        <h5 class="card-title">${ad.title}</h5>
        <p class="user-ads-price mb-2">${ad.price ? ad.price + ' EUR' : 'Negotiable'}</p>
        <p class="mb-0 text-muted small">
          <i class="bi bi-geo-alt me-1"></i>${ad.location || 'Unknown location'}
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
  let visibleAdsCount = INITIAL_VISIBLE_ADS;

  function renderAds() {
    grid.innerHTML = '';

    if (allAds.length === 0) {
      empty.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
      return;
    }

    empty.classList.add('d-none');

    allAds.slice(0, visibleAdsCount).forEach((ad) => {
      grid.appendChild(createAdCard(ad, navigate));
    });

    if (allAds.length > INITIAL_VISIBLE_ADS && visibleAdsCount < allAds.length) {
      paginationWrap.classList.remove('d-none');
    } else {
      paginationWrap.classList.add('d-none');
    }
  }

  async function loadSellerAds() {
    try {
      const ads = await getPublishedAds({ owner_id: userId, limit: 200 });

      loading.classList.add('d-none');

      if (!ads || ads.length === 0) {
        allAds = [];
        renderAds();
        return;
      }

      const sellerName = ads[0]?.users?.full_name || 'this user';
      titleEl.textContent = `Published ads by ${sellerName}`;

      allAds = ads.map((ad) => ({
        uuid: ad.uuid,
        title: ad.title,
        price: ad.price,
        location: ad.location,
        image_url: ad.advertisement_images?.[0]?.file_path || null
      }));

      visibleAdsCount = INITIAL_VISIBLE_ADS;
      renderAds();
    } catch (error) {
      console.error('Error loading seller ads:', error);
      loading.classList.add('d-none');
      empty.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
    }
  }

  loadMoreBtn.addEventListener('click', () => {
    visibleAdsCount += LOAD_MORE_COUNT;
    renderAds();
  });

  section.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });

  loadSellerAds();

  return section;
}
