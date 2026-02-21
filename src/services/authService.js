import { supabase } from './supabaseClient.js';

/**
 * Authentication Service
 * Handles all user authentication operations
 */

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} metadata - Additional user data (full_name, phone)
 * @returns {Promise<{data, error}>}
 */
export async function signUp(email, password, metadata = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;

    // Create user profile in public.users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: data.user.id,
          full_name: metadata.full_name || '',
          phone: metadata.phone || '',
          role: 'user' // Default role
        }]);

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }

      // Assign default 'user' role in user_roles table
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'user')
        .single();

      if (roleData) {
        await supabase
          .from('user_roles')
          .insert([{
            user_id: data.user.id,
            role_id: roleData.id
          }]);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: null, error };
  }
}

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{data, error}>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{error}>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
}

/**
 * Get the current session
 * @returns {Promise<{session, error}>}
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session, error: null };
  } catch (error) {
    console.error('Get session error:', error);
    return { session: null, error };
  }
}

/**
 * Get the current user
 * @returns {Promise<{user, error}>}
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Get current user error:', error);
    return { user: null, error };
  }
}

/**
 * Get user profile with role information
 * @param {string} userId - User ID
 * @returns {Promise<{profile, error}>}
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return { profile: data, error: null };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { profile: null, error };
  }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<{data, error}>}
 */
export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Update user profile error:', error);
    return { data: null, error };
  }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<{data, error}>}
 */
export async function updatePassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Update password error:', error);
    return { data: null, error };
  }
}

/**
 * Delete user account
 * @param {string} userId - User ID
 * @returns {Promise<{error}>}
 */
export async function deleteAccount(userId) {
  try {
    // Delete user profile (this will cascade to delete ads due to foreign key)
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    // Sign out the user
    await signOut();

    return { error: null };
  } catch (error) {
    console.error('Delete account error:', error);
    return { error };
  }
}

/**
 * Check if user is admin
 * @param {string} userId - User ID
 * @returns {Promise<{isAdmin, error}>}
 */
export async function isUserAdmin(userId) {
  try {
    const { profile, error } = await getUserProfile(userId);
    if (error) throw error;

    return { isAdmin: profile?.role === 'admin', error: null };
  } catch (error) {
    console.error('Check admin error:', error);
    return { isAdmin: false, error };
  }
}

/**
 * Subscribe to authentication state changes
 * @param {Function} callback - Callback function to handle auth changes
 * @returns {Object} Subscription object
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
