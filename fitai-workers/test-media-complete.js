/**
 * Complete media endpoint testing (upload → serve → delete)
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node test-media-complete.js <auth-token>');
  process.exit(1);
}

function createTestImage() {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64, 'base64');
  return new Blob([buffer], { type: 'image/png' });
}

async function testComplete() {
  console.log('📸 Complete Media Endpoint Test\n');

  let mediaUrl, category, filename;

  // 1. UPLOAD
  console.log('1️⃣ Uploading test image...');
  try {
    const formData = new FormData();
    formData.append('file', createTestImage(), 'test.png');
    formData.append('category', 'user');

    const uploadRes = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (uploadRes.status === 201) {
      console.log('   ✅ Upload: SUCCESS');
      console.log('   URL:', uploadData.data.url);
      console.log('   Size:', uploadData.data.size, 'bytes\n');
      mediaUrl = uploadData.data.url;
      category = uploadData.data.category;
      filename = uploadData.data.filename;
    } else {
      console.log('   ❌ Upload FAILED:', uploadData.error?.message);
      process.exit(1);
    }
  } catch (e) {
    console.error('   ❌ Upload ERROR:', e.message);
    process.exit(1);
  }

  // 2. SERVE (immediately after upload)
  console.log('2️⃣ Serving uploaded image...');
  try {
    const serveRes = await fetch(`${API_URL}${mediaUrl}`);

    if (serveRes.status === 200) {
      const blob = await serveRes.blob();
      console.log('   ✅ Serve: SUCCESS');
      console.log('   Content-Type:', serveRes.headers.get('Content-Type'));
      console.log('   Size:', blob.size, 'bytes');
      console.log('   Cache-Control:', serveRes.headers.get('Cache-Control'));
      console.log('   Response-Time:', serveRes.headers.get('X-Response-Time'), '\n');
    } else {
      const errorText = await serveRes.text();
      console.log('   ❌ Serve FAILED (Status:', serveRes.status + ')');
      console.log('   Error:', errorText, '\n');
    }
  } catch (e) {
    console.error('   ❌ Serve ERROR:', e.message, '\n');
  }

  // 3. DELETE
  console.log('3️⃣ Deleting image...');
  try {
    const deleteRes = await fetch(`${API_URL}/media/${category}/${filename}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });

    const deleteData = await deleteRes.json();
    if (deleteRes.status === 200) {
      console.log('   ✅ Delete: SUCCESS');
      console.log('   Message:', deleteData.message, '\n');
    } else {
      console.log('   ❌ Delete FAILED:', deleteData.error?.message, '\n');
    }
  } catch (e) {
    console.error('   ❌ Delete ERROR:', e.message, '\n');
  }

  // 4. VERIFY DELETION
  console.log('4️⃣ Verifying deletion...');
  try {
    const verifyRes = await fetch(`${API_URL}${mediaUrl}`);

    if (verifyRes.status === 404) {
      console.log('   ✅ Verification: SUCCESS (File deleted)\n');
    } else {
      console.log('   ❌ Verification FAILED (File still exists)', verifyRes.status, '\n');
    }
  } catch (e) {
    console.error('   ❌ Verification ERROR:', e.message, '\n');
  }

  console.log('✅ MEDIA ENDPOINTS TEST COMPLETE');
}

testComplete();
