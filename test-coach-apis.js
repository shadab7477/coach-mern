const http = require('http');
const app = require('./index');
const { signToken } = require('./lib/jwt');

let server;
const PORT = 5077; // Dedicated test port
let coachAuthToken = '';
let clientAuthToken = '';

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

async function runCoachTests() {
  console.log('\n========================================================================');
  console.log('🩺 DEEP COACH (VENDOR) API VERIFICATION: MULTI-MEDIA, PACKAGES & DEGREES');
  console.log('========================================================================\n');

  // Issue real JWT tokens for testing Coach vs Client roles
  coachAuthToken = signToken({
    id: 'coach-usr-vendor-deep-1',
    email: 'vendor.master@example.com',
    role: 'coach',
    fullName: 'Dr. Siddharth Sen',
  });

  clientAuthToken = signToken({
    id: 'usr-client-1',
    email: 'client.user@example.com',
    role: 'client',
    fullName: 'Regular Client',
  });

  // TEST 1: Create Full-Fledged Coach with ALL Deep Fields
  console.log('--- Phase 1: Deep Coach Registration (Voice, Video, Packages, Offline, Degrees) ---');
  const fullVendorPayload = {
    userId: 'usr-siddharth-sen',
    name: 'Dr. Siddharth Sen',
    headline: 'Executive Leadership Strategist & Peak Performance Doctor',
    primaryCategory: 'Executive Coach',
    specialties: ['High-Stakes Leadership', 'Burnout Immunity', 'C-Suite Presence', 'Vocal Impact'],
    experienceYears: 15,
    startingPrice: 5000,
    offlinePrice: 8500,
    currency: '₹',
    currencyCode: 'INR',
    country: 'India',
    countryCode: 'IN',
    state: 'Maharashtra',
    city: 'Mumbai',
    location: 'Bandra Kurla Complex, Mumbai, India',
    meetingVenue: 'Executive Leadership Suite 402, Signature Tower, BKC, Mumbai',
    meetingLocation: 'BKC, Mumbai',
    phone: '9820011223',
    phoneCountryCode: '+91',
    deliveryModes: ['Online', 'Offline', 'Hybrid'],
    languages: ['English', 'Hindi', 'Bengali'],
    timeZone: 'IST (UTC+5:30)',
    about: 'Dual-qualified MD and ICF Master Certified Coach (MCC) helping enterprise CEOs and founders sustain peak cognitive performance without sacrificing health.',
    coachingPhilosophy: 'High performance is a biological and mental architecture. We optimize mental models, biological energy, and leadership delivery.',
    targetAudience: 'CEOs, Managing Directors, Tech Founders, and CXOs managing 500+ headcount organizations.',
    
    // Media: Images, Voice Intro, Video Intro
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    audioIntroUrl: 'https://cdn.coachconnect.org/audio/siddharth-sen-voice-note.mp3',
    audioDurationSeconds: 42,
    videoIntroUrl: 'https://cdn.coachconnect.org/video/siddharth-sen-pitch.mp4',
    videoDurationSeconds: 115,

    // Academic Education
    educationList: [
      {
        degree: 'MD in Cognitive Neuroscience',
        institution: 'All India Institute of Medical Sciences (AIIMS)',
        fieldOfStudy: 'Neurology & Stress Physiology',
        year: '2011',
        grade: 'Gold Medalist'
      },
      {
        degree: 'MBA in Healthcare & Executive Management',
        institution: 'Indian School of Business (ISB)',
        fieldOfStudy: 'Organizational Leadership',
        year: '2015'
      }
    ],

    // Professional Certifications
    certificationsList: [
      {
        name: 'MCC - Master Certified Coach',
        issuingOrg: 'International Coaching Federation (ICF)',
        year: '2018',
        credentialId: 'ICF-MCC-998822',
        certificateUrl: 'https://cdn.coachconnect.org/certs/icf-mcc-siddharth.pdf',
        certificateFileName: 'ICF_MCC_Credential.pdf'
      },
      {
        name: 'Certified Brain-Based Coach',
        issuingOrg: 'NeuroLeadership Institute',
        year: '2020',
        credentialId: 'NLI-BBC-4433'
      }
    ],

    // Honors & Awards
    awardsList: [
      {
        title: 'Asia-Pacific Executive Mentor of the Decade',
        issuer: 'Global Leadership Conclave',
        year: '2023',
        description: 'Recognized for mentoring 40+ Unicorn founders across APAC.'
      }
    ],

    // Custom Detailed Service Packages (Online + Offline)
    services: [
      {
        id: 'srv-sen-discovery',
        title: '1:1 Executive Diagnostic & Blueprint Session',
        duration: '60 mins',
        price: 5000,
        currency: '₹',
        deliveryMode: 'Online',
        description: 'Comprehensive psychological and strategic audit of executive priorities, cognitive load, and decision blindspots.',
        inclusions: ['60-min HD Zoom Consultation', 'Written Executive Blueprint', 'Circadian and stress scorecard'],
        isPopular: false
      },
      {
        id: 'srv-sen-inperson',
        title: 'In-Person C-Suite Strategic Intensive (Studio)',
        duration: '90 mins',
        price: 8500,
        currency: '₹',
        deliveryMode: 'In-Person',
        description: 'High-touch face-to-face coaching session at private executive suite in BKC, Mumbai.',
        inclusions: ['90-min in-person consulting', 'Diagnostic psychometric kit', '30-day follow-up accountability'],
        isPopular: true
      }
    ],

    // Availability Slots
    availableSlots: [
      { day: 'Mon', times: ['09:00 AM', '02:00 PM', '06:00 PM'] },
      { day: 'Wed', times: ['10:00 AM', '03:00 PM', '07:00 PM'] },
      { day: 'Fri', times: ['09:00 AM', '01:00 PM', '05:00 PM'] }
    ],

    // Online & Social Presence
    socialLinks: {
      linkedin: 'https://www.linkedin.com/in/dr-siddharth-sen-leadership',
      website: 'https://www.drsiddharthsen.com'
    }
  };

  const createRes = await request('POST', '/api/coaches', fullVendorPayload);
  assert(createRes.status === 201 && createRes.body.success, 'POST /api/coaches accepts comprehensive deep vendor payload (201 Created)');
  
  const coach = createRes.body.data;
  assert(coach.id === 'coach-usr-siddharth-sen', `Custom/User mapped coach ID created: ${coach.id}`);
  assert(coach.slug === 'dr-siddharth-sen', `SEO slug generated: ${coach.slug}`);
  
  // Verify Pricing & Offline
  assert(coach.startingPrice === 5000, `Online starting fee recorded: ₹${coach.startingPrice}`);
  assert(coach.offlinePrice === 8500, `Offline in-person fee recorded: ₹${coach.offlinePrice}`);
  assert(coach.meetingVenue.includes('BKC, Mumbai'), `Meeting venue recorded: ${coach.meetingVenue}`);
  
  // Verify Multi-Media
  assert(coach.audioIntroUrl === fullVendorPayload.audioIntroUrl, `Voice note audio URL recorded: ${coach.audioIntroUrl}`);
  assert(coach.audioDurationSeconds === 42, `Audio duration recorded: ${coach.audioDurationSeconds}s`);
  assert(coach.videoIntroUrl === fullVendorPayload.videoIntroUrl, `Video pitch URL recorded: ${coach.videoIntroUrl}`);
  assert(coach.videoDurationSeconds === 115, `Video duration recorded: ${coach.videoDurationSeconds}s`);
  assert(coach.photoUrl === fullVendorPayload.photoUrl, `Profile photo recorded: ${coach.photoUrl}`);
  assert(coach.coverUrl === fullVendorPayload.coverUrl, `Studio banner cover recorded: ${coach.coverUrl}`);

  // Verify Education & Certifications
  assert(Array.isArray(coach.educationList) && coach.educationList.length === 2, `Recorded ${coach.educationList?.length} academic degrees`);
  assert(coach.educationList[0].degree === 'MD in Cognitive Neuroscience', `First degree: ${coach.educationList[0].degree}`);
  assert(coach.educationList[0].grade === 'Gold Medalist', `Grade details preserved: ${coach.educationList[0].grade}`);
  assert(Array.isArray(coach.education) && coach.education[0].includes('AIIMS'), 'Harmonized education string array created for fast search display');

  assert(Array.isArray(coach.certificationsList) && coach.certificationsList.length === 2, `Recorded ${coach.certificationsList?.length} verified certifications`);
  assert(coach.certificationsList[0].credentialId === 'ICF-MCC-998822', `Credential ID recorded: ${coach.certificationsList[0].credentialId}`);
  assert(coach.certificationsList[0].certificateFileName === 'ICF_MCC_Credential.pdf', `Certificate filename recorded: ${coach.certificationsList[0].certificateFileName}`);

  // Verify Awards
  assert(Array.isArray(coach.awardsList) && coach.awardsList.length === 1, `Recorded ${coach.awardsList?.length} executive award`);
  assert(coach.awardsList[0].title.includes('Decade'), `Award title: ${coach.awardsList[0].title}`);

  // Verify Packages & Services
  assert(Array.isArray(coach.services) && coach.services.length === 2, `Recorded ${coach.services?.length} distinct service packages`);
  assert(coach.services[0].deliveryMode === 'Online', `Package 1 Delivery: ${coach.services[0].deliveryMode} (₹${coach.services[0].price})`);
  assert(coach.services[1].deliveryMode === 'In-Person', `Package 2 Delivery: ${coach.services[1].deliveryMode} (₹${coach.services[1].price})`);
  assert(coach.services[1].inclusions.length === 3, `Package 2 Inclusions: ${coach.services[1].inclusions.length} bullet points`);

  // Verify Social Links & Demographics
  assert(coach.socialLinks?.linkedin.includes('linkedin.com'), `LinkedIn link stored: ${coach.socialLinks?.linkedin}`);
  assert(coach.socialLinks?.website.includes('drsiddharthsen.com'), `Website URL stored: ${coach.socialLinks?.website}`);
  assert(coach.country === 'India' && coach.city === 'Mumbai', `Country & City: ${coach.city}, ${coach.country}`);
  assert(coach.phone === '9820011223' && coach.phoneCountryCode === '+91', `Phone with country code: ${coach.phoneCountryCode} ${coach.phone}`);

  // TEST 2: Fetch and verify complete persistence on GET /api/coaches/:id
  console.log('\n--- Phase 2: Persistence & Retrieval Verification ---');
  const fetchSingle = await request('GET', `/api/coaches/${coach.id}`);
  assert(fetchSingle.status === 200, `GET /api/coaches/:id returns 200`);
  const fetched = fetchSingle.body.data;
  assert(fetched.videoIntroUrl === fullVendorPayload.videoIntroUrl, 'Fetched profile preserves videoIntroUrl');
  assert(fetched.audioIntroUrl === fullVendorPayload.audioIntroUrl, 'Fetched profile preserves audioIntroUrl');
  assert(fetched.services?.length === 2, 'Fetched profile preserves both online & in-person packages');
  assert(fetched.educationList?.length === 2, 'Fetched profile preserves educationList');
  assert(fetched.certificationsList?.length === 2, 'Fetched profile preserves certificationsList');

  // TEST 3: Verification on Directory Querying
  const searchResult = await request('GET', '/api/coaches?q=Siddharth');
  assert(searchResult.status === 200 && searchResult.body.data?.coaches?.some((c) => c.id === coach.id), 'Directory search /api/coaches?q=Siddharth lists newly created vendor');

  // TEST 4: Profile Modification via PUT /api/coaches/:id
  console.log('\n--- Phase 3: Profile Update with New Media & In-Person Rates ---');
  const updateRes = await request(
    'PUT',
    `/api/coaches/${coach.id}`,
    {
      startingPrice: 6000,
      offlinePrice: 10000,
      meetingVenue: 'Penthouse Consulting Suite, St. Regis Hotel, Lower Parel, Mumbai',
      videoIntroUrl: 'https://cdn.coachconnect.org/video/siddharth-updated-2026.mp4',
    },
    { Authorization: `Bearer ${coachAuthToken}` }
  );
  assert(updateRes.status === 200 && updateRes.body.data?.startingPrice === 6000, 'PUT /api/coaches/:id updates starting fee to ₹6,000');
  assert(updateRes.body.data?.offlinePrice === 10000, 'PUT /api/coaches/:id updates offline fee to ₹10,000');
  assert(updateRes.body.data?.videoIntroUrl.includes('updated-2026'), 'PUT /api/coaches/:id updates video URL');
  assert(updateRes.body.data?.meetingVenue.includes('St. Regis'), 'PUT /api/coaches/:id updates meeting venue location');

  // Cleanup test coach from Supabase
  console.log('\n--- Phase 4: Clean Up ---');
  const delRes = await request('DELETE', `/api/coaches/${coach.id}`, null, {
    Authorization: `Bearer ${coachAuthToken}`,
  });
  assert(delRes.status === 200 && delRes.body.success, 'DELETE /api/coaches/:id removes test vendor cleanly');

  // Summary
  const passed = testResults.filter((r) => r.pass).length;
  const failed = testResults.filter((r) => !r.pass).length;
  console.log(`\n========================================================================`);
  console.log(`DEEP COACH API SUITE: Total ${testResults.length} | Passed: \x1b[32m${passed}\x1b[0m | Failed: \x1b[31m${failed}\x1b[0m`);
  console.log(`========================================================================\n`);

  server.close(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

server = app.listen(PORT, () => {
  runCoachTests().catch((err) => {
    console.error('Fatal Coach test error:', err);
    server.close(() => process.exit(1));
  });
});
