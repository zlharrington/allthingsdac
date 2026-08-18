const grid = document.getElementById('photoGrid');
const statusEl = document.getElementById('status');
const projectStatus = document.getElementById('projectStatus');
const form = document.getElementById('uploadForm');
const projectForm = document.getElementById('projectForm');
const projectList = document.getElementById('projectList');
const refresh = document.getElementById('refresh');
const jobTypeSelect = document.getElementById('jobType');
const projectSelect = document.getElementById('projectId');
const fileInput = document.getElementById('files');
const fileSelectionStatus = document.getElementById('fileSelectionStatus');
const publishedInput = document.getElementById('published');

const SITE_IMAGES_ID = 'site-images';
const SITE_IMAGES_NAME = 'Site Images (Private)';
let projects = [];

function setStatus(message, isError = false, target = statusEl) {
  target.textContent = message;
  target.classList.toggle('error', isError);
}

async function parseResponse(response) {
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.trim() };
    }
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function photoApi(options = {}) {
  return parseResponse(await fetch('/api/admin/photos', options));
}

async function projectApi(options = {}) {
  return parseResponse(await fetch('/api/admin/projects', options));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));
}

function labelType(type = '') {
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unassigned';
}

function isSiteImages(projectId) {
  return projectId === SITE_IMAGES_ID;
}

function projectOptions(jobType, selected = '') {
  const matches = projects.filter(project => project.jobType === jobType);
  const emptyLabel = matches.length ? 'Choose project' : 'Choose destination';
  const siteSelected = isSiteImages(selected) ? ' selected' : '';
  const projectOptionsHtml = matches.map(project =>
    `<option value="${escapeHtml(project.id)}"${project.id === selected ? ' selected' : ''}>${escapeHtml(project.name)}</option>`
  ).join('');

  return `<option value="">${emptyLabel}</option>` +
    `<option value="${SITE_IMAGES_ID}"${siteSelected}>${SITE_IMAGES_NAME}</option>` +
    projectOptionsHtml;
}

function syncSiteImageUploadState() {
  const siteImagesSelected = isSiteImages(projectSelect.value);
  publishedInput.disabled = siteImagesSelected;
  if (siteImagesSelected) publishedInput.checked = false;
}

function syncUploadProjects() {
  projectSelect.innerHTML = projectOptions(jobTypeSelect.value, projectSelect.value);
  syncSiteImageUploadState();
}

function renderProjectList() {
  if (!projects.length) {
    projectList.innerHTML = '<p>No projects yet. Create the first project above.</p>';
    return;
  }

  projectList.innerHTML = projects.map(project => `
    <article class="project-row" data-project-id="${escapeHtml(project.id)}">
      <div class="project-summary">
        <span class="project-type ${escapeHtml(project.jobType)}">${escapeHtml(labelType(project.jobType))}</span>
        <strong>${escapeHtml(project.name)}</strong>
        ${project.description ? `<small>${escapeHtml(project.description)}</small>` : '<small>No description</small>'}
      </div>
      <div class="admin-card-actions">
        <a href="../${escapeHtml(project.jobType)}.html" target="_blank" rel="noopener">View page</a>
        <button class="btn btn-outline edit-project" type="button">Edit project</button>
        <button class="btn btn-danger delete-project" type="button">Delete project</button>
      </div>
    </article>
  `).join('');
}

function renderProjectEditor(row, project) {
  row.innerHTML = `
    <form class="project-edit-form">
      <div class="project-edit-fields">
        <label>Project name<input class="edit-project-name" type="text" maxlength="120" value="${escapeHtml(project.name)}" required></label>
        <label>Description<input class="edit-project-description" type="text" maxlength="240" value="${escapeHtml(project.description || '')}" placeholder="Optional project summary"></label>
      </div>
      <div class="project-edit-meta">
        <span class="project-type ${escapeHtml(project.jobType)}">${escapeHtml(labelType(project.jobType))}</span>
        <div class="admin-card-actions">
          <button class="btn btn-dark save-project" type="submit">Save changes</button>
          <button class="btn btn-outline cancel-project-edit" type="button">Cancel</button>
        </div>
      </div>
    </form>`;
  row.querySelector('.edit-project-name').focus();
}

async function loadProjects() {
  try {
    const data = await projectApi();
    projects = data.projects || [];
    renderProjectList();
    syncUploadProjects();
  } catch (error) {
    projectList.innerHTML = '<p>Could not load projects.</p>';
    setStatus(error.message, true, projectStatus);
  }
}

function photoCard(photo) {
  const siteImage = isSiteImages(photo.projectId);
  const jobType = siteImage ? '' : (photo.jobType || '');
  return `
    <article class="admin-card" data-key="${escapeHtml(photo.key)}">
      <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.alt)}" loading="lazy">
      <div class="admin-card-body">
        <label>Photo label<input class="edit-title" maxlength="120" value="${escapeHtml(photo.title)}"></label>
        <label>Job type<select class="edit-job-type">
          <option value="">Unassigned</option>
          ${['commercial', 'residential', 'federal'].map(v => `<option value="${v}"${jobType === v ? ' selected' : ''}>${labelType(v)}</option>`).join('')}
        </select></label>
        <label>Project<select class="edit-project">${projectOptions(jobType, photo.projectId || '')}</select></label>
        <label>Alt text<input class="edit-alt" maxlength="180" value="${escapeHtml(photo.alt)}"></label>
        <label class="check-row"><input class="edit-published" type="checkbox"${photo.published ? ' checked' : ''}${siteImage ? ' disabled' : ''}> Show on public gallery</label>
        <div class="admin-card-actions">
          <button class="btn btn-dark save-photo" type="button">Save</button>
          <button class="btn btn-danger delete-photo" type="button">Delete</button>
        </div>
      </div>
    </article>`;
}

async function loadPhotos() {
  grid.innerHTML = '<p>Loading photos…</p>';
  try {
    const data = await photoApi();
    grid.innerHTML = data.photos.length ? data.photos.map(photoCard).join('') : '<p>No photos uploaded yet.</p>';
  } catch (error) {
    grid.innerHTML = '<p>Could not load photos.</p>';
    setStatus(error.message, true);
  }
}

function updateFileSelectionStatus() {
  const files = [...fileInput.files];
  if (!files.length) {
    fileSelectionStatus.textContent = 'No photos selected.';
    return;
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const totalMb = (totalBytes / 1024 / 1024).toFixed(totalBytes >= 10 * 1024 * 1024 ? 1 : 2);
  fileSelectionStatus.textContent = `${files.length} photo${files.length === 1 ? '' : 's'} selected · ${totalMb} MB total`;
}

fileInput.addEventListener('change', updateFileSelectionStatus);

projectForm.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = projectForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    setStatus('Creating project…', false, projectStatus);
    const data = await projectApi({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('projectName').value,
        jobType: document.getElementById('projectJobType').value,
        description: document.getElementById('projectDescription').value
      })
    });
    projectForm.reset();
    document.getElementById('projectJobType').value = 'commercial';
    setStatus(`Created ${data.project.name}.`, false, projectStatus);
    await loadProjects();
    jobTypeSelect.value = data.project.jobType;
    syncUploadProjects();
    projectSelect.value = data.project.id;
    syncSiteImageUploadState();
  } catch (error) {
    setStatus(error.message, true, projectStatus);
  } finally {
    submit.disabled = false;
  }
});

projectList.addEventListener('click', async event => {
  const row = event.target.closest('.project-row');
  if (!row) return;
  const id = row.dataset.projectId;
  const project = projects.find(item => item.id === id);
  if (!project) return;

  if (event.target.closest('.edit-project')) {
    renderProjectEditor(row, project);
    return;
  }
  if (event.target.closest('.cancel-project-edit')) {
    renderProjectList();
    return;
  }

  const deleteButton = event.target.closest('.delete-project');
  if (!deleteButton) return;
  if (!confirm(`Delete project "${project.name}"?\n\nThis only works when no photos are assigned to it.`)) return;
  deleteButton.disabled = true;
  try {
    setStatus(`Deleting ${project.name}…`, false, projectStatus);
    await projectApi({
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (projectSelect.value === id) projectSelect.value = '';
    setStatus(`Deleted ${project.name}.`, false, projectStatus);
    await loadProjects();
    await loadPhotos();
  } catch (error) {
    setStatus(error.message, true, projectStatus);
  } finally {
    deleteButton.disabled = false;
  }
});

projectList.addEventListener('submit', async event => {
  const editForm = event.target.closest('.project-edit-form');
  if (!editForm) return;
  event.preventDefault();
  const row = editForm.closest('.project-row');
  const id = row?.dataset.projectId;
  const project = projects.find(item => item.id === id);
  if (!project) return;
  const submit = editForm.querySelector('.save-project');
  submit.disabled = true;
  const name = editForm.querySelector('.edit-project-name').value.trim();
  const description = editForm.querySelector('.edit-project-description').value.trim();
  if (!name) {
    setStatus('Project name is required.', true, projectStatus);
    submit.disabled = false;
    return;
  }
  try {
    setStatus(`Saving ${project.name}…`, false, projectStatus);
    const data = await projectApi({
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, name, description })
    });
    setStatus(`Saved ${data.project.name}.`, false, projectStatus);
    await loadProjects();
    await loadPhotos();
  } catch (error) {
    setStatus(error.message, true, projectStatus);
    submit.disabled = false;
  }
});

jobTypeSelect.addEventListener('change', () => {
  if (!isSiteImages(projectSelect.value)) projectSelect.value = '';
  syncUploadProjects();
});

projectSelect.addEventListener('change', syncSiteImageUploadState);

form.addEventListener('submit', async event => {
  event.preventDefault();
  const files = [...fileInput.files];
  if (!files.length) {
    setStatus('Choose one or more photos first.', true);
    return;
  }
  if (!projectSelect.value) {
    setStatus('Choose a project or Site Images before uploading.', true);
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  const jobType = jobTypeSelect.value;
  const projectId = projectSelect.value;
  const siteImages = isSiteImages(projectId);
  const title = document.getElementById('title').value;
  const alt = document.getElementById('alt').value;
  const published = siteImages ? false : publishedInput.checked;
  const project = projects.find(item => item.id === projectId);
  const destinationName = siteImages ? 'Site Images' : (project?.name || 'project');
  let nextIndex = 0;
  let completed = 0;
  let uploaded = 0;
  const failed = [];

  submit.disabled = true;
  fileInput.disabled = true;
  jobTypeSelect.disabled = true;
  projectSelect.disabled = true;
  publishedInput.disabled = true;

  try {
    setStatus(`Uploading 0 of ${files.length} to ${destinationName}…`);
    async function uploadWorker() {
      while (true) {
        const index = nextIndex++;
        if (index >= files.length) return;
        const file = files[index];
        const body = new FormData();
        body.set('file', file);
        body.set('title', title);
        body.set('jobType', jobType);
        body.set('projectId', projectId);
        body.set('alt', alt);
        body.set('published', String(published));
        try {
          await photoApi({ method: 'POST', body });
          uploaded++;
        } catch (error) {
          failed.push(`${file.name}: ${error.message}`);
        } finally {
          completed++;
          setStatus(`Uploading ${completed} of ${files.length} · ${uploaded} successful${failed.length ? ` · ${failed.length} failed` : ''}`);
        }
      }
    }

    const concurrency = Math.min(3, files.length);
    await Promise.all(Array.from({ length: concurrency }, () => uploadWorker()));
    fileInput.value = '';
    updateFileSelectionStatus();
    document.getElementById('title').value = '';
    document.getElementById('alt').value = '';

    if (failed.length) {
      const sample = failed.slice(0, 3).join(' | ');
      setStatus(`${uploaded} of ${files.length} photos uploaded. ${failed.length} failed${sample ? `: ${sample}` : ''}`, true);
    } else {
      setStatus(`${uploaded} photo${uploaded === 1 ? '' : 's'} uploaded successfully to ${destinationName}.`);
    }
    await loadPhotos();
  } finally {
    submit.disabled = false;
    fileInput.disabled = false;
    jobTypeSelect.disabled = false;
    projectSelect.disabled = false;
    syncSiteImageUploadState();
  }
});

grid.addEventListener('change', event => {
  const card = event.target.closest('.admin-card');
  if (!card) return;

  if (event.target.matches('.edit-job-type')) {
    const type = event.target.value;
    const select = card.querySelector('.edit-project');
    select.innerHTML = projectOptions(type, '');
    card.querySelector('.edit-published').disabled = false;
  }

  if (event.target.matches('.edit-project')) {
    const siteImage = isSiteImages(event.target.value);
    const published = card.querySelector('.edit-published');
    if (siteImage) {
      card.querySelector('.edit-job-type').value = '';
      published.checked = false;
      published.disabled = true;
    } else {
      published.disabled = false;
    }
  }
});

grid.addEventListener('click', async event => {
  const card = event.target.closest('.admin-card');
  if (!card) return;
  const key = card.dataset.key;

  if (event.target.closest('.save-photo')) {
    const selectedProjectId = card.querySelector('.edit-project').value;
    const siteImage = isSiteImages(selectedProjectId);
    const jobType = siteImage ? '' : card.querySelector('.edit-job-type').value;
    const projectId = selectedProjectId;

    if (!siteImage && ((jobType && !projectId) || (!jobType && projectId))) {
      setStatus('Choose both a job type and project, choose Site Images, or leave both unassigned.', true);
      return;
    }

    try {
      setStatus('Saving…');
      await photoApi({
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key,
          title: card.querySelector('.edit-title').value,
          jobType,
          projectId,
          alt: card.querySelector('.edit-alt').value,
          published: siteImage ? false : card.querySelector('.edit-published').checked
        })
      });
      setStatus('Saved.');
      if (siteImage) await loadPhotos();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  if (event.target.closest('.delete-photo')) {
    if (!confirm('Delete this photo permanently?')) return;
    try {
      setStatus('Deleting…');
      await photoApi({
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key })
      });
      card.remove();
      setStatus('Photo deleted.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }
});

refresh.addEventListener('click', async () => {
  await loadProjects();
  await loadPhotos();
});

loadProjects().then(loadPhotos);
