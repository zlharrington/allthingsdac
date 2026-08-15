const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

function json(data, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
    },
  });
}

function clean(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function verifyAccessJwt(token, env) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed Access token');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson(encodedHeader);
  const payload = decodeJson(encodedPayload);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected signing algorithm');

  const teamDomain = String(env.ACCESS_TEAM_DOMAIN || '').replace(/\/$/, '');
  if (!teamDomain || !env.ACCESS_AUD) throw new Error('Access validation is not configured');

  const certsResponse = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
  if (!certsResponse.ok) throw new Error('Unable to load Access signing keys');
  const certs = await certsResponse.json();
  const jwk = (certs.keys || []).find((key) => key.kid === header.kid);
  if (!jwk) throw new Error('Signing key not found');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decodeBase64Url(encodedSignature),
    signedData,
  );
  if (!valid) throw new Error('Invalid Access token signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp <= now) throw new Error('Access token expired');
  if (payload.nbf && payload.nbf > now) throw new Error('Access token is not active');
  if (payload.iss !== teamDomain) throw new Error('Unexpected Access issuer');
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(env.ACCESS_AUD)) throw new Error('Unexpected Access audience');
  return payload;
}

async function requireAdmin(request, env) {
  const allowed = String(env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return { response: new Response('Owner access is not configured.', { status: 503 }) };

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return { response: new Response('Authentication required.', { status: 401 }) };

  try {
    const payload = await verifyAccessJwt(token, env);
    const email = String(payload.email || '').toLowerCase();
    if (!email || !allowed.includes(email)) {
      return { response: new Response('Not authorized.', { status: 403 }) };
    }
    return { email };
  } catch (error) {
    console.error(JSON.stringify({ event: 'owner_auth_failed', message: error instanceof Error ? error.message : String(error) }));
    return { response: new Response('Authentication failed.', { status: 403 }) };
  }
}

function toItem(object) {
  const meta = object.customMetadata || {};
  const file = object.key.slice('gallery/'.length);
  return {
    key: object.key,
    file,
    url: `/media/${encodeURIComponent(file)}`,
    title: meta.title || '',
    alt: meta.alt || '',
    category: meta.category || 'Project',
    published: meta.published === 'true',
    createdAt: meta.createdAt || object.uploaded?.toISOString?.() || '',
    uploadedBy: meta.uploadedBy || '',
    size: object.size || 0,
  };
}

async function listAllPhotos(bucket) {
  let cursor;
  const objects = [];
  do {
    const page = await bucket.list({
      prefix: 'gallery/',
      limit: 1000,
      cursor,
      include: ['customMetadata', 'httpMetadata'],
    });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return objects
    .sort((a, b) => String(b.customMetadata?.createdAt || '').localeCompare(String(a.customMetadata?.createdAt || '')))
    .map(toItem);
}

async function handlePublicGallery(env) {
  const photos = (await listAllPhotos(env.GALLERY_BUCKET))
    .filter((photo) => photo.published)
    .map(({ file, url, title, alt, category, createdAt }) => ({ file, url, title, alt, category, createdAt }));
  return json({ photos }, 200, 'public, max-age=60');
}

async function handleMedia(pathname, env) {
  const encoded = pathname.slice('/media/'.length);
  if (!encoded) return new Response('Not found', { status: 404 });

  let file;
  try {
    file = decodeURIComponent(encoded);
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (!file || file.includes('/') || file.includes('..')) return new Response('Not found', { status: 404 });

  const object = await env.GALLERY_BUCKET.get(`gallery/${file}`);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
}

async function handleAdminPhotos(request, env, adminEmail) {
  if (request.method === 'GET') {
    return json({ photos: await listAllPhotos(env.GALLERY_BUCKET) });
  }

  if (request.method === 'POST') {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.stream !== 'function') return json({ error: 'Choose an image to upload.' }, 400);
    if (!MIME_EXTENSIONS[file.type]) return json({ error: 'Use JPG, PNG, WebP, or AVIF images.' }, 400);
    if (file.size > MAX_FILE_BYTES) return json({ error: 'Images must be 15 MB or smaller.' }, 413);

    const ext = MIME_EXTENSIONS[file.type];
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const key = `gallery/${fileName}`;
    const title = clean(form.get('title'), 120);
    const category = clean(form.get('category'), 60) || 'Project';
    const alt = clean(form.get('alt'), 180) || title || 'All Things Drywall & Construction project photo';
    const published = String(form.get('published')) === 'true';
    const createdAt = new Date().toISOString();

    const object = await env.GALLERY_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: {
        title,
        category,
        alt,
        published: String(published),
        createdAt,
        uploadedBy: adminEmail,
      },
    });
    if (!object) return json({ error: 'Upload failed.' }, 500);
    return json({ photo: toItem(object) }, 201);
  }

  if (request.method === 'PATCH') {
    const body = await request.json();
    const key = clean(body.key, 300);
    if (!key.startsWith('gallery/')) return json({ error: 'Invalid photo key.' }, 400);

    const existing = await env.GALLERY_BUCKET.get(key);
    if (!existing) return json({ error: 'Photo not found.' }, 404);

    const old = existing.customMetadata || {};
    const updated = {
      ...old,
      title: clean(body.title ?? old.title, 120),
      category: clean(body.category ?? old.category, 60) || 'Project',
      alt: clean(body.alt ?? old.alt, 180),
      published: String(body.published === true),
    };

    const saved = await env.GALLERY_BUCKET.put(key, existing.body, {
      httpMetadata: existing.httpMetadata,
      customMetadata: updated,
    });
    if (!saved) return json({ error: 'Could not save changes.' }, 500);
    return json({ photo: toItem(saved) });
  }

  if (request.method === 'DELETE') {
    const body = await request.json();
    const key = clean(body.key, 300);
    if (!key.startsWith('gallery/')) return json({ error: 'Invalid photo key.' }, 400);
    await env.GALLERY_BUCKET.delete(key);
    return json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST, PATCH, DELETE' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/gallery' && request.method === 'GET') {
      return handlePublicGallery(env);
    }

    if (url.pathname.startsWith('/media/') && request.method === 'GET') {
      return handleMedia(url.pathname, env);
    }

    if (url.pathname === '/api/admin/photos') {
      const auth = await requireAdmin(request, env);
      if (auth.response) return auth.response;
      return handleAdminPhotos(request, env, auth.email);
    }

    return env.ASSETS.fetch(request);
  },
};
