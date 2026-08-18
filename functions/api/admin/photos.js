const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};
const JOB_TYPES = new Set(['residential', 'commercial', 'federal']);
const SITE_IMAGES_ID = 'site-images';

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
    jobType: cleanType(meta.jobType),
    projectId: meta.projectId || '',
    published: meta.published === 'true',
    createdAt: meta.createdAt || object.uploaded?.toISOString?.() || '',
    uploadedBy: meta.uploadedBy || '',
    size: object.size || 0
  };
}

async function listPhotos(bucket) {
  let cursor;
  const objects = [];
  do {
    const page = await bucket.list({
      prefix: 'gallery/',
      limit: 1000,
      cursor,
      include: ['customMetadata', 'httpMetadata']
    });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return objects
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

  const requestedJobType = cleanType(form.get('jobType'));
  const projectId = clean(form.get('projectId'), 80);
  const siteImage = isSiteImages(projectId);
  const jobType = siteImage ? '' : requestedJobType;

  if (!projectId || (!siteImage && (!jobType || !await validateProject(context.env.GALLERY_BUCKET, projectId, jobType)))) {
    return json({ error: 'Choose a valid project for this job type.' }, 400);
  }

  const ext = MIME_EXTENSIONS[file.type];
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const key = `gallery/${fileName}`;
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
  if (!key.startsWith('gallery/')) return json({ error: 'Invalid photo key.' }, 400);

  const existing = await context.env.GALLERY_BUCKET.get(key);
  if (!existing || !('body' in existing)) return json({ error: 'Photo not found.' }, 404);

  const old = existing.customMetadata || {};
  const projectId = clean(body.projectId ?? old.projectId, 80);
  const siteImage = isSiteImages(projectId);
  const jobType = siteImage ? '' : cleanType(body.jobType ?? old.jobType);

  if (!siteImage && jobType && projectId && !await validateProject(context.env.GALLERY_BUCKET, projectId, jobType)) {
    return json({ error: 'Choose a valid project for this job type.' }, 400);
  }

  const updated = {
    ...old,
    title: clean(body.title ?? old.title, 120),
    category: siteImage ? 'Site Image' : (jobType ? jobType[0].toUpperCase() + jobType.slice(1) : (old.category || 'Project')),
    jobType,
    projectId,
    alt: clean(body.alt ?? old.alt, 180),
    published: String(siteImage ? false : body.published === true)
  };

  const bytes = await existing.arrayBuffer();
  const saved = await context.env.GALLERY_BUCKET.put(key, bytes, {
    httpMetadata: existing.httpMetadata,
    customMetadata: updated
  });

  if (!saved) return json({ error: 'Could not save changes.' }, 500);
  return json({ photo: toItem(saved) });
}

export async function onRequestDelete(context) {
  const body = await context.request.json();
  const key = clean(body.key, 300);
  if (!key.startsWith('gallery/')) return json({ error: 'Invalid photo key.' }, 400);
  await context.env.GALLERY_BUCKET.delete(key);
  return json({ ok: true });
}
