const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};
const JOB_TYPES = new Set(['residential', 'commercial', 'federal']);
const SITE_IMAGES_ID = 'site-images';
const GALLERY_PREFIX = 'gallery/';
const SITE_IMAGES_PREFIX = 'site-images/';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

function cleanType(value) {
  const type = clean(value, 40).toLowerCase();
  return JOB_TYPES.has(type) ? type : '';
}

function isSiteImages(projectId) {
  return projectId === SITE_IMAGES_ID;
}

function isSupportedPhotoKey(key) {
  return key.startsWith(GALLERY_PREFIX) || key.startsWith(SITE_IMAGES_PREFIX);
}

function fileFromKey(key) {
  return key.startsWith(SITE_IMAGES_PREFIX)
    ? key.slice(SITE_IMAGES_PREFIX.length)
    : key.slice(GALLERY_PREFIX.length);
}

function toItem(object) {
  const meta = object.customMetadata || {};
  const storedAsSiteImage = object.key.startsWith(SITE_IMAGES_PREFIX);
  const file = fileFromKey(object.key);
  const projectId = storedAsSiteImage ? SITE_IMAGES_ID : (meta.projectId || '');
  return {
    key: object.key,
    file,
    url: storedAsSiteImage ? `/site-media/${encodeURIComponent(file)}` : `/media/${encodeURIComponent(file)}`,
    title: meta.title || '',
    alt: meta.alt || '',
    category: storedAsSiteImage ? 'Site Image' : (meta.category || 'Project'),
    jobType: storedAsSiteImage ? '' : cleanType(meta.jobType),
    projectId,
    published: storedAsSiteImage ? false : meta.published === 'true',
    featured: storedAsSiteImage ? false : meta.featured === 'true',
    createdAt: meta.createdAt || object.uploaded?.toISOString?.() || '',
    uploadedBy: meta.uploadedBy || '',
    size: object.size || 0
  };
}

async function listObjectsWithPrefix(bucket, prefix) {
  let cursor;
  const objects = [];
  do {
    const page = await bucket.list({
      prefix,
      limit: 1000,
      cursor,
      include: ['customMetadata', 'httpMetadata']
    });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return objects;
}

async function listPhotoObjects(bucket) {
  const [galleryObjects, siteImageObjects] = await Promise.all([
    listObjectsWithPrefix(bucket, GALLERY_PREFIX),
    listObjectsWithPrefix(bucket, SITE_IMAGES_PREFIX)
  ]);
  return [...galleryObjects, ...siteImageObjects];
}

async function listPhotos(bucket) {
  return (await listPhotoObjects(bucket))
    .sort((a, b) => String(b.customMetadata?.createdAt || '').localeCompare(String(a.customMetadata?.createdAt || '')))
    .map(toItem);
}

async function validateProject(bucket, projectId, jobType) {
  if (!projectId) return false;
  if (isSiteImages(projectId)) return true;
  const project = await bucket.head(`projects/${projectId}.json`);
  if (!project) return false;
  return cleanType(project.customMetadata?.jobType) === jobType;
}

async function clearFeaturedForProject(bucket, projectId, exceptKey) {
  if (!projectId || isSiteImages(projectId)) return;
  const objects = await listObjectsWithPrefix(bucket, GALLERY_PREFIX);
  const matches = objects.filter(object => {
    const meta = object.customMetadata || {};
    return object.key !== exceptKey && meta.projectId === projectId && meta.featured === 'true';
  });

  for (const object of matches) {
    const existing = await bucket.get(object.key);
    if (!existing || !('body' in existing)) continue;
    const bytes = await existing.arrayBuffer();
    await bucket.put(object.key, bytes, {
      httpMetadata: existing.httpMetadata,
      customMetadata: { ...(existing.customMetadata || {}), featured: 'false' }
    });
  }
}

export async function onRequestGet(context) {
  return json({ photos: await listPhotos(context.env.GALLERY_BUCKET) });
}

export async function onRequestPost(context) {
  const form = await context.request.formData();
  const file = form.get('file');

  if (!file || typeof file.stream !== 'function') {
    return json({ error: 'Choose an image to upload.' }, 400);
  }
  if (!MIME_EXTENSIONS[file.type]) {
    return json({ error: 'Use JPG, PNG, WebP, or AVIF images.' }, 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    return json({ error: 'Images must be 15 MB or smaller.' }, 413);
  }

  const rawCategory = clean(form.get('jobType'), 40).toLowerCase();
  const requestedProjectId = clean(form.get('projectId'), 80);
  const siteImage = rawCategory === SITE_IMAGES_ID || isSiteImages(requestedProjectId);
  const projectId = siteImage ? SITE_IMAGES_ID : requestedProjectId;
  const jobType = siteImage ? '' : cleanType(rawCategory);

  if (!siteImage && (!projectId || !jobType || !await validateProject(context.env.GALLERY_BUCKET, projectId, jobType))) {
    return json({ error: 'Choose a valid project for this category.' }, 400);
  }

  const ext = MIME_EXTENSIONS[file.type];
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const key = `${siteImage ? SITE_IMAGES_PREFIX : GALLERY_PREFIX}${fileName}`;
  const title = clean(form.get('title'), 120);
  const alt = clean(form.get('alt'), 180) || title || 'All Things Drywall & Construction site image';
  const published = siteImage ? false : String(form.get('published')) === 'true';
  const createdAt = new Date().toISOString();
  const category = siteImage ? 'Site Image' : jobType[0].toUpperCase() + jobType.slice(1);

  const object = await context.env.GALLERY_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      title,
      category,
      jobType,
      projectId,
      alt,
      published: String(published),
      featured: 'false',
      createdAt,
      uploadedBy: context.data.adminEmail || ''
    }
  });

  if (!object) return json({ error: 'Upload failed.' }, 500);
  return json({ photo: toItem(object) }, 201);
}

export async function onRequestPatch(context) {
  const body = await context.request.json();
  const key = clean(body.key, 300);
  if (!isSupportedPhotoKey(key)) return json({ error: 'Invalid photo key.' }, 400);

  const existing = await context.env.GALLERY_BUCKET.get(key);
  if (!existing || !('body' in existing)) return json({ error: 'Photo not found.' }, 404);

  const old = existing.customMetadata || {};
  const rawType = clean(body.jobType ?? old.jobType, 40).toLowerCase();
  const requestedProjectId = clean(body.projectId ?? old.projectId, 80);
  const destinationWasExplicit = body.jobType !== undefined || body.projectId !== undefined;
  const siteImage = destinationWasExplicit
    ? (rawType === SITE_IMAGES_ID || isSiteImages(requestedProjectId))
    : (key.startsWith(SITE_IMAGES_PREFIX) || isSiteImages(old.projectId));
  const projectId = siteImage ? SITE_IMAGES_ID : requestedProjectId;
  const jobType = siteImage ? '' : cleanType(rawType);

  if (!siteImage && jobType && projectId && !await validateProject(context.env.GALLERY_BUCKET, projectId, jobType)) {
    return json({ error: 'Choose a valid project for this category.' }, 400);
  }

  const requestedFeatured = body.featured === undefined ? old.featured === 'true' : body.featured === true;
  const featured = !siteImage && Boolean(projectId) && requestedFeatured;
  if (featured) await clearFeaturedForProject(context.env.GALLERY_BUCKET, projectId, key);

  const updated = {
    ...old,
    title: clean(body.title ?? old.title, 120),
    category: siteImage ? 'Site Image' : (jobType ? jobType[0].toUpperCase() + jobType.slice(1) : (old.category || 'Project')),
    jobType,
    projectId,
    alt: clean(body.alt ?? old.alt, 180),
    published: String(siteImage ? false : (body.published === undefined ? old.published === 'true' : body.published === true)),
    featured: String(featured)
  };

  const bytes = await existing.arrayBuffer();
  const fileName = fileFromKey(key);
  const targetKey = `${siteImage ? SITE_IMAGES_PREFIX : GALLERY_PREFIX}${fileName}`;
  const saved = await context.env.GALLERY_BUCKET.put(targetKey, bytes, {
    httpMetadata: existing.httpMetadata,
    customMetadata: updated
  });

  if (!saved) return json({ error: 'Could not save changes.' }, 500);
  if (targetKey !== key) await context.env.GALLERY_BUCKET.delete(key);
  return json({ photo: toItem(saved) });
}

export async function onRequestDelete(context) {
  const body = await context.request.json();
  const key = clean(body.key, 300);
  if (!isSupportedPhotoKey(key)) return json({ error: 'Invalid photo key.' }, 400);
  await context.env.GALLERY_BUCKET.delete(key);
  return json({ ok: true });
}
