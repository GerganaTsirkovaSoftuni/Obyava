import './userAdsPage.css';
import template from './userAdsPage.html?raw';
import { getAllAds, getPublishedAds } from '../../services/adsService.js';
import { getCurrentUser, isUserAdmin } from '../../services/authService.js';
import { escapeHtml } from '../../services/sanitizeService.js';

const PAGE_SIZE = 8;

const statusTranslations = {
  'Draft': 'Draft',
  'Pending': 'Pending Approval',
  'Published': 'Published',
  'Archived': 'Archived',
  'Rejected': 'Rejected'
};

const statusOrder = { 'Pending': 0, 'Published': 1, 'Rejected': 2, 'Draft': 3, 'Archived': 4 };

function createAdCard(ad, navigate, showStatus = false) {
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
        ${showStatus ? `<p class="mb-2"><span class="status-badge status-${String(ad.status || '').toLowerCase()}">${statusTranslations[ad.status] || ad.status}</span></p>` : ''}
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

export async function renderUserAdsPage({ navigate, params }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const section = wrapper.firstElementChild;

  const userId = params?.id;
  const titleEl = section.querySelector('#sellerAdsTitle');
  const grid = section.querySelector('#sellerAdsGrid');
  const empty = section.querySelector('#sellerAdsEmpty');
  const emptyText = section.querySelector('#sellerAdsEmpty p');
  const loading = section.querySelector('#sellerAdsLoading');
  const paginationWrap = section.querySelector('#sellerAdsPaginationWrap');
  const loadMoreBtn = section.querySelector('#sellerAdsLoadMoreBtn');

  let allAds = [];
  let hasMoreAds = false;
  let currentOffset = 0;
  let isLoadingMore = false;
  let sellerDisplayName = 'this user';
  let isAdminViewer = false;
  let allAdminAds = [];

  function renderAds() {
    grid.innerHTML = '';

    if (allAds.length === 0) {
      empty.classList.remove('d-none');
      paginationWrap.classList.add('d-none');
      return;
    }

    empty.classList.add('d-none');

    allAds.forEach((ad) => {
      grid.appendChild(createAdCard(ad, navigate, isAdminViewer));
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

      if (isAdminViewer) {
        if (reset) {
          const adminAds = await getAllAds({ owner_id: userId, limit: 10000 });

          allAdminAds = (adminAds || []).map((ad) => ({
            uuid: ad.uuid,
            title: ad.title,
            price: ad.price,
            location: ad.location,
            status: ad.status,
            image_url: ad.advertisement_images?.[0]?.file_path || null,
            created_at: ad.created_at,
            users: ad.users || null
          }));

          allAdminAds.sort((a, b) => {
            const orderA = statusOrder[a.status] ?? 999;
            const orderB = statusOrder[b.status] ?? 999;

            if (orderA !== orderB) {
              return orderA - orderB;
            }

            return new Date(b.created_at) - new Date(a.created_at);
          });

          if (allAdminAds[0]?.users?.full_name) {
            sellerDisplayName = allAdminAds[0].users.full_name;
          }
          titleEl.textContent = `All ads by ${sellerDisplayName}`;
        }

        loading.classList.add('d-none');

        const nextChunk = allAdminAds.slice(currentOffset, currentOffset + PAGE_SIZE + 1);
        const visibleChunk = nextChunk.slice(0, PAGE_SIZE);

        if (reset) {
          allAds = visibleChunk;
        } else {
          allAds = [...allAds, ...visibleChunk];
        }

        hasMoreAds = nextChunk.length > PAGE_SIZE;
        currentOffset += visibleChunk.length;
        renderAds();
        return;
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

  try {
    const { user } = await getCurrentUser();
    if (user) {
      const { isAdmin } = await isUserAdmin(user.id);
      isAdminViewer = Boolean(isAdmin);
    }
  } catch (error) {
    console.error('Error checking admin view for user ads page:', error);
    isAdminViewer = false;
  }

  if (emptyText) {
    emptyText.textContent = isAdminViewer
      ? 'No ads from this user'
      : 'No published ads from this user';
  }

  await loadSellerAds(true);

  return section;
}
