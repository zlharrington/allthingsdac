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

  function ProjectCard({ photo }) {
    return React.createElement('article', { className: 'managed-project' },
      React.createElement('img', {
        src: photo.url,
        alt: photo.alt || '',
        loading: 'lazy'
      }),
      React.createElement('div', null,
        React.createElement('span', { className: 'eyebrow' }, photo.category || 'Project'),
        React.createElement('h2', null, photo.title || 'Project photo')
      )
    );
  }

  function ProjectGallery({ photos }) {
    if (!photos.length) return React.createElement('p', { className: 'photo-note' }, 'Project photos are being selected for this gallery.');
    return React.createElement(React.Fragment, null,
      ...photos.map((photo, index) => React.createElement(ProjectCard, {
        key: photo.id || photo.url || index,
        photo
      }))
    );
  }

  fetch('/api/gallery')
    .then(async response => {
      if (!response.ok) throw new Error('Gallery unavailable');
      return response.json();
    })
    .then(async ({ photos = [] }) => {
      const reactReady = window.allThingsReactReady ? await window.allThingsReactReady : false;
      if (!reactReady || !window.React || !window.ReactDOM) {
        legacyRender(photos);
        return;
      }
      ReactDOM.createRoot(managed).render(React.createElement(ProjectGallery, { photos }));
      if (photos.length && archive) archive.hidden = true;
    })
    .catch(() => legacyRender([]));
})();
