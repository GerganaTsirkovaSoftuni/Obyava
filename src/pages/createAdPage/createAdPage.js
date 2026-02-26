import './createAdPage.css';
import template from './createAdPage.html?raw';
import { getAdvertisementById, createAdvertisement, updateAdvertisement, getCategories } from '../../services/adsService.js';
import { uploadAdImages, validateImageFile, deleteAdImages } from '../../services/storageService.js';
import { confirm, alert } from '../../services/modalService.js';
import {
  validateRequired,
  validatePhoneField,
  clearFormErrors,
  addRealTimeValidation
} from '../../services/validationService.js';

async function loadAdvertisement(adUuid) {
  if (!adUuid) return null;
  
  const ad = await getAdvertisementById(adUuid);
  
  return {
    uuid: ad.uuid,
    title: ad.title,
    description: ad.description,
    price: ad.price,
    category_id: ad.category_id,
    item_condition: ad.item_condition || 'used',
    location: ad.location,
    phone: ad.owner_phone || '',
    images: ad.advertisement_images || []
  };
}

export function renderCreateAdPage({ navigate, params }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template;
  const section = wrapper.firstElementChild;

  const isEditMode = !!params.id;
  const adUuid = params.id;

  // Get elements
  const pageTitle = section.querySelector('#pageTitle');
  const form = section.querySelector('#adForm');
  const errorMessage = section.querySelector('#errorMessage');
  const successMessage = section.querySelector('#successMessage');
  const cancelBtn = section.querySelector('#cancelBtn');
  const imageInput = section.querySelector('#images');
  const imagePreview = section.querySelector('#imagePreview');

  // Update page title for edit mode
  if (isEditMode) {
    pageTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Edit Advertisement';
  }

  async function populateCategories(categoryId = '') {
    const categorySelect = section.querySelector('#category');

    try {
      const categories = await getCategories();
      categorySelect.innerHTML = '<option value="">Select category</option>';

      categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = String(category.id);
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });

      if (categoryId) {
        categorySelect.value = String(categoryId);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      categorySelect.innerHTML = '<option value="">No categories available</option>';
    }
  }

  // Handle image preview
  const selectedUploads = [];
  const selectedFileHashes = new Set();
  const existingImageHashes = new Set();
  let existingImageHashesReady = false;

  async function hashBlob(blob) {
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  async function buildExistingImageHashSet() {
    existingImageHashes.clear();

    await Promise.all(
      existingImages.map(async (image) => {
        if (!image.file_path) {
          return;
        }

        try {
          const response = await fetch(image.file_path, { cache: 'no-store' });
          if (!response.ok) {
            return;
          }

          const blob = await response.blob();
          const imageHash = await hashBlob(blob);
          existingImageHashes.add(imageHash);
        } catch (error) {
          console.warn('Failed to hash existing image:', image.file_path, error);
        }
      })
    );

    existingImageHashesReady = true;
  }
  
  imageInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);

    if (isEditMode && !existingImageHashesReady) {
      await buildExistingImageHashSet();
    }

    for (const file of files) {
      // Limit to 5 images total (existing + already selected + new files)
      if (existingImages.length + selectedUploads.length >= 5) {
        await alert('You can upload a maximum of 5 images', 'Upload Limit', 'warning');
        break;
      }

      // Validate file using storage service
      const validation = validateImageFile(file);
      if (!validation.valid) {
        await alert(validation.error, 'Invalid File', 'error');
        continue;
      }

      const fileHash = await hashBlob(file);

      if (selectedFileHashes.has(fileHash)) {
        await alert('This image is already selected', 'Duplicate Image', 'warning');
        continue;
      }

      if (existingImageHashes.has(fileHash)) {
        await alert('This image already exists for this advertisement', 'Duplicate Image', 'warning');
        continue;
      }

      selectedUploads.push({ file, hash: fileHash });
      selectedFileHashes.add(fileHash);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="image-preview-remove" data-hash="${fileHash}">
            <i class="bi bi-x"></i>
          </button>
        `;
        imagePreview.appendChild(previewItem);
        
        previewItem.querySelector('.image-preview-remove').addEventListener('click', function() {
          const removeHash = this.dataset.hash;
          const index = selectedUploads.findIndex((upload) => upload.hash === removeHash);
          if (index !== -1) {
            selectedUploads.splice(index, 1);
            selectedFileHashes.delete(removeHash);
          }
          previewItem.remove();
        });
      };
      reader.readAsDataURL(file);
    }

    // Clear the input
    imageInput.value = '';
  });

  // Load existing ad data if in edit mode
  let existingImages = [];
  (async () => {
    if (isEditMode) {
      try {
        const ad = await loadAdvertisement(adUuid);
        if (ad) {
          await populateCategories(ad.category_id);

          form.elements.title.value = ad.title;
          form.elements.description.value = ad.description;
          form.elements.price.value = ad.price || '';
          form.elements.location.value = ad.location;
          form.elements.phone.value = ad.phone;
          form.elements.itemCondition.value = ad.item_condition || 'used';

          // Load existing images
          existingImages = ad.images || [];
          existingImages.forEach((img) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
              <img src="${img.file_path}" alt="Existing image">
              <button type="button" class="image-preview-remove existing" data-uuid="${img.uuid}">
                <i class="bi bi-x"></i>
              </button>
            `;
            imagePreview.appendChild(previewItem);

            previewItem.querySelector('.image-preview-remove').addEventListener('click', async function() {
              const imageUuid = this.dataset.uuid;
              existingImages = existingImages.filter(i => i.uuid !== imageUuid);
              previewItem.remove();
              if (isEditMode) {
                existingImageHashesReady = false;
                await buildExistingImageHashSet();
              }
            });
          });

          await buildExistingImageHashSet();
        }
      } catch (error) {
        console.error('Error loading advertisement:', error);
        errorMessage.textContent = 'Error loading advertisement';
        errorMessage.classList.remove('d-none');
      }
    } else {
      await populateCategories();
    }
  })();

  // Handle cancel
  cancelBtn.addEventListener('click', async () => {
    const confirmed = await confirm('Are you sure you want to cancel? Unsaved changes will be lost.', 'Cancel Changes');
    if (confirmed) {
      navigate(isEditMode ? `/advertisement/${adUuid}` : '/');
    }
  });

  // Add real-time validation
  const titleInput = form.querySelector('#title');
  const descriptionInput = form.querySelector('#description');
  const categoryInput = form.querySelector('#category');
  const itemConditionInput = form.querySelector('#itemCondition');
  const locationInput = form.querySelector('#location');
  const phoneInput = form.querySelector('#phone');

  addRealTimeValidation(titleInput, (input) => validateRequired(input, 'Title'));
  addRealTimeValidation(descriptionInput, (input) => validateRequired(input, 'Description'));
  addRealTimeValidation(categoryInput, (input) => validateRequired(input, 'Category'));
  addRealTimeValidation(itemConditionInput, (input) => validateRequired(input, 'Condition'));
  addRealTimeValidation(locationInput, (input) => validateRequired(input, 'Location'));
  addRealTimeValidation(phoneInput, validatePhoneField);

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = e.submitter;
    const action = submitButton.dataset.action; // 'draft' or 'submit'
    
    errorMessage.classList.add('d-none');
    successMessage.classList.add('d-none');
    clearFormErrors(form);

    // Validate all required fields
    const isTitleValid = validateRequired(titleInput, 'Title');
    const isDescriptionValid = validateRequired(descriptionInput, 'Description');
    const isCategoryValid = validateRequired(categoryInput, 'Category');
    const isConditionValid = validateRequired(itemConditionInput, 'Condition');
    const isLocationValid = validateRequired(locationInput, 'Location');
    const isPhoneValid = validatePhoneField(phoneInput);

    if (!isTitleValid || !isDescriptionValid || !isCategoryValid || !isConditionValid || !isLocationValid || !isPhoneValid) {
      return;
    }

    // Disable submit buttons and show loading state
    const submitButtons = form.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    });

    const formData = new FormData(form);
    const rawPriceValue = formData.get('price').trim();
    const normalizedPrice = rawPriceValue ? parseFloat(rawPriceValue) : 0;
    const adData = {
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      category_id: parseInt(formData.get('category')),
      item_condition: formData.get('itemCondition').trim(),
      price: Number.isNaN(normalizedPrice) ? 0 : normalizedPrice,
      location: formData.get('location').trim(),
      phone: formData.get('phone').trim(),
      status: action === 'draft' ? 'Draft' : 'Pending'
    };

    try {
      let advertisementUuid = adUuid;
      
      // Create or update advertisement
      if (isEditMode) {
        await updateAdvertisement(adUuid, adData);
        
        // Delete removed images
        const originalImageUuids = (await getAdvertisementById(adUuid)).advertisement_images?.map(img => img.uuid) || [];
        const keptImageUuids = existingImages.map(img => img.uuid);
        const removedImageUuids = originalImageUuids.filter(uuid => !keptImageUuids.includes(uuid));
        
        if (removedImageUuids.length > 0) {
          await deleteAdImages(adUuid, removedImageUuids);
        }
      } else {
        const newAd = await createAdvertisement(adData);
        advertisementUuid = newAd.uuid;
      }
      
      // Upload new images if any
      if (selectedUploads.length > 0) {
        await uploadAdImages(advertisementUuid, selectedUploads.map((upload) => upload.file));
      }
      
      const successText = isEditMode 
        ? 'Advertisement updated successfully!'
        : action === 'draft' 
          ? 'Advertisement saved as draft'
          : 'Advertisement submitted for review';
          
      successMessage.textContent = successText;
      successMessage.classList.remove('d-none');
      
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving advertisement:', error);
      errorMessage.textContent = error.message || 'Error saving advertisement. Please try again.';
      errorMessage.classList.remove('d-none');
      
      // Re-enable submit buttons
      submitButtons.forEach(btn => {
        btn.disabled = false;
        if (btn.dataset.action === 'draft') {
          btn.innerHTML = '<i class="bi bi-save me-2"></i>Save as Draft';
        } else {
          btn.innerHTML = '<i class="bi bi-send me-2"></i>Submit for Review';
        }
      });
    }
  });

  return section;
}
