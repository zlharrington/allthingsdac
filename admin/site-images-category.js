(() => {
  const SITE_IMAGES = 'site-images';
  const categorySelect = document.getElementById('jobType');
  const projectSelect = document.getElementById('projectId');
  const projectField = document.getElementById('uploadProjectField') || projectSelect?.closest('label');
  const published = document.getElementById('published');
  const grid = document.getElementById('photoGrid');

  if (!categorySelect || !projectSelect || !published) return;

  function ensureSiteImagesOption(select) {
    let option = [...select.options].find(item => item.value === SITE_IMAGES);
    if (!option) {
      option = document.createElement('option');
      option.value = SITE_IMAGES;
      option.textContent = 'Site Images';
      select.appendChild(option);
    }
    return option;
  }

  function removeSiteImagesOption(select) {
    [...select.options].filter(item => item.value === SITE_IMAGES).forEach(item => item.remove());
  }

  function syncUploadDestination() {
    const siteImages = categorySelect.value === SITE_IMAGES;
    if (siteImages) {
      ensureSiteImagesOption(projectSelect);
      projectSelect.value = SITE_IMAGES;
      projectSelect.required = false;
      if (projectField) projectField.hidden = true;
      published.checked = false;
      published.disabled = true;
    } else {
      if (projectSelect.value === SITE_IMAGES) projectSelect.value = '';
      removeSiteImagesOption(projectSelect);
      projectSelect.required = true;
      if (projectField) projectField.hidden = false;
      published.disabled = false;
    }
  }

  function syncPhotoCard(card) {
    const typeSelect = card.querySelector('.edit-job-type');
    const project = card.querySelector('.edit-project');
    const publish = card.querySelector('.edit-published');
    if (!typeSelect || !project || !publish) return;

    ensureSiteImagesOption(typeSelect);
    const siteImage = project.value === SITE_IMAGES || typeSelect.value === SITE_IMAGES;
    const projectLabel = project.closest('label');

    if (siteImage) {
      typeSelect.value = SITE_IMAGES;
      project.innerHTML = '<option value="site-images" selected>Site Images</option>';
      if (projectLabel) projectLabel.hidden = true;
      publish.checked = false;
      publish.disabled = true;
    } else {
      removeSiteImagesOption(project);
      if (projectLabel) projectLabel.hidden = false;
      publish.disabled = false;
    }
  }

  categorySelect.addEventListener('change', () => queueMicrotask(syncUploadDestination));

  projectSelect.addEventListener('change', () => {
    if (projectSelect.value === SITE_IMAGES) {
      categorySelect.value = SITE_IMAGES;
      syncUploadDestination();
    }
  });

  const uploadObserver = new MutationObserver(() => syncUploadDestination());
  uploadObserver.observe(projectSelect, { childList: true });

  if (grid) {
    grid.addEventListener('change', event => {
      const card = event.target.closest('.admin-card');
      if (!card) return;
      if (event.target.matches('.edit-job-type')) {
        queueMicrotask(() => {
          const project = card.querySelector('.edit-project');
          const publish = card.querySelector('.edit-published');
          const projectLabel = project?.closest('label');
          if (event.target.value === SITE_IMAGES) {
            if (project) project.innerHTML = '<option value="site-images" selected>Site Images</option>';
            if (projectLabel) projectLabel.hidden = true;
            if (publish) {
              publish.checked = false;
              publish.disabled = true;
            }
          } else {
            if (project) removeSiteImagesOption(project);
            if (projectLabel) projectLabel.hidden = false;
            if (publish) publish.disabled = false;
          }
        });
      }
    });

    const gridObserver = new MutationObserver(() => {
      grid.querySelectorAll('.admin-card').forEach(syncPhotoCard);
    });
    gridObserver.observe(grid, { childList: true, subtree: true });
  }

  syncUploadDestination();
})();