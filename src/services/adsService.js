import { supabase } from './supabaseClient.js';

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
  let query = supabase
    .from('advertisements')
    .select('*')
    .eq('status', 'Published')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.owner_id) {
    query = query.eq('owner_id', filters.owner_id);
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters.searchQuery) {
    query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

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

  const [{ data: usersData }, { data: categoriesData }, { data: imagesData }] = await Promise.all([
    ownerIds.length
      ? supabase
          .from('users')
          .select('id, full_name, phone')
          .in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? supabase
          .from('categories')
          .select('id, name, slug')
          .in('id', categoryIds)
      : Promise.resolve({ data: [] }),
    adUuids.length
      ? supabase
          .from('advertisement_images')
          .select('uuid, file_path, position, advertisement_uuid')
          .in('advertisement_uuid', adUuids)
          .order('position', { ascending: true })
      : Promise.resolve({ data: [] })
  ]);

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

  return {
    ...data,
    advertisement_images: images || []
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

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Get user ads error:', error);
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
      
      return {
        ...ad,
        advertisement_images: images || []
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

  const { data, error } = await supabase
    .from('advertisements')
    .insert([{
      title: adData.title,
      description: adData.description,
      category_id: adData.category_id,
      price: adData.price,
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
  if (updates.price !== undefined) updateData.price = updates.price;
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
export async function getPendingAds() {
  const { data, error } = await supabase
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
      
      return {
        ...ad,
        advertisement_images: images || []
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

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Get all ads error:', error);
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
      
      return {
        ...ad,
        advertisement_images: images || []
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

  return data;
}

/**
 * Reject an advertisement (admin only)
 * @param {string} uuid - Advertisement UUID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>}
 */
export async function rejectAdvertisement(uuid, reason) {
  // For now, we'll just change status back to Draft
  // In a full implementation, you might want to store the rejection reason
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

  return data;
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
    .select('status')
    .eq('owner_id', user.id);

  if (error) {
    console.error('Get user ad stats error:', error);
    throw new Error('Error loading statistics: ' + error.message);
  }

  const ads = data || [];
  
  return {
    total: ads.length,
    published: ads.filter(ad => ad.status === 'Published').length,
    pending: ads.filter(ad => ad.status === 'Pending').length,
    drafts: ads.filter(ad => ad.status === 'Draft').length,
    archived: ads.filter(ad => ad.status === 'Archived').length
  };
}
