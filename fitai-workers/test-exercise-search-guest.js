/**
 * Test script for exercise search endpoint - Guest access
 *
 * Tests that the /exercises/search endpoint works WITHOUT authentication
 */

const WORKER_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

async function testGuestAccess() {
  console.log('Testing /exercises/search for GUEST access (no auth token)...\n');

  try {
    // Test 1: Basic search without auth
    console.log('Test 1: Basic search (no filters, no auth)');
    const response1 = await fetch(`${WORKER_URL}/exercises/search?limit=5`);

    console.log('Status:', response1.status);
    console.log('Headers:', {
      'content-type': response1.headers.get('content-type'),
      'x-ratelimit-limit': response1.headers.get('x-ratelimit-limit'),
      'x-ratelimit-remaining': response1.headers.get('x-ratelimit-remaining'),
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('Success:', data1.success);
      console.log('Exercises returned:', data1.data?.exercises?.length || 0);
      console.log('Total exercises:', data1.data?.total || 0);
      console.log('Sample exercise:', data1.data?.exercises?.[0]?.name || 'N/A');
      console.log('✅ Test 1 PASSED\n');
    } else {
      const error = await response1.text();
      console.log('❌ Test 1 FAILED - Status:', response1.status);
      console.log('Error:', error);
      return;
    }

    // Test 2: Search with query parameter
    console.log('\nTest 2: Search with query (no auth)');
    const response2 = await fetch(`${WORKER_URL}/exercises/search?query=chest&limit=5`);

    console.log('Status:', response2.status);

    if (response2.ok) {
      const data2 = await response2.json();
      console.log('Success:', data2.success);
      console.log('Exercises matching "chest":', data2.data?.exercises?.length || 0);
      console.log('Total matches:', data2.data?.total || 0);
      console.log('Sample exercise:', data2.data?.exercises?.[0]?.name || 'N/A');
      console.log('✅ Test 2 PASSED\n');
    } else {
      const error = await response2.text();
      console.log('❌ Test 2 FAILED - Status:', response2.status);
      console.log('Error:', error);
      return;
    }

    // Test 3: Search with equipment filter
    console.log('\nTest 3: Search with equipment filter (no auth)');
    const response3 = await fetch(`${WORKER_URL}/exercises/search?equipment=dumbbell&limit=5`);

    console.log('Status:', response3.status);

    if (response3.ok) {
      const data3 = await response3.json();
      console.log('Success:', data3.success);
      console.log('Exercises with dumbbell:', data3.data?.exercises?.length || 0);
      console.log('Total matches:', data3.data?.total || 0);
      console.log('✅ Test 3 PASSED\n');
    } else {
      const error = await response3.text();
      console.log('❌ Test 3 FAILED - Status:', response3.status);
      console.log('Error:', error);
      return;
    }

    // Test 4: Multiple filters
    console.log('\nTest 4: Search with multiple filters (no auth)');
    const response4 = await fetch(
      `${WORKER_URL}/exercises/search?query=press&equipment=barbell&bodyParts=chest&limit=5`
    );

    console.log('Status:', response4.status);

    if (response4.ok) {
      const data4 = await response4.json();
      console.log('Success:', data4.success);
      console.log('Exercises matching filters:', data4.data?.exercises?.length || 0);
      console.log('Total matches:', data4.data?.total || 0);
      console.log('Sample exercise:', data4.data?.exercises?.[0]?.name || 'N/A');
      console.log('✅ Test 4 PASSED\n');
    } else {
      const error = await response4.text();
      console.log('❌ Test 4 FAILED - Status:', response4.status);
      console.log('Error:', error);
      return;
    }

    console.log('\n✅ ALL TESTS PASSED - Guest access is working correctly!');

  } catch (error) {
    console.error('❌ TEST FAILED with error:', error.message);
    throw error;
  }
}

testGuestAccess().catch(console.error);
