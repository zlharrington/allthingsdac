const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};

const SITE_IMAGE_TARGETS = {
  global: new Set(['siteLogo']),
  home: new Set(['service1Image', 'service2Image', 'service3Image', 'familyImage']),
  about: new Set(['ownerImage', 'team1Image', 'team2Image', 'team3Image', 'team4Image'])
};

const MOVABLE_PREFIXES = ['gallery/', 'commercial/', 'residential/', 'federal/'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}

function isMovableKey(key) {
  return MOVABLE_PREFIXES.some(prefix => key.startsWith(prefix));
}

async function readPageContent(bucket, page) {
  const object = await bucket.get(`site-content/${page}.json`);
  if (!object) return {};
  try {
    return JSON.parse(await object.text()) || {};
  } catch {
    return {};
  }
}

async function writePageContent(bucket, page, content, adminEmail) {
  const updatedAt = new Date().toISOString();
  await bucket.put(`site-content/${page}.json`, JSON.stringify(content), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
      cacheControl: 'no-store'
    },
    customMetadata: {
      page,
      updatedAt,
      updatedBy: clean(adminEmail, 80)
    }
  });
}

export async function onRequestPost(context) {
  if (!context.env.GALLERY_BUCKET) {
    return json({ error: 'Gallery storage is not configured.' }, 503);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid move request.' }, 400);
  }

  const key = clean(body.key);
  const page = clean(body.page, 80).toLowerCase();
  const field = clean(body.field, 80);

  if (!isMovableKey(key)) {
    return json({ error: 'Invalid gallery photo.' }, 400);
  }
  if (!SITE_IMAGE_TARGETS[page]?.has(field)) {
    return json({ error: 'Invalid site image destination.' }, 400);
  }

  const source = await context.env.GALLERY_BUCKET.get(key);
  if (!source || !('body' in source)) {
    return json({ error: 'Gallery photo not found.' }, 404);
  }

  const contentType = source.httpMetadata?.contentType || '';
  const ext = IMAGE_TYPES[contentType];
  if (!ext) {
    return json({ error: 'This gallery image type cannot be used as a site image.' }, 400);
  }

  const fileName = `${page}-${field}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const siteKey = `site-images/${fileName}`;
  const bytes = await source.arrayBuffer();

  await context.env.GALLERY_BUCKET.put(siteKey, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      title: source.customMetadata?.title || '',
      alt: source.customMetadata?.alt || '',
      category: 'Site Image',
      jobType: '',
      projectId: 'site-images',
      published: 'false',
      featured: 'false',
      createdAt: source.customMetadata?.createdAt || new Date().toISOString(),
      page,
      field,
      movedAt: new Date().toISOString(),
      movedBy: clean(context.data?.adminEmail, 80),
      sourceKey: key
    }
  });

  const url = `/site-media/${encodeURIComponent(fileName)}`;
  const content = await readPageContent(context.env.GALLERY_BUCKET, page);
  content[field] = url;
  await writePageContent(context.env.GALLERY_BUCKET, page, content, context.data?.adminEmail || '');
  await context.env.GALLERY_BUCKET.delete(key);

  return json({ ok: true, page, field, url });
}
