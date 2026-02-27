import { supabase, supabasePublic } from './supabaseClient.js';

const AD_IMAGES_BUCKET = 'advertisement-images';
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

function applyPagination(query, filters = {}) {
  const hasLimit = Number.isInteger(filters.limit) && filters.limit > 0;
  const hasOffset = Number.isInteger(filters.offset) && filters.offset >= 0;

  if (hasLimit && hasOffset) {
    return query.range(filters.offset, filters.offset + filters.limit - 1);
  }

  if (hasLimit) {
    return query.limit(filters.limit);
  }

  return query;
}

function extractAdImageObjectPath(filePath) {
  if (!filePath) {
    return null;
  }

  const PUBLIC_MARKER = `/storage/v1/object/public/${AD_IMAGES_BUCKET}/`;
  const SIGNED_MARKER = `/storage/v1/object/sign/${AD_IMAGES_BUCKET}/`;

  if (filePath.includes(PUBLIC_MARKER)) {
    return decodeURIComponent(filePath.split(PUBLIC_MARKER)[1].split('?')[0]);
  }

  if (filePath.includes(SIGNED_MARKER)) {
    return decodeURIComponent(filePath.split(SIGNED_MARKER)[1].split('?')[0]);
  }

  if (filePath.startsWith(`${AD_IMAGES_BUCKET}/`)) {
    return filePath.slice(`${AD_IMAGES_BUCKET}/`.length);
  }

  if (!filePath.startsWith('http://') && !filePath.startsWith('https://')) {
    return filePath;
  }

  return null;
}

async function resolveAdImageUrls(images = []) {
  if (!images.length) {
    return images;
  }

  const pathByOriginalUrl = new Map();
  const paths = [];

  images.forEach((image) => {
    const objectPath = extractAdImageObjectPath(image.file_path);
    if (!objectPath) {
      return;
    }

    pathByOriginalUrl.set(image.file_path, objectPath);
    paths.push(objectPath);
  });

  if (!paths.length) {
    return images;
  }

  const uniquePaths = [...new Set(paths)];
  const { data, error } = await supabase.storage
    .from(AD_IMAGES_BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data) {
    return images;
  }

  const signedUrlByPath = new Map();
  data.forEach((item) => {
    if (item.path && item.signedUrl) {
      signedUrlByPath.set(item.path, item.signedUrl);
    }
  });

  return images.map((image) => {
    const objectPath = pathByOriginalUrl.get(image.file_path);
    if (!objectPath) {
      return image;
    }

    return {
      ...image,
      file_path: signedUrlByPath.get(objectPath) || image.file_path
    };
  });
}

async function queryPublishedAds(client, filters = {}) {
  let query = client
    .from('advertisements')
    .select('*')
    .eq('status', 'Published')
    .order('created_at', { ascending: false });

  if (filters.owner_id) {
    query = query.eq('owner_id', filters.owner_id);
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters.searchQuery) {
    query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
  }

  query = applyPagination(query, filters);
  return await query;
}

/**
 * Advertisements API Service
 * Handles all advertisement-related database operations
 * 
 * Schema notes:
 * - advertisements.uuid is the main identifier
 * - advertisements.owner_id references auth.users
 * - advertisements.category_id references categories
 * - Status values: 'Draft', 'Pending', 'Published', 'Archived' (capitalized)
 */

/**
 * Get published advertisements (public access)
 * @param {Object} filters - Filter options (category_id, searchQuery, limit)
 * @returns {Promise<Array>}
 */
export async function getPublishedAds(filters = {}) {
  const hasExplicitFilters = Boolean(filters.owner_id || filters.category_id || filters.searchQuery);

  let activeClient = supabasePublic;
  let { data, error } = await queryPublishedAds(activeClient, filters);

  if (!error && !hasExplicitFilters && (data || []).length === 0) {
    const fallbackResult = await queryPublishedAds(supabase, filters);
    if (!fallbackResult.error && (fallbackResult.data || []).length > 0) {
      activeClient = supabase;
      data = fallbackResult.data;
      error = null;
    }
  }

  if (error) {
    console.error('Get published ads error:', error);
    throw new Error('Error loading advertisements: ' + error.message);
  }

  const ads = data || [];
  if (ads.length === 0) {
    return [];
  }

  const ownerIds = [...new Set(ads.map((ad) => ad.owner_id).filter(Boolean))];
  const categoryIds = [...new Set(ads.map((ad) => ad.category_id).filter(Boolean))];
  const adUuids = ads.map((ad) => ad.uuid).filter(Boolean);

  const [{ data: usersData }, { data: categoriesData }, { data: rawImagesData }] = await Promise.all([
    ownerIds.length
      ? activeClient
          .from('users')
          .select('id, full_name, phone')
          .in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? activeClient
          .from('categories')
          .select('id, name, slug')
          .in('id', categoryIds)
      : Promise.resolve({ data: [] }),
    adUuids.length
      ? activeClient
          .from('advertisement_images')
          .select('uuid, file_path, position, advertisement_uuid')
          .in('advertisement_uuid', adUuids)
          .order('position', { ascending: true })
      : Promise.resolve({ data: [] })
  ]);

  const imagesData = await resolveAdImageUrls(rawImagesData || []);

  const usersById = new Map((usersData || []).map((user) => [user.id, user]));
  const categoriesById = new Map((categoriesData || []).map((category) => [category.id, category]));
  const imagesByAdUuid = new Map();

  for (const image of imagesData || []) {
    const key = image.advertisement_uuid;
    const current = imagesByAdUuid.get(key) || [];
    current.push({
      uuid: image.uuid,
      file_path: image.file_path,
      position: image.position
    });
    imagesByAdUuid.set(key, current);
  }

  return ads.map((ad) => ({
    ...ad,
    users: usersById.get(ad.owner_id) || null,
    categories: categoriesById.get(ad.category_id) || null,
    advertisement_images: imagesByAdUuid.get(ad.uuid) || []
  }));
}

/**
 * Get advertisement by UUID
 * @param {string} uuid - Advertisement UUID
 * @returns {Promise<Object>}
 */
export async function getAdvertisementById(uuid) {
  const { data, error } = await supabase
    .from('advertisements')
    .select(`
      *,
      users:owner_id (
        id,
        full_name,
        phone,
        email
      ),
      categories (
        id,
        name,
        slug
      )
    `)
    .eq('uuid', uuid)
    .single();

  if (error) {
    console.error('Get advertisement error:', error);
    throw new Error('Error loading advertisement: ' + error.message);
  }

  // Fetch images separately
  const { data: images } = await supabase
    .from('advertisement_images')
    .select('uuid, file_path, position')
    .eq('advertisement_uuid', uuid)
    .order('position', { ascending: true });

  const resolvedImages = await resolveAdImageUrls(images || []);

  return {
    ...data,
    advertisement_images: resolvedImages
  };
}

/**
 * Get current user's advertisements
 * @param {Object} filters - Filter options (status)
 * @returns {Promise<Array>}
 */
export async function getUserAds(filters = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User is not logged in');
  }

  let query = supabase
    .from('advertisements')
    .select(`
      *,
      categories (
        id,
        name,
        slug
      )
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'Rejected') {
    query = query.eq('status', filters.status);
  }

  query = applyPagination(query, filters);

  const { data, error } = await query;

  if (error) {
    console.error('Get user ads error:', error);
    throw new Error('Error loading advertisements: ' + error.message);
  }

  const advertisements = data || [];
  const adUuids = advertisements.map((ad) => ad.uuid).filter(Boolean);

  let rejectedUuidSet = new Set();
  if (adUuids.length > 0) {
    const { data: rejectedRows, error: rejectedError } = await supabase
      .from('rejected_advertisements')
      .select('advertisement_uuid')
      .eq('owner_id', user.id)
      .in('advertisement_uuid', adUuids);

    if (rejectedError) {
      console.error('Get rejected ads for user error:', rejectedError);
      throw new Error('Error loading advertisements: ' + rejectedError.message);
    }

    rejectedUuidSet = new Set((rejectedRows || []).map((row) => row.advertisement_uuid));
  }

  let filteredAds = advertisements;
  if (filters.status === 'Rejected') {
    filteredAds = advertisements.filter((ad) => rejectedUuidSet.has(ad.uuid));
  } else if (filters.status === 'Draft') {
    filteredAds = advertisements.filter((ad) => !rejectedUuidSet.has(ad.uuid));
  }

  // Fetch images separately for each advertisement
  const adsWithImages = await Promise.all(
    filteredAds.map(async (ad) => {
      const { data: images } = await supabase
        .from('advertisement_images')
        .select('uuid, file_path, position')
        .eq('advertisement_uuid', ad.uuid)
        .order('position', { ascending: true });

      const resolvedImages = await resolveAdImageUrls(images || []);
      
      return {
        ...ad,
        status: rejectedUuidSet.has(ad.uuid) ? 'Rejected' : ad.status,
        advertisement_images: resolvedImages
      };
    })
  );

  return adsWithImages;
}

/**
 * Create a new advertisement
 * @param {Object} adData - Advertisement data
 * @returns {Promise<Object>}
 */
export async function createAdvertisement(adData) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User is not logged in');
  }

  const normalizedPrice = typeof adData.price === 'number' && !Number.isNaN(adData.price)
    ? adData.price
    : 0;

  const { data, error } = await supabase
    .from('advertisements')
    .insert([{
      title: adData.title,
      description: adData.description,
      category_id: adData.category_id,
      item_condition: adData.item_condition === 'new' ? 'new' : 'used',
      price: normalizedPrice,
      location: adData.location,
      owner_phone: adData.phone,
      owner_id: user.id,
      status: adData.status || 'Draft'
    }])
    .select()
    .single();

  if (error) {
    console.error('Create advertisement error:', error);
    throw new Error('Error creating advertisement: ' + error.message);
  }

  return data;
}

/**
 * Update an advertisement
 * @param {string} uuid - Advertisement UUID
 * @param {Object} updates - Data to update
 * @returns {Promise<Object>}
 */
export async function updateAdvertisement(uuid, updates) {
  const updateData = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
  if (updates.item_condition !== undefined) {
    updateData.item_condition = updates.item_condition === 'new' ? 'new' : 'used';
  }
  if (updates.price !== undefined) {
    updateData.price = typeof updates.price === 'number' && !Number.isNaN(updates.price)
      ? updates.price
      : 0;
  }
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.phone !== undefined) updateData.owner_phone = updates.phone;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await supabase
    .from('advertisements')
    .update(updateData)
    .eq('uuid', uuid)
    .select()
    .single();

  if (error) {
    console.error('Update advertisement error:', error);
    throw new Error('Error updating advertisement: ' + error.message);
  }

  return data;
}

/**
 * Delete an advertisement
 * @param {string} uuid - Advertisement UUID
 */
export async function deleteAdvertisement(uuid) {
  const { error } = await supabase
    .from('advertisements')
    .delete()
    .eq('uuid', uuid);

  if (error) {
    console.error('Delete advertisement error:', error);
    throw new Error('Error deleting advertisement: ' + error.message);
  }
}

/**
 * Submit advertisement for review (Draft -> Pending)
 * @param {string} uuid - Advertisement UUID
 * @returns {Promise<Object>}
 */
export async function submitForReview(uuid) {
  return await updateAdvertisement(uuid, { status: 'Pending' });
}

/**
 * Archive an advertisement
 * @param {string} uuid - Advertisement UUID
 * @returns {Promise<Object>}
 */
export async function archiveAdvertisement(uuid) {
  return await updateAdvertisement(uuid, { status: 'Archived' });
}

/**
 * Get pending advertisements (admin only)
 * @returns {Promise<Array>}
 */
export async function getPendingAds(filters = {}) {
  let query = supabase
    .from('advertisements')
    .select(`
      *,
      users:owner_id (
        id,
        full_name,
        phone
      ),
      categories (
        id,
        name,
        slug
      )
    `)
    .eq('status', 'Pending')
    .order('created_at', { ascending: false });

  query = applyPagination(query, filters);

  const { data, error } = await query;

  if (error) {
    console.error('Get pending ads error:', error);
    throw new Error('Error loading advertisements: ' + error.message);
  }

  // Fetch images separately for each advertisement
  const adsWithImages = await Promise.all(
    (data || []).map(async (ad) => {
      const { data: images } = await supabase
        .from('advertisement_images')
        .select('uuid, file_path, position')
        .eq('advertisement_uuid', ad.uuid)
        .order('position', { ascending: true });

      const resolvedImages = await resolveAdImageUrls(images || []);
      
      return {
        ...ad,
        advertisement_images: resolvedImages
      };
    })
  );

  return adsWithImages;
}

/**
 * Get all advertisements (admin only)
 * @param {Object} filters - Filter options (status)
 * @returns {Promise<Array>}
 */
export async function getAllAds(filters = {}) {
  let query = supabase
    .from('advertisements')
    .select(`
      *,
      users:owner_id (
        id,
        full_name,
        phone
      ),
      categories (
        id,
        name,
        slug
      )
    `)
    .order('created_at', { ascending: false});

  if (filters.status && filters.status !== 'Rejected') {
    query = query.eq('status', filters.status);
  }

  query = applyPagination(query, filters);

  const { data, error } = await query;

  if (error) {
    console.error('Get all ads error:', error);
    throw new Error('Error loading advertisements: ' + error.message);
  }

  const advertisements = data || [];
  const adUuids = advertisements.map((ad) => ad.uuid).filter(Boolean);

  let rejectedUuidSet = new Set();
  if (adUuids.length > 0) {
    const { data: rejectedRows, error: rejectedError } = await supabase
      .from('rejected_advertisements')
      .select('advertisement_uuid')
      .in('advertisement_uuid', adUuids);

    if (rejectedError) {
      console.error('Get rejected ads for admin list error:', rejectedError);
      throw new Error('Error loading advertisements: ' + rejectedError.message);
    }

    rejectedUuidSet = new Set((rejectedRows || []).map((row) => row.advertisement_uuid));
  }

  let filteredAds = advertisements;
  if (filters.status === 'Rejected') {
    filteredAds = advertisements.filter((ad) => rejectedUuidSet.has(ad.uuid));
  } else if (filters.status === 'Draft') {
    filteredAds = advertisements.filter((ad) => !rejectedUuidSet.has(ad.uuid));
  }

  // Fetch images separately for each advertisement
  const adsWithImages = await Promise.all(
    filteredAds.map(async (ad) => {
      const { data: images } = await supabase
        .from('advertisement_images')
        .select('uuid, file_path, position')
        .eq('advertisement_uuid', ad.uuid)
        .order('position', { ascending: true });

      const resolvedImages = await resolveAdImageUrls(images || []);
      
      return {
        ...ad,
        status: rejectedUuidSet.has(ad.uuid) ? 'Rejected' : ad.status,
        advertisement_images: resolvedImages
      };
    })
  );

  return adsWithImages;
}

/**
 * Approve an advertisement (admin only)
 * @param {string} uuid - Advertisement UUID
 * @returns {Promise<Object>}
 */
export async function approveAdvertisement(uuid) {
  const { data, error } = await supabase
    .from('advertisements')
    .update({ 
      status: 'Published',
      published_at: new Date().toISOString()
    })
    .eq('uuid', uuid)
    .select()
    .single();

  if (error) {
    console.error('Approve advertisement error:', error);
    throw new Error('Error approving advertisement: ' + error.message);
  }

  // If this ad was rejected before, remove it from rejected_advertisements
  if (data) {
    const { error: deleteError } = await supabase
      .from('rejected_advertisements')
      .delete()
      .eq('advertisement_uuid', uuid);

    if (deleteError) {
      console.error('Error removing from rejected ads:', deleteError);
    }
  }

  return data;
}

/**
 * Reject an advertisement (admin only)
 * @param {string} uuid - Advertisement UUID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>}
 */
export async function rejectAdvertisement(uuid, reason) {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Rejection reason is required');
  }

  // Get the ad details first
  const { data: adData, error: adError } = await supabase
    .from('advertisements')
    .select('uuid, title, description, owner_id')
    .eq('uuid', uuid)
    .single();

  if (adError || !adData) {
    console.error('Error fetching advertisement:', adError);
    throw new Error('Advertisement not found');
  }

  // Update the ad status to Draft (rejected ads are stored separately)
  const { data, error } = await supabase
    .from('advertisements')
    .update({ status: 'Draft' })
    .eq('uuid', uuid)
    .select()
    .single();

  if (error) {
    console.error('Reject advertisement error:', error);
    throw new Error('Error rejecting advertisement: ' + error.message);
  }

  // Insert into rejected_advertisements table
  const { error: rejectError } = await supabase
    .from('rejected_advertisements')
    .insert({
      advertisement_uuid: uuid,
      title: adData.title,
      description: adData.description,
      owner_id: adData.owner_id,
      rejection_reason: reason.trim()
    });

  if (rejectError) {
    console.error('Error storing rejection reason:', rejectError);
    // Don't throw - the ad is already rejected, but reason wasn't stored
  }

  return data;
}

/**
 * Get rejection reason for an advertisement
 * @param {string} uuid - Advertisement UUID
 * @returns {Promise<Object|null>} - Returns rejection record or null if not found
 */
export async function getRejectionReason(uuid) {
  const { data, error } = await supabase
    .from('rejected_advertisements')
    .select('rejection_reason, rejection_date')
    .eq('advertisement_uuid', uuid)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching rejection reason:', error);
    return null;
  }

  return data || null;
}

/**
 * Get all categories
 * @returns {Promise<Array>}
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Get categories error:', error);
    throw new Error('Error loading categories: ' + error.message);
  }

  return data || [];
}

export async function getPendingAdsCount() {
  const { count, error } = await supabase
    .from('advertisements')
    .select('uuid', { count: 'exact', head: true })
    .eq('status', 'Pending');

  if (error) {
    console.error('Get pending ads count error:', error);
    throw new Error('Error loading pending ads count: ' + error.message);
  }

  return count || 0;
}

/**
 * Get user's advertisement statistics
 * @returns {Promise<Object>}
 */
export async function getUserAdStats() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User is not logged in');
  }

  const { data, error } = await supabase
    .from('advertisements')
    .select('uuid, status')
    .eq('owner_id', user.id);

  if (error) {
    console.error('Get user ad stats error:', error);
    throw new Error('Error loading statistics: ' + error.message);
  }

  const ads = data || [];

  const { data: rejectedRows, error: rejectedRowsError } = await supabase
    .from('rejected_advertisements')
    .select('advertisement_uuid')
    .eq('owner_id', user.id);

  if (rejectedRowsError) {
    console.error('Get rejected ads list error:', rejectedRowsError);
    throw new Error('Error loading statistics: ' + rejectedRowsError.message);
  }

  const rejectedSet = new Set((rejectedRows || []).map((row) => row.advertisement_uuid));

  let published = 0;
  let pending = 0;
  let drafts = 0;
  let archived = 0;
  let rejected = 0;

  ads.forEach((ad) => {
    if (rejectedSet.has(ad.uuid)) {
      rejected += 1;
      return;
    }

    if (ad.status === 'Published') {
      published += 1;
    } else if (ad.status === 'Pending') {
      pending += 1;
    } else if (ad.status === 'Draft') {
      drafts += 1;
    } else if (ad.status === 'Archived') {
      archived += 1;
    }
  });
  
  return {
    total: ads.length,
    published,
    pending,
    drafts,
    archived,
    rejected
  };
}
