const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};

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

export async function onRequestPost(context) {
  if (!context.env.GALLERY_BUCKET) return json({ error: 'Gallery storage is not configured.' }, 503);

  const form = await context.request.formData();
  const file = form.get('file');
  if (!file || typeof file.stream !== 'function') return json({ error: 'Choose an image to upload.' }, 400);
  if (!MIME_EXTENSIONS[file.type]) return json({ error: 'Use JPG, PNG, WebP, or AVIF images.' }, 400);
  if (file.size > MAX_FILE_BYTES) return json({ error: 'Images must be 15 MB or smaller.' }, 413);

  const ext = MIME_EXTENSIONS[file.type];
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const key = `site-images/${fileName}`;
  const title = clean(form.get('title'), 120);
  const alt = clean(form.get('alt'), 180) || title || 'All Things Drywall & Construction site image';
  const createdAt = new Date().toISOString();

  const object = await context.env.GALLERY_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      title,
      alt,
      category: 'Site Image',
      jobType: '',
      projectId: 'site-images',
      published: 'false',
      featured: 'false',
      createdAt,
      uploadedBy: context.data?.adminEmail || ''
    }
  });

  if (!object) return json({ error: 'Upload failed.' }, 500);
  return json({
    photo: {
      key,
      file: fileName,
      url: `/site-media/${encodeURIComponent(fileName)}`,
      title,
      alt,
      category: 'Site Image',
      jobType: '',
      projectId: 'site-images',
      published: false,
      featured: false,
      createdAt,
      size: object.size || file.size || 0
    }
  }, 201);
}
