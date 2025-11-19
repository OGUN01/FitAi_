/**
 * End-to-end test for media endpoints
 * Tests upload, serve, and delete operations
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node test-media-e2e.js <auth-token>');
  process.exit(1);
}

/**
 * Create a test image (1x1 pixel PNG)
 */
function createTestImage() {
  // 1x1 pixel red PNG (base64)
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64, 'base64');
  return new Blob([buffer], { type: 'image/png' });
}

async function testMediaEndpoints() {
  console.log('🔍 Testing Media Endpoints...\n');

  let uploadedUrl = null;
  let uploadedId = null;
  let category = null;
  let filename = null;

  // ========================================
  // 1. TEST UPLOAD
  // ========================================
  console.log('1️⃣ Testing Media Upload...');

  try {
    const formData = new FormData();
    formData.append('file', createTestImage(), 'test-image.png');
    formData.append('category', 'user');

    const uploadResponse = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: formData,
    });

    const uploadStatus = uploadResponse.status;
    const uploadData = await uploadResponse.json();

    console.log('   Status:', uploadStatus);

    if (uploadStatus === 201) {
      console.log('   ✅ Upload succeeded!');
      console.log('   ID:', uploadData.data.id);
      console.log('   Filename:', uploadData.data.filename);
      console.log('   Category:', uploadData.data.category);
      console.log('   URL:', uploadData.data.url);
      console.log('   Size:', uploadData.data.size, 'bytes');
      console.log('   Content-Type:', uploadData.data.contentType);
      console.log('   Upload Time:', uploadData.metadata.uploadTime + 'ms');

      uploadedUrl = uploadData.data.url;
      uploadedId = uploadData.data.id;
      category = uploadData.data.category;
      filename = uploadData.data.filename;
    } else {
      console.log('   ❌ Upload failed');
      console.log('   Error:', uploadData.error?.message);
      console.log('   Code:', uploadData.error?.code);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ Exception:', error.message);
    process.exit(1);
  }

  console.log('');

  // ========================================
  // 2. TEST SERVE (GET)
  // ========================================
  console.log('2️⃣ Testing Media Serve...');

  try {
    const serveResponse = await fetch(`${API_URL}${uploadedUrl}`);
    const serveStatus = serveResponse.status;

    console.log('   Status:', serveStatus);

    if (serveStatus === 200) {
      const contentType = serveResponse.headers.get('Content-Type');
      const contentLength = serveResponse.headers.get('Content-Length');
      const cacheControl = serveResponse.headers.get('Cache-Control');
      const responseTime = serveResponse.headers.get('X-Response-Time');

      console.log('   ✅ Serve succeeded!');
      console.log('   Content-Type:', contentType);
      console.log('   Content-Length:', contentLength, 'bytes');
      console.log('   Cache-Control:', cacheControl);
      console.log('   Response-Time:', responseTime);

      // Verify it's actually an image
      const blob = await serveResponse.blob();
      console.log('   Received blob:', blob.size, 'bytes,', blob.type);
    } else {
      console.log('   ❌ Serve failed');
      const errorText = await serveResponse.text();
      console.log('   Error:', errorText);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ Exception:', error.message);
    process.exit(1);
  }

  console.log('');

  // ========================================
  // 3. TEST DELETE
  // ========================================
  console.log('3️⃣ Testing Media Delete...');

  try {
    const deleteResponse = await fetch(`${API_URL}/media/${category}/${filename}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    });

    const deleteStatus = deleteResponse.status;
    const deleteData = await deleteResponse.json();

    console.log('   Status:', deleteStatus);

    if (deleteStatus === 200) {
      console.log('   ✅ Delete succeeded!');
      console.log('   Message:', deleteData.message);
    } else {
      console.log('   ❌ Delete failed');
      console.log('   Error:', deleteData.error?.message);
      console.log('   Code:', deleteData.error?.code);
    }
  } catch (error) {
    console.error('   ❌ Exception:', error.message);
    process.exit(1);
  }

  console.log('');

  // ========================================
  // 4. VERIFY DELETION (Should get 404)
  // ========================================
  console.log('4️⃣ Verifying Deletion...');

  try {
    const verifyResponse = await fetch(`${API_URL}${uploadedUrl}`);
    const verifyStatus = verifyResponse.status;

    console.log('   Status:', verifyStatus);

    if (verifyStatus === 404) {
      console.log('   ✅ Verification succeeded! File is deleted.');
    } else {
      console.log('   ❌ Verification failed! File still exists.');
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ Exception:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('✅ ALL MEDIA ENDPOINT TESTS PASSED!');
}

testMediaEndpoints();
