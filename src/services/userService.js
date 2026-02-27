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

  const {
    data: { user: currentUser },
    error: currentUserError
  } = await supabase.auth.getUser();

  if (currentUserError) {
    throw new Error('Error validating current user: ' + currentUserError.message);
  }

  if (currentUser?.id === userId && newRole === 'user') {
    throw new Error('You cannot set your own account as Regular user. Another admin must do this.');
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
  const {
    data: { user: currentUser },
    error: currentUserError
  } = await supabase.auth.getUser();

  if (currentUserError) {
    throw new Error('Error validating current user: ' + currentUserError.message);
  }

  if (currentUser?.id === userId) {
    throw new Error('You cannot delete your own account from the admin panel.');
  }

  const { error } = await supabase
    .rpc('admin_delete_user', { target_user_id: userId });

  if (error) {
    console.error('Delete user RPC error:', error);
    const message = String(error.message || '');

    if (message.includes('not_admin')) {
      throw new Error('User not allowed. Admin privileges are required to delete users.');
    }

    if (message.includes('cannot_delete_self')) {
      throw new Error('You cannot delete your own account from the admin panel.');
    }

    if (message.includes('target_must_be_regular_user')) {
      throw new Error('Only accounts with Regular role can be deleted.');
    }

    if (message.includes('user_not_found')) {
      throw new Error('User not found.');
    }

    if (message.includes('delete_blocked')) {
      throw new Error('Delete was blocked by database policy. Apply the latest admin delete hotfix migration.');
    }

    if (message.includes('Could not find the function public.admin_delete_user')) {
      throw new Error('Database hotfix is missing. Run migration 20260227_000014_admin_delete_user_hotfix.sql in Supabase.');
    }

    throw new Error('Error deleting user: ' + message);
  }

  // Auth user deletion requires service role key - expected to fail with anon key
  // Silently skip since database user deletion is sufficient for app functionality
  try {
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError && !authDeleteError.message.includes('Forbidden')) {
      console.warn('Could not delete auth user:', authDeleteError);
    }
  } catch (authError) {
    // Expected: 403 Forbidden when using anon key - ignore silently
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
