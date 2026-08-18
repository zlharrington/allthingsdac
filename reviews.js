(() => {
  const status = document.querySelector('[data-reviews-status]');
  const grid = document.querySelector('[data-reviews-grid]');
  const summary = document.querySelector('[data-reviews-summary]');
  const averageEl = document.querySelector('[data-average-rating]');
  const totalEl = document.querySelector('[data-total-reviews]');
  const summaryStars = document.querySelector('[data-summary-stars]');
  const reviewLinks = document.querySelectorAll('[data-google-review-link]');

  if (!status || !grid) return;

  const fallbackGoogleUrl = 'https://www.google.com/maps/search/?api=1&query=All%20Things%20Drywall%20%26%20Construction%20Pasco%20WA';

  function stars(rating) {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
  }

  function setGoogleLinks(url) {
    const href = url || fallbackGoogleUrl;
    reviewLinks.forEach(link => { link.href = href; });
  }

  function showStatus(title, message) {
    status.hidden = false;
    status.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = message;
    status.append(strong, span);
  }

  function renderReview(review) {
    const article = document.createElement('article');
    article.className = 'review-card';

    const top = document.createElement('div');
    top.className = 'review-card-top';

    const identity = document.createElement('div');
    identity.className = 'reviewer-identity';

    if (review.profilePhotoUrl) {
      const img = document.createElement('img');
      img.className = 'reviewer-photo';
      img.src = review.profilePhotoUrl;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      identity.appendChild(img);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'reviewer-photo reviewer-photo-fallback';
      fallback.setAttribute('aria-hidden', 'true');
      fallback.textContent = (review.reviewerName || 'G').trim().charAt(0).toUpperCase() || 'G';
      identity.appendChild(fallback);
    }

    const identityText = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = review.reviewerName || 'Google reviewer';
    const meta = document.createElement('span');
    meta.className = 'review-meta';
    meta.textContent = formatDate(review.updateTime || review.createTime);
    identityText.append(name, meta);
    identity.appendChild(identityText);

    const googleBadge = document.createElement('span');
    googleBadge.className = 'google-badge';
    googleBadge.textContent = 'Google';
    top.append(identity, googleBadge);

    const rating = document.createElement('div');
    rating.className = 'review-stars';
    rating.setAttribute('aria-label', `${review.rating} out of 5 stars`);
    rating.textContent = stars(review.rating);

    article.append(top, rating);

    if (review.comment) {
      const comment = document.createElement('p');
      comment.className = 'review-comment';
      comment.textContent = review.comment;
      article.appendChild(comment);
    } else {
      const comment = document.createElement('p');
      comment.className = 'review-comment review-rating-only';
      comment.textContent = 'This customer left a star rating without a written review.';
      article.appendChild(comment);
    }

    return article;
  }

  async function loadReviews() {
    try {
      const response = await fetch('/api/google-reviews', { headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));

      setGoogleLinks(data.reviewUrl);

      if (!response.ok || data.configured === false) {
        showStatus('Google reviews are being connected.', 'The reviews page is ready. Google Business Profile authorization still needs to be completed before live reviews can appear here.');
        return;
      }

      const reviews = Array.isArray(data.reviews) ? data.reviews : [];
      if (!reviews.length) {
        showStatus('No Google reviews to display yet.', 'When customers leave reviews on Google, they will appear here automatically.');
        return;
      }

      status.hidden = true;
      grid.replaceChildren(...reviews.map(renderReview));

      if (summary) summary.hidden = false;
      if (averageEl) averageEl.textContent = Number(data.averageRating || 0).toFixed(1);
      if (totalEl) totalEl.textContent = Number(data.totalReviewCount || reviews.length).toLocaleString('en-US');
      if (summaryStars) {
        summaryStars.textContent = stars(data.averageRating);
        summaryStars.setAttribute('aria-label', `${Number(data.averageRating || 0).toFixed(1)} out of 5 stars on Google`);
      }
    } catch (error) {
      console.error('Google reviews could not be loaded.', error);
      setGoogleLinks();
      showStatus('Google reviews are temporarily unavailable.', 'You can still visit our Google profile to read or leave a review.');
    }
  }

  loadReviews();
})();
