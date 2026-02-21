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
      ),
      advertisement_images (
        uuid,
        file_path,
        position
      )
    `)
    .eq('status', 'Published')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters.searchQuery) {
    query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error} = await query;

  if (error) {
    console.error('Get published ads error:', error);
    throw new Error('Грешка при зареждане на обявите: ' + error.message);
  }

  return data || [];
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
        phone
      ),
      categories (
        id,
        name,
        slug
      ),
      advertisement_images (
        uuid,
        file_path,
        position
      )
    `)
    .eq('uuid', uuid)
    .single();

  if (error) {
    console.error('Get advertisement error:', error);
    throw new Error('Грешка при зареждане на обявата: ' + error.message);
  }

  return data;
}

/**
 * Get current user's advertisements
 * @param {Object} filters - Filter options (status)
 * @returns {Promise<Array>}
 */
export async function getUserAds(filters = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Потребителят не е влязъл в системата');
  }

  let query = supabase
    .from('advertisements')
    .select(`
      *,
      categories (
        id,
        name,
        slug
      ),
      advertisement_images (
        uuid,
        file_path,
        position
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
    throw new Error('Грешка при зареждане на обявите: ' + error.message);
  }

  return data || [];
}

/**
 * Create a new advertisement
 * @param {Object} adData - Advertisement data
 * @returns {Promise<Object>}
 */
export async function createAdvertisement(adData) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Потребителят не е влязъл в системата');
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
    throw new Error('Грешка при създаване на обявата: ' + error.message);
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
    throw new Error('Грешка при обновяване на обявата: ' + error.message);
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
    throw new Error('Грешка при изтриване на обявата: ' + error.message);
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
      ),
      advertisement_images (
        uuid,
        file_path,
        position
      )
    `)
    .eq('status', 'Pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get pending ads error:', error);
    throw new Error('Грешка при зареждане на обявите: ' + error.message);
  }

  return data || [];
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
      ),
      advertisement_images (
        uuid,
        file_path,
        position
      )
    `)
    .order('created_at', { ascending: false});

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Get all ads error:', error);
    throw new Error('Грешка при зареждане на обявите: ' + error.message);
  }

  return data || [];
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
    throw new Error('Грешка при одобряване на обявата: ' + error.message);
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
    throw new Error('Грешка при отхвърляне на обявата: ' + error.message);
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
    throw new Error('Грешка при зареждане на категориите: ' + error.message);
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
    throw new Error('Потребителят не е влязъл в системата');
  }

  const { data, error } = await supabase
    .from('advertisements')
    .select('status')
    .eq('owner_id', user.id);

  if (error) {
    console.error('Get user ad stats error:', error);
    throw new Error('Грешка при зареждане на статистиките: ' + error.message);
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
