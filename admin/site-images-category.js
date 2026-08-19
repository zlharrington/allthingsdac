(() => {
  const SITE_IMAGES = 'site-images';
  const categorySelect = document.getElementById('jobType');
  const projectSelect = document.getElementById('projectId');
  const projectField = document.getElementById('uploadProjectField') || projectSelect?.closest('label');
  const published = document.getElementById('published');
  const grid = document.getElementById('photoGrid');
  const form = document.getElementById('uploadForm');
  const fileInput = document.getElementById('files');
  const status = document.getElementById('status');
  const titleInput = document.getElementById('title');
  const altInput = document.getElementById('alt');
  const fileSelectionStatus = document.getElementById('fileSelectionStatus');

  if (!categorySelect || !projectSelect || !published || !form || !fileInput) return;

  function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

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

  async function parseResponse(response) {
    const text = await response.text();
    let data = {};
    if (text) {
      try { data = JSON.parse(text); }
      catch { data = { error: text.trim() }; }
    }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function uploadSiteImages(event) {
    if (categorySelect.value !== SITE_IMAGES) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const files = [...fileInput.files];
    if (!files.length) {
      setStatus('Choose one or more photos first.', true);
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    const title = titleInput?.value || '';
    const alt = altInput?.value || '';
    let completed = 0;
    let uploaded = 0;
    const failed = [];

    if (submit) submit.disabled = true;
    fileInput.disabled = true;
    categorySelect.disabled = true;
    projectSelect.disabled = true;
    published.disabled = true;

    try {
      setStatus(`Uploading 0 of ${files.length} to Site Images…`);
      for (const file of files) {
        const body = new FormData();
        body.set('file', file);
        body.set('title', title);
        body.set('alt', alt);
        body.set('jobType', SITE_IMAGES);
        body.set('projectId', SITE_IMAGES);
        body.set('published', 'false');
        try {
          await parseResponse(await fetch('/api/admin/photos', { method: 'POST', body }));
          uploaded++;
        } catch (error) {
          failed.push(`${file.name}: ${error.message}`);
        } finally {
          completed++;
          setStatus(`Uploading ${completed} of ${files.length} · ${uploaded} successful${failed.length ? ` · ${failed.length} failed` : ''}`, failed.length > 0);
        }
      }

      fileInput.value = '';
      if (fileSelectionStatus) fileSelectionStatus.textContent = 'No photos selected.';
      if (titleInput) titleInput.value = '';
      if (altInput) altInput.value = '';

      if (failed.length) {
        setStatus(`${uploaded} of ${files.length} photos uploaded. ${failed.length} failed: ${failed.slice(0, 3).join(' | ')}`, true);
      } else {
        setStatus(`${uploaded} photo${uploaded === 1 ? '' : 's'} uploaded successfully to Site Images.`);
      }

      document.getElementById('refresh')?.click();
    } finally {
      if (submit) submit.disabled = false;
      fileInput.disabled = false;
      categorySelect.disabled = false;
      projectSelect.disabled = false;
      syncUploadDestination();
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

  form.addEventListener('submit', uploadSiteImages, true);
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