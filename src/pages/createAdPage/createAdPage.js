import './createAdPage.css';
import template from './createAdPage.html?raw';
import { getAdvertisementById, createAdvertisement, updateAdvertisement, getCategories } from '../../services/adsService.js';
import { uploadAdImages, validateImageFile, deleteAdImages } from '../../services/storageService.js';

async function loadAdvertisement(adUuid) {
  if (!adUuid) return null;
  
  const ad = await getAdvertisementById(adUuid);
  
  return {
    uuid: ad.uuid,
    title: ad.title,
    description: ad.description,
    price: ad.price,
    category_id: ad.category_id,
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
    pageTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Редактирай обява';
  }

  // Handle image preview
  const selectedFiles = [];
  
  imageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 5 images
    if (selectedFiles.length + files.length > 5) {
      alert('Можете да качите максимум 5 снимки');
      imageInput.value = '';
      return;
    }

    files.forEach(file => {
      // Validate file using storage service
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      selectedFiles.push(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="image-preview-remove" data-index="${selectedFiles.length - 1}">
            <i class="bi bi-x"></i>
          </button>
        `;
        imagePreview.appendChild(previewItem);
        
        previewItem.querySelector('.image-preview-remove').addEventListener('click', function() {
          const index = parseInt(this.dataset.index);
          selectedFiles.splice(index, 1);
          previewItem.remove();
        });
      };
      reader.readAsDataURL(file);
    });

    // Clear the input
    imageInput.value = '';
  });

  // Load existing ad data if in edit mode
  let existingImages = [];
  if (isEditMode) {
    loadAdvertisement(adUuid).then(ad => {
      if (ad) {
        form.elements.title.value = ad.title;
        form.elements.description.value = ad.description;
        form.elements.price.value = ad.price || '';
        form.elements.category.value = ad.category_id;
        form.elements.location.value = ad.location;
        form.elements.phone.value = ad.phone;
        
        // Load existing images
        existingImages = ad.images || [];
        existingImages.forEach((img, index) => {
          const previewItem = document.createElement('div');
          previewItem.className = 'image-preview-item';
          previewItem.innerHTML = `
            <img src="${img.file_path}" alt="Existing image">
            <button type="button" class="image-preview-remove existing" data-uuid="${img.uuid}">
              <i class="bi bi-x"></i>
            </button>
          `;
          imagePreview.appendChild(previewItem);
          
          previewItem.querySelector('.image-preview-remove').addEventListener('click', function() {
            const imageUuid = this.dataset.uuid;
            existingImages = existingImages.filter(i => i.uuid !== imageUuid);
            previewItem.remove();
          });
        });
      }
    }).catch(error => {
      console.error('Error loading advertisement:', error);
      errorMessage.textContent = 'Грешка при зареждане на обявата';
      errorMessage.classList.remove('d-none');
    });
  }

  // Handle cancel
  cancelBtn.addEventListener('click', () => {
    if (confirm('Сигурни ли сте, че искате да отмените? Несъхранените промени ще бъдат загубени.')) {
      navigate(isEditMode ? `/advertisement/${adUuid}` : '/');
    }
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = e.submitter;
    const action = submitButton.dataset.action; // 'draft' or 'submit'
    
    errorMessage.classList.add('d-none');
    successMessage.classList.add('d-none');

    // Disable submit buttons and show loading state
    const submitButtons = form.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Запазване...';
    });

    const formData = new FormData(form);
    const adData = {
      title: formData.get('title'),
      description: formData.get('description'),
      category_id: parseInt(formData.get('category')),
      price: formData.get('price') ? parseFloat(formData.get('price')) : null,
      location: formData.get('location'),
      phone: formData.get('phone'),
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
      if (selectedFiles.length > 0) {
        await uploadAdImages(advertisementUuid, selectedFiles);
      }
      
      const successText = isEditMode 
        ? 'Обявата е обновена успешно!'
        : action === 'draft' 
          ? 'Обявата е запазена като чернова'
          : 'Обявата е изпратена за одобрение';
          
      successMessage.textContent = successText;
      successMessage.classList.remove('d-none');
      
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving advertisement:', error);
      errorMessage.textContent = error.message || 'Грешка при запазване на обявата. Моля, опитайте отново.';
      errorMessage.classList.remove('d-none');
      
      // Re-enable submit buttons
      submitButtons.forEach(btn => {
        btn.disabled = false;
        const originalText = btn.dataset.action === 'draft' ? 'Запази като чернова' : 'Публикувай';
        btn.innerHTML = originalText;
      });
    }
  });

  return section;
}
