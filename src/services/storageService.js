import { supabase } from './supabaseClient.js';

/**
 * Storage Service
 * Handles file uploads to Supabase Storage
 * 
 * Schema notes:
 * - advertisement_images uses uuid (PK), advertisement_uuid (FK), file_path, position
 * - Storage buckets: 'advertisement-images', 'user-avatars'
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} {valid: boolean, error: string}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Няма избран файл' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Файлът е твърде голям. Максимум ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Невалиден тип файл. Разрешени са само: JPG, PNG, GIF, WEBP' };
  }

  return { valid: true };
}

/**
 * Upload images for an advertisement
 * @param {string} advertisementUuid - Advertisement UUID
 * @param {Array<File>} files - Array of image files
 * @returns {Promise<Array>} Array of uploaded image records
 */
export async function uploadAdImages(advertisementUuid, files) {
  if (!files || files.length === 0) {
    throw new Error('Няма файлове за качване');
  }

  if (files.length > 5) {
    throw new Error('Можете да качите максимум 5 снимки');
  }

  const uploadedImages = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${advertisementUuid}/${Date.now()}-${i}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('advertisement-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      throw new Error('Грешка при качване на снимка: ' + storageError.message);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('advertisement-images')
      .getPublicUrl(fileName);

    // Insert record in advertisement_images table
    const { data: imageRecord, error: dbError } = await supabase
      .from('advertisement_images')
      .insert([{
        advertisement_uuid: advertisementUuid,
        file_path: publicUrl,
        position: i
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to cleanup uploaded file
      await supabase.storage.from('advertisement-images').remove([fileName]);
      throw new Error('Грешка при записване на снимка: ' + dbError.message);
    }

    uploadedImages.push(imageRecord);
  }

  return uploadedImages;
}

/**
 * Delete advertisement images
 * @param {string} advertisementUuid - Advertisement UUID
 * @param {Array<string>} imageUuids - Array of image UUIDs to delete
 */
export async function deleteAdImages(advertisementUuid, imageUuids) {
  if (!imageUuids || imageUuids.length === 0) {
    return;
  }

  // Get file paths before deleting records
  const { data: images } = await supabase
    .from('advertisement_images')
    .select('file_path, uuid')
    .in('uuid', imageUuids)
    .eq('advertisement_uuid', advertisementUuid);

  if (!images || images.length === 0) {
    return;
  }

  // Delete database records
  const { error: dbError } = await supabase
    .from('advertisement_images')
    .delete()
    .in('uuid', imageUuids);

  if (dbError) {
    console.error('Error deleting image records:', dbError);
    throw new Error('Грешка при изтриване на снимки: ' + dbError.message);
  }

  // Delete files from storage
  const filePaths = images.map(img => {
    const url = new URL(img.file_path);
    return url.pathname.split('/').slice(-2).join('/'); // Get path after bucket name
  });

  const { error: storageError } = await supabase.storage
    .from('advertisement-images')
    .remove(filePaths);

  if (storageError) {
    console.error('Error deleting files from storage:', storageError);
    // Don't throw - database records are already deleted
  }
}

/**
 * Delete a single image
 * @param {string} imageUuid - Image UUID
 */
export async function deleteSingleImage(imageUuid) {
  // Get image record
  const { data: image } = await supabase
    .from('advertisement_images')
    .select('file_path, advertisement_uuid')
    .eq('uuid', imageUuid)
    .single();

  if (!image) {
    throw new Error('Снимката не е намерена');
  }

  await deleteAdImages(image.advertisement_uuid, [imageUuid]);
}

/**
 * Upload user avatar
 * @param {File} file - Avatar image file
 * @returns {Promise<string>} Public URL of uploaded avatar
 */
export async function uploadAvatar(file) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Потребителят не е влязъл в системата');
  }

  // Generate file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/avatar.${fileExt}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('user-avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true // Overwrite existing avatar
    });

  if (error) {
    console.error('Avatar upload error:', error);
    throw new Error('Грешка при качване на профилна снимка: ' + error.message);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('user-avatars')
    .getPublicUrl(fileName);

  // Update user profile
  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating profile with avatar:', updateError);
    throw new Error('Грешка при актуализиране на профила: ' + updateError.message);
  }

  return publicUrl;
}

/**
 * Get images for an advertisement
 * @param {string} advertisementUuid - Advertisement UUID
 * @returns {Promise<Array>} Array of image records
 */
export async function getAdImages(advertisementUuid) {
  const { data, error } = await supabase
    .from('advertisement_images')
    .select('*')
    .eq('advertisement_uuid', advertisementUuid)
    .order('position');

  if (error) {
    console.error('Get ad images error:', error);
    throw new Error('Грешка при зареждане на снимки: ' + error.message);
  }

  return data || [];
}
