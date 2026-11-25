const http = require('http');
const app = require('./index');

let server;
const PORT = 5055; // Use dedicated test port to avoid conflict
let authToken = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(rawData);
          } catch {
            data = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

const testResults = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    testResults.push({ message, pass: true });
  } else {
    console.error(`  \x1b[31m✘ FAIL:\x1b[0m ${message}`);
    testResults.push({ message, pass: false });
  }
}

async function runTests() {
  console.log('\n🚀 Starting Full-Stack End-to-End API and Middleware Test Suite...\n');

  // 1. Root & Health Check
  const root = await request('GET', '/');
  assert(root.status === 200, 'GET / returns 200 (serves React SPA or API status)');
  assert(root.headers['x-powered-by'] === undefined, 'Helmet hides x-powered-by header');
  assert(root.headers['x-content-type-options'] === 'nosniff', 'Helmet sets x-content-type-options');

  const health = await request('GET', '/api/health');
  assert(health.status === 200 && health.body.status === 'healthy', 'GET /api/health returns healthy system status');

  // 2. 404 Handler
  const notFound = await request('GET', '/api/non-existent-route-xyz');
  assert(notFound.status === 404 && notFound.body.success === false, '404 handler returns structured JSON error');

  // 3. Auth OTP Flow
  const otpRes = await request('POST', '/api/auth/send-otp', {
    email: 'testcoach@example.com',
    purpose: 'signin',
    fullName: 'Test Production Coach',
    role: 'coach',
  });
  assert(otpRes.status === 200 && otpRes.body.success === true, 'POST /api/auth/send-otp sends OTP');
  const previewOtp = otpRes.body.previewOtp || '123456';

  // 4. Auth Verify OTP -> JWT Token
  const verifyRes = await request('POST', '/api/auth/verify-otp', {
    email: 'testcoach@example.com',
    otp: previewOtp,
  });
  assert(verifyRes.status === 200 && verifyRes.body.success === true, 'POST /api/auth/verify-otp succeeds');
  assert(!!verifyRes.body.token, 'Verify OTP returns signed JWT token');
  authToken = verifyRes.body.token;

  // 5. Auth /me (Protected Route with JWT)
  const meAuth = await request('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${authToken}`,
  });
  assert(meAuth.status === 200 && (meAuth.body.data?.user?.email === 'testcoach@example.com' || meAuth.body.user?.email === 'testcoach@example.com'), 'GET /api/auth/me succeeds with valid Bearer JWT');

  const meNoAuth = await request('GET', '/api/auth/me');
  assert(meNoAuth.status === 401 && meNoAuth.body.success === false, 'GET /api/auth/me fails with 401 when token is missing');

  // 6. Location APIs
  const countries = await request('GET', '/api/location/countries');
  assert(countries.status === 200 && Array.isArray(countries.body.data) && countries.body.data.length > 0, 'GET /api/location/countries returns countries array');

  const states = await request('GET', '/api/location/states?countryCode=IN');
  assert(states.status === 200 && Array.isArray(states.body.data) && states.body.data.length > 0, 'GET /api/location/states returns states array for India');

  const cities = await request('GET', '/api/location/cities?countryCode=IN&stateCode=DL');
  assert(cities.status === 200 && Array.isArray(cities.body.data), 'GET /api/location/cities returns cities array for Delhi');

  // 7. Zoom Meeting Generation
  const zoomRes = await request('POST', '/api/zoom/create-meeting', {
    coachName: 'Coach Jane Doe',
    clientName: 'Client John Smith',
    topic: '1:1 Discovery Call',
    duration: 45,
  });
  assert(zoomRes.status === 200 && zoomRes.body.success && (zoomRes.body.joinUrl || zoomRes.body.data?.joinUrl), 'POST /api/zoom/create-meeting returns HD Zoom joinUrl and meeting details');

  // 8. Coaches API
  const coachesRes = await request('GET', '/api/coaches');
  const coachesList = Array.isArray(coachesRes.body.data) ? coachesRes.body.data : (coachesRes.body.data?.coaches || []);
  assert(coachesRes.status === 200 && coachesList.length > 0, 'GET /api/coaches returns array of coaches');

  const firstCoach = coachesList[0];
  const singleCoach = await request('GET', `/api/coaches/${firstCoach.id}`);
  assert(singleCoach.status === 200 && (singleCoach.body.data?.name === firstCoach.name || singleCoach.body.name === firstCoach.name), `GET /api/coaches/:id successfully fetches ${firstCoach.name}`);

  // 9. Bookings API
  const testBookingId = `test-book-${Date.now()}`;
  const newBooking = await request('POST', '/api/bookings', {
    id: testBookingId,
    coachId: firstCoach.id,
    coachName: firstCoach.name,
    serviceTitle: '1:1 Discovery Session',
    servicePrice: 2000,
    duration: '45 mins',
    deliveryMode: 'Online',
    clientName: 'Client Alex',
    clientEmail: 'alex@example.com',
    clientPhone: '+91 9876543210',
    date: `2026-12-${Math.floor(Math.random() * 20) + 10}`,
    timeSlot: `${Math.floor(Math.random() * 11) + 1}:00 PM`,
    meetingLink: 'https://zoom.us/j/9999999999',
    status: 'confirmed',
  });
  assert(newBooking.status === 201 && newBooking.body.success, 'POST /api/bookings successfully creates new booking');

  const allBookings = await request('GET', '/api/bookings');
  assert(allBookings.status === 200 && Array.isArray(allBookings.body.data), 'GET /api/bookings lists bookings');

  const patchBooking = await request(
    'PATCH',
    `/api/bookings/${testBookingId}/status`,
    { status: 'rescheduled' },
    { Authorization: `Bearer ${authToken}` }
  );
  assert(patchBooking.status === 200 && patchBooking.body.success, 'PATCH /api/bookings/:id/status updates booking with JWT auth');

  const delBooking = await request(
    'DELETE',
    `/api/bookings/${testBookingId}`,
    null,
    { Authorization: `Bearer ${authToken}` }
  );
  assert(delBooking.status === 200 && delBooking.body.success, 'DELETE /api/bookings/:id cancels/deletes booking with JWT auth');

  // 10. Inquiries API
  const testInquiryId = `test-inq-${Date.now()}`;
  const newInq = await request('POST', '/api/inquiries', {
    id: testInquiryId,
    coachId: firstCoach.id,
    coachName: firstCoach.name,
    clientName: 'Client Priya',
    clientEmail: 'priya@example.com',
    clientPhone: '+91 9876543211',
    goal: 'Executive Career Transition',
    preferredTime: 'Morning',
    message: 'Looking for a structured 3-month coaching roadmap.',
  });
  assert(newInq.status === 201 && newInq.body.success, 'POST /api/inquiries creates a new lead inquiry');

  const patchInq = await request(
    'PATCH',
    `/api/inquiries/${testInquiryId}/status`,
    { status: 'contacted', replyNotes: 'Followed up via WhatsApp and email.' },
    { Authorization: `Bearer ${authToken}` }
  );
  assert(patchInq.status === 200 && patchInq.body.success, 'PATCH /api/inquiries/:id/status updates lead status');

  const delInq = await request(
    'DELETE',
    `/api/inquiries/${testInquiryId}`,
    null,
    { Authorization: `Bearer ${authToken}` }
  );
  assert(delInq.status === 200 && delInq.body.success, 'DELETE /api/inquiries/:id removes lead inquiry');

  // 11. E-Books API: Publish (Protected Coach) & Order
  const publishEbook = await request(
    'POST',
    '/api/ebooks/publish',
    {
      coachId: firstCoach.id,
      title: 'The High-Performance Leadership Blueprint',
      subtitle: 'Strategies for Modern Executives',
      price: 499,
      pdfUrl: 'https://example.com/books/leadership-blueprint.pdf',
      category: 'Executive Coaching',
    },
    { Authorization: `Bearer ${authToken}` }
  );
  assert(publishEbook.status === 201 && publishEbook.body.success, 'POST /api/ebooks/publish allows authorized coach to publish digital book');

  const publishedEbookId = publishEbook.body.data?.id;

  const orderEbook = await request('POST', '/api/ebooks', {
    ebookId: publishedEbookId,
    userEmail: 'reader@example.com',
    userName: 'Avid Reader',
  });
  assert(orderEbook.status === 201 && orderEbook.body.success, 'POST /api/ebooks processes ebook purchase and delivers download link');

  // 12. Reviews API
  const reviews = await request('GET', `/api/reviews?coachId=${firstCoach.id}`);
  assert(reviews.status === 200 && reviews.body.success, 'GET /api/reviews returns coach reviews');

  const postReview = await request('POST', '/api/reviews', {
    coachId: firstCoach.id,
    clientName: 'Samir Verma',
    rating: 5,
    comment: 'Exceptional coaching framework! Cleared my mental blocks in 2 sessions.',
  });
  assert(postReview.status === 201 && postReview.body.success, 'POST /api/reviews records user testimonial');

  // Summary
  const passed = testResults.filter((r) => r.pass).length;
  const failed = testResults.filter((r) => !r.pass).length;
  console.log(`\n========================================`);
  console.log(`Total: ${testResults.length} | Passed: \x1b[32m${passed}\x1b[0m | Failed: \x1b[31m${failed}\x1b[0m`);
  console.log(`========================================\n`);

  server.close(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

server = app.listen(PORT, () => {
  runTests().catch((err) => {
    console.error('Fatal test error:', err);
    server.close(() => process.exit(1));
  });
});
