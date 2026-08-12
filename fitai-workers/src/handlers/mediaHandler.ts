/**
 * FitAI Workers - Media Handler
 *
 * Serves media files from Cloudflare R2 bucket:
 * - Exercise GIFs (cached from exercisedb.dev)
 * - Diet/meal images
 * - User-uploaded content (progress photos, profile pictures)
 */

import { Context } from 'hono';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import { APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

// ============================================================================
// MEDIA TYPES AND CONFIGURATION
// ============================================================================

/**
 * Supported media types and their content types.
 * SVG is intentionally excluded — SVGs can embed <script> and this route is
 * served publicly/unauthenticated, which would allow stored XSS via a
 * malicious upload rendered inline in a browser.
 */
const MEDIA_TYPES: Record<string, string> = {
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Content types blocked at upload time even though they may otherwise look
 * like an "image/*" MIME type (e.g. SVG, which can execute inline script).
 */
const BLOCKED_UPLOAD_CONTENT_TYPES = new Set(['image/svg+xml']);

/**
 * Cache configuration for different media types
 */
const CACHE_DURATIONS = {
  exercise: 31536000, // 1 year (exercise GIFs never change)
  diet: 86400, // 1 day (diet images may update)
  user: 3600, // 1 hour (user content may change frequently)
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get content type from file extension
 */
function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? MEDIA_TYPES[extension] || 'application/octet-stream' : 'application/octet-stream';
}

/**
 * Get cache duration based on media category
 */
function getCacheDuration(category: string): number {
  if (category.startsWith('exercise')) return CACHE_DURATIONS.exercise;
  if (category.startsWith('diet')) return CACHE_DURATIONS.diet;
  if (category.startsWith('user')) return CACHE_DURATIONS.user;
  return CACHE_DURATIONS.diet; // Default
}

// ============================================================================
// MAIN HANDLERS
// ============================================================================

/**
 * GET /media/:category/:id - Serve media file from R2
 * Category: exercise, diet, user
 * ID: unique identifier (e.g., exerciseId, mealId, userId)
 */
export async function handleMediaServe(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Get parameters
    const category = c.req.param('category');
    const id = c.req.param('id');

    if (!category || !id) {
      throw new APIError(
        'Missing category or ID parameter',
        400,
        ErrorCode.INVALID_PARAMETER
      );
    }

    console.log('[Media] Serving request:', { category, id });

    // 2. Construct R2 key
    const key = `${category}/${id}`;

    // 3. Fetch from R2
    const object = await c.env.FITAI_MEDIA.get(key);

    if (!object) {
      console.log('[Media] File not found:', key);
      throw new APIError(
        'Media file not found',
        404,
        ErrorCode.MEDIA_NOT_FOUND,
        { key }
      );
    }

    // 4. Get content type
    const contentType = getContentType(id);
    const cacheDuration = getCacheDuration(category);

    console.log('[Media] File found:', {
      key,
      size: object.size,
      contentType,
      uploadedAt: object.uploaded,
    });

    // 5. Return file with caching headers
    const responseTime = Date.now() - startTime;

    return new Response(object.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': object.size.toString(),
        'Cache-Control': `public, max-age=${cacheDuration}, immutable`,
        'ETag': object.etag,
        'Last-Modified': object.uploaded.toUTCString(),
        'X-Response-Time': responseTime + 'ms',
        // Defense-in-depth against stored-content MIME confusion: never let the
        // browser sniff/execute a served file as something other than its
        // declared Content-Type.
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Media] Error:', error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to serve media file',
      500,
      ErrorCode.MEDIA_SERVE_FAILED
    );
  }
}

/**
 * POST /media/upload - Upload media file to R2
 * Requires authentication
 * Supports: images (jpg, png, gif, webp), max 10MB
 */
export async function handleMediaUpload(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Get authenticated user
    const user = c.get('user');
    if (!user) {
      throw new APIError(
        'Authentication required',
        401,
        ErrorCode.UNAUTHORIZED
      );
    }

    // 2. Parse form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const customId = formData.get('id') as string | null;

    if (!file) {
      throw new APIError(
        'No file provided',
        400,
        ErrorCode.INVALID_REQUEST
      );
    }

    if (!category || !['exercise', 'diet', 'user'].includes(category)) {
      throw new APIError(
        'Invalid category. Must be: exercise, diet, or user',
        400,
        ErrorCode.INVALID_PARAMETER
      );
    }

    // 3. Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new APIError(
        'File too large. Maximum size is 10MB',
        400,
        ErrorCode.FILE_TOO_LARGE,
        { size: file.size, maxSize }
      );
    }

    // Validate file type — images only, and never SVG (can embed <script>
    // and this content is later served back on a public, unauthenticated
    // route, making SVG upload a stored-XSS vector).
    const contentType = file.type;
    if (!contentType.startsWith('image/') || BLOCKED_UPLOAD_CONTENT_TYPES.has(contentType)) {
      throw new APIError(
        'Invalid file type. Only JPG, PNG, GIF, or WebP images are allowed',
        400,
        ErrorCode.INVALID_FILE_TYPE,
        { contentType }
      );
    }

    console.log('[Media Upload] Processing:', {
      category,
      filename: file.name,
      size: file.size,
      type: contentType,
      userId: user.id,
    });

    // 4. Generate unique ID and construct key
    const fileId = customId || crypto.randomUUID();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${fileId}.${extension}`;
    const key = `${category}/${filename}`;

    // 5. Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.FITAI_MEDIA.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: contentType,
      },
      customMetadata: {
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
        originalFilename: file.name,
      },
    });

    const uploadTime = Date.now() - startTime;

    console.log('[Media Upload] Success:', {
      key,
      size: file.size,
      uploadTime: uploadTime + 'ms',
    });

    // 6. Return success response with URL
    const mediaUrl = `/media/${category}/${filename}`;

    return c.json(
      {
        success: true,
        data: {
          id: fileId,
          filename,
          category,
          url: mediaUrl,
          size: file.size,
          contentType,
        },
        metadata: {
          uploadTime,
        },
      },
      201
    );
  } catch (error) {
    console.error('[Media Upload] Error:', error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to upload media file',
      500,
      ErrorCode.MEDIA_UPLOAD_FAILED
    );
  }
}

/**
 * DELETE /media/:category/:id - Delete media file from R2
 * Requires authentication
 * Users can only delete their own uploads
 */
export async function handleMediaDelete(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  try {
    // 1. Get authenticated user
    const user = c.get('user');
    if (!user) {
      throw new APIError(
        'Authentication required',
        401,
        ErrorCode.UNAUTHORIZED
      );
    }

    // 2. Get parameters
    const category = c.req.param('category');
    const id = c.req.param('id');

    if (!category || !id) {
      throw new APIError(
        'Missing category or ID parameter',
        400,
        ErrorCode.INVALID_PARAMETER
      );
    }

    const key = `${category}/${id}`;

    console.log('[Media Delete] Request:', { key, userId: user.id });

    // 3. Check if file exists and verify ownership
    const object = await c.env.FITAI_MEDIA.head(key);

    if (!object) {
      throw new APIError(
        'Media file not found',
        404,
        ErrorCode.MEDIA_NOT_FOUND,
        { key }
      );
    }

    // Verify ownership for all user-uploaded content. Fail closed: if
    // uploadedBy metadata is missing (legacy upload predating this field, or
    // a partially-failed metadata write) there is no way to prove the
    // requester owns the file, so deny deletion regardless of category —
    // previously only 'exercise'/'diet' were denied here, silently allowing
    // any authenticated user to delete another user's 'user'-category file
    // (profile picture, progress photo) whose metadata write had failed.
    const uploadedBy = object.customMetadata?.uploadedBy;
    if (!uploadedBy || uploadedBy !== user.id) {
      throw new APIError(
        'Unauthorized to delete this file',
        403,
        ErrorCode.FORBIDDEN
      );
    }

    // 4. Delete from R2
    await c.env.FITAI_MEDIA.delete(key);

    console.log('[Media Delete] Success:', { key });

    return c.json(
      {
        success: true,
        data: {
          message: 'Media file deleted successfully',
          key,
        },
      },
      200
    );
  } catch (error) {
    console.error('[Media Delete] Error:', error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to delete media file',
      500,
      ErrorCode.MEDIA_DELETE_FAILED
    );
  }
}
