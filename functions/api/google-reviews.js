const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function ratingToNumber(value) {
  const ratings = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return ratings[value] || Number(value) || 0;
}

async function getAccessToken(env) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Google OAuth refresh failed (${response.status})`);
  }
  return data.access_token;
}

export async function onRequestGet({ env, request }) {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_BUSINESS_ACCOUNT_ID',
    'GOOGLE_BUSINESS_LOCATION_ID'
  ];

  const missing = required.filter(key => !env[key]);
  const reviewUrl = env.GOOGLE_REVIEW_URL || '';

  if (missing.length) {
    return json({
      configured: false,
      reviewUrl,
      missing
    });
  }

  try {
    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.search = '';
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const accessToken = await getAccessToken(env);
    const accountId = encodeURIComponent(env.GOOGLE_BUSINESS_ACCOUNT_ID);
    const locationId = encodeURIComponent(env.GOOGLE_BUSINESS_LOCATION_ID);
    const endpoint = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=updateTime%20desc`;

    const response = await fetch(endpoint, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Google Business Profile reviews request failed.', response.status, data?.error?.message || 'Unknown error');
      return json({ configured: true, error: 'Google reviews are temporarily unavailable.', reviewUrl }, 502);
    }

    const reviews = (data.reviews || []).map(review => ({
      id: review.reviewId,
      reviewerName: review.reviewer?.displayName || 'Google reviewer',
      profilePhotoUrl: review.reviewer?.profilePhotoUrl || '',
      rating: ratingToNumber(review.starRating),
      comment: review.comment || '',
      createTime: review.createTime || '',
      updateTime: review.updateTime || ''
    }));

    const result = json({
      configured: true,
      reviewUrl,
      averageRating: Number(data.averageRating || 0),
      totalReviewCount: Number(data.totalReviewCount || reviews.length),
      reviews
    });

    await cache.put(cacheKey, result.clone());
    return result;
  } catch (error) {
    console.error('Google reviews function error.', error);
    return json({ configured: true, error: 'Google reviews are temporarily unavailable.', reviewUrl }, 502);
  }
}
