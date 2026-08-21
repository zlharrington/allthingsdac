(() => {
  const managed = document.getElementById('managedGallery');
  const archive = document.getElementById('instagramArchive');
  if (!managed) return;

  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function legacyRender(photos) {
    if (!photos.length) {
      managed.innerHTML = '<p class="photo-note">Project photos are being selected for this gallery.</p>';
      return;
    }
    managed.innerHTML = photos.map(photo => `<article class="managed-project"><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.alt)}" loading="lazy"><div><span class="eyebrow">${escapeHtml(photo.category || 'Project')}</span><h2>${escapeHtml(photo.title || 'Project photo')}</h2></div></article>`).join('');
    if (archive) archive.hidden = true;
  }

  fetch('/api/gallery')
    .then(async response => {
      if (!response.ok) throw new Error('Gallery unavailable');
      return response.json();
    })
    .then(({ photos = [] }) => legacyRender(photos))
    .catch(() => legacyRender([]));
})();
