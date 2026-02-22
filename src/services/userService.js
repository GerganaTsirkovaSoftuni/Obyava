import { supabase } from './supabaseClient.js';

/**
 * User Service (Admin operations)
 * Handles user management operations for administrators
 * 
 * Schema notes:
 * - public.users table has role column ('user' or 'admin')
 * - public.user_roles table for role assignments
 * - public.is_admin() function for checking admin status
 */

/**
 * Get all users (admin only)
 * @returns {Promise<Array>}
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get all users error:', error);
    throw new Error('Error loading users: ' + error.message);
  }

  return data || [];
}

/**
 * Update user role (admin only)
 * @param {string} userId - User ID
 * @param {string} newRole - New role ('user' or 'admin')
 */
export async function updateUserRole(userId, newRole) {
  if (!['user', 'admin'].includes(newRole)) {
    throw new Error('Invalid role. Allowed values: user, admin');
  }

  // Update in users table
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (updateError) {
    console.error('Update user role error:', updateError);
    throw new Error('Error updating role: ' + updateError.message);
  }

  // Also update user_roles table
  // First, get the role ID
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('name', newRole)
    .single();

  if (roleData) {
    // Delete existing role assignments
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Insert new role assignment
    await supabase
      .from('user_roles')
      .insert([{
        user_id: userId,
        role_id: roleData.id
      }]);
  }
}

/**
 * Delete a user (admin only)
 * @param {string} userId - User ID
 */
export async function deleteUser(userId) {
  // Note: This will cascade delete all user's advertisements due to FK constraints
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Delete user error:', error);
    throw new Error('Error deleting user: ' + error.message);
  }

  // Also try to delete the auth user (requires service role key)
  // This might fail if using anon key, which is expected
  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (authError) {
    console.warn('Could not delete auth user (requires service role):', authError);
  }
}

/**
 * Get platform statistics (admin only)
 * @returns {Promise<Object>}
 */
export async function getPlatformStats() {
  // Get total users
  const { data: users } = await supabase
    .from('users')
    .select('id', { count: 'exact' });

  // Get ads by status
  const { data: allAds } = await supabase
    .from('advertisements')
    .select('status');

  const ads = allAds || [];

  return {
    total_users: users?.length || 0,
    total_ads: ads.length,
    published_ads: ads.filter(ad => ad.status === 'Published').length,
    pending_ads: ads.filter(ad => ad.status === 'Pending').length,
    draft_ads: ads.filter(ad => ad.status === 'Draft').length,
    archived_ads: ads.filter(ad => ad.status === 'Archived').length
  };
}
