const http = require('http');

async function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Fetching Active Hotels ---');
  const hotelsRes = await get('/api/v1/auth/active-hotels');
  if (!hotelsRes.data?.success || !hotelsRes.data?.data?.length) {
    console.error('Failed to get active hotels:', hotelsRes);
    process.exit(1);
  }
  const hotel = hotelsRes.data.data[0];
  console.log(`Using Hotel: ${hotel.name} (id: ${hotel.id}, slug: ${hotel.slug})`);

  console.log('\n--- 2. Testing Staff Creation with Invalid (5-digit) PIN ---');
  const invalidPinRes = await post('/api/v1/hotel-staff', {
    hotelId: hotel.id,
    name: 'Test Invalid Staff',
    role: 'WAITER',
    pin: '12345',
    phone: '+91 99999 11111',
    avatar: 'data:image/jpeg;base64,samplephoto',
  });
  console.log('Invalid PIN response status:', invalidPinRes.status, invalidPinRes.data);
  if (invalidPinRes.status !== 400 || invalidPinRes.data.errorCode !== 'INVALID_PIN') {
    console.error('FAILED: Invalid 5-digit PIN was not rejected with INVALID_PIN!');
    process.exit(1);
  }
  console.log('✓ Invalid 5-digit PIN correctly rejected!');

  console.log('\n--- 3. Testing Staff Creation with Invalid (alphabetic) PIN ---');
  const alphaPinRes = await post('/api/v1/hotel-staff', {
    hotelId: hotel.id,
    name: 'Test Alpha Staff',
    role: 'WAITER',
    pin: '12a4',
    phone: '+91 99999 11112',
    avatar: 'data:image/jpeg;base64,samplephoto',
  });
  console.log('Alpha PIN response status:', alphaPinRes.status, alphaPinRes.data);
  if (alphaPinRes.status !== 400 || alphaPinRes.data.errorCode !== 'INVALID_PIN') {
    console.error('FAILED: Alphabetic PIN was not rejected with INVALID_PIN!');
    process.exit(1);
  }
  console.log('✓ Alphabetic PIN correctly rejected!');

  console.log('\n--- 4. Creating New Staff Member with Valid Strictly 4-Digit PIN (9876) ---');
  const uniqueName = `WaiterTest_${Date.now().toString().slice(-4)}`;
  const validPin = '9876';
  const createRes = await post('/api/v1/hotel-staff', {
    hotelId: hotel.id,
    name: uniqueName,
    role: 'WAITER',
    pin: validPin,
    phone: '+91 98765 43210',
    avatar: 'data:image/jpeg;base64,testavatarcompressed',
    assignedSection: 'Indoor AC Hall',
    assignedTableStart: 1,
    assignedTableEnd: 6,
  });

  console.log('Create Staff response status:', createRes.status);
  if (createRes.status !== 201 || !createRes.data?.success) {
    console.error('FAILED to create staff:', createRes);
    process.exit(1);
  }
  const newStaff = createRes.data.data;
  console.log(`✓ Staff created successfully! ID: ${newStaff.id}, Name: ${newStaff.name}, PIN status: ${newStaff.pinStatus}`);

  console.log('\n--- 5. Immediate Login with New Staff 4-Digit PIN (9876) ---');
  const loginRes = await post(
    '/api/v1/auth/waiter-login',
    {
      pin: validPin,
      hotelId: hotel.id,
      hotelSlug: hotel.slug,
      staffId: newStaff.id,
      email: newStaff.email,
      portal: 'waiter',
    },
    { 'x-hotel-id': hotel.id }
  );

  console.log('Login response status:', loginRes.status);
  console.log('Login response data:', loginRes.data);

  if (loginRes.status !== 200 || !loginRes.data?.success || !loginRes.data?.data?.token) {
    console.error('FAILED: New staff could not log in with their PIN immediately!');
    process.exit(1);
  }
  console.log('✓ New staff logged in immediately with 4-digit PIN! Token issued successfully.');

  console.log('\n--- 6. Testing Wrong PIN for New Staff ---');
  const wrongPinRes = await post(
    '/api/v1/auth/waiter-login',
    {
      pin: '0000',
      hotelId: hotel.id,
      hotelSlug: hotel.slug,
      staffId: newStaff.id,
      email: newStaff.email,
      portal: 'waiter',
    },
    { 'x-hotel-id': hotel.id }
  );
  console.log('Wrong PIN status:', wrongPinRes.status, wrongPinRes.data);
  if (wrongPinRes.status === 200) {
    console.error('FAILED: Wrong PIN was accepted!');
    process.exit(1);
  }
  console.log('✓ Wrong PIN correctly rejected!');

  console.log('\nALL TESTS PASSED! Staff creation and 4-digit PIN authentication are 100% verified.');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
