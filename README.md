# CoachConnect Express Backend

Node.js and Express REST API backend converted from Next.js API routes.

## Features & Endpoints
- **Authentication & OTP**:
  - `POST /api/auth/send-otp` (6-digit verification code sent via Nodemailer SMTP)
  - `POST /api/auth/verify-otp` (Validates code, issues session token)
  - `GET /api/auth/me` (Bearer session validation)
- **Coaches Directory**:
  - `GET /api/coaches` (Filtering by category, keyword, rating, country, language, mode, sorting, pagination)
  - `GET /api/coaches/:id` (Single coach by slug or ID)
  - `POST /api/coaches` (Coach onboarding & profile creation)
- **Bookings Management**:
  - `GET /api/bookings`
  - `POST /api/bookings` (Collision detection, Zoom HD link generation)
  - `GET /api/bookings/user` (User-specific bookings)
- **Inquiries**:
  - `GET /api/inquiries`
  - `POST /api/inquiries`
- **E-Books Marketplace**:
  - `GET /api/ebooks`
  - `POST /api/ebooks`
- **Reviews & Ratings**:
  - `GET /api/reviews?coachId=...`
  - `POST /api/reviews` (Adds review & dynamically recalculates coach rating)
- **International Locations**:
  - `GET /api/location/countries`
  - `GET /api/location/states?countryCode=...`
  - `GET /api/location/cities?countryCode=...&stateCode=...`
- **Translation Proxy**:
  - `GET /api/translate?text=...&to=...`
  - `POST /api/translate`
- **Zoom Meeting Generator**:
  - `POST /api/zoom/create-meeting`

## Running Backend
```bash
cd backend
npm install
npm run dev   # Runs with nodemon on port 5000
# or
npm start     # Runs standard node server
```

