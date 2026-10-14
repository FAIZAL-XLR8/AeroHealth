# 🩺 AeroHealth — AI-Powered Healthcare & Telemedicine Platform

> **A full-stack, "Skyscanner for Healthcare" platform built for Bengaluru.**  
> AeroHealth bridges the gap between symptom onset and specialized clinical care. Patients can compare verified doctor consultation fees and diagnostic costs in real time, run AI-guided symptom triage backed by Retrieval-Augmented Generation (RAG), book appointments with Razorpay, undergo end-to-end WebRTC video/audio telemedicine consultations, and analyze medical lab reports or handwritten prescriptions using multimodal computer vision.

---

## 📑 Table of Contents

## 🌟 Overview & Problem Statement

In fragmented urban healthcare markets, patients struggle with three main bottlenecks:
1. **Opaque Pricing & Search Fatigue**: Consultation fees, hospital charges, and clinic locations vary wildly with little pricing transparency.
2. **Delayed or Inaccurate Triage**: Patients often self-diagnose via generic web searches or visit the wrong medical specialist, causing treatment delays.
3. **Fragmented Telehealth & Post-Consultation Friction**: Teleconsultations often lack integrated screen-sharing, instant report review, structured prescription analysis, and ephemeral privacy lifecycles.

**AeroHealth solves this through:**
- **Live Scraped Healthcare Aggregator**: Scrapes real consultation charges and verified doctor credentials from platforms like Lybrate via Puppeteer whenever database records are sparse.
- **RAG-Driven Clinical Triage (Google Gemini + Pinecone)**: An interactive AI triage assistant that queries clinical guideline vector embeddings (40+ conditions, mapped symptoms, precautions, and specialty mappings) and presents dynamic multiple-choice questions to patients before recommending doctors.
- **Multimodal AI Medical Document Analysis**: Gemini Vision extracts and explains laboratory diagnostic reports (PDF/images) and deciphers handwritten prescriptions into clean medication regimens, side effects, and precautions.
- **In-Browser WebRTC Telemedicine Suite**: High-definition peer-to-peer audio/video calling, screen sharing, live chat with typing indicators, attachments, and automated 7-day consultation room lifecycle expirations.
- **Strict Doctor Onboarding & KYC**: Two-factor verification (Twilio SMS OTP + Nodemailer Email OTP), government medical license review via Cloudinary, and administrative approval/rejection/suspension workflows.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **Healthcare Cost Aggregation** | Scrapes live doctor consultation fees, clinic locations, and experience ratings across Bengaluru using **Puppeteer** with automatic deduplication and geocoding. |
| **Interactive Mapbox Geolocation** | Visualizes clinic and doctor locations on an interactive **Mapbox GL** vector map, centered dynamically around Bengaluru. |
| **AI Symptom Triage with RAG** | Conversational triage powered by **Gemini 3.1 Flash Lite** and a **Pinecone Vector Store** (768-dim embeddings). Provides dynamic single/multi-choice follow-up questions to isolate clinical conditions and recommend the best specialist with actionable precautions. |
| **AI Laboratory Report Analyzer** | Patients upload PDF or image lab reports (CBC, Lipid profiles, Thyroid panels); Gemini extracts critical alerts, abnormal readings, identified tests, and recommended follow-ups. |
| **AI Prescription Analyzer (OCR)** | Computer vision model deciphers doctors' handwritten prescriptions, identifies drug names, and provides patient-friendly instructions, dosage guidelines, precautions, and drug interactions. |
| **WebRTC Telemedicine & Chat** | In-house WebRTC peer-to-peer video/voice consultations with screen sharing. Supported by **Socket.IO** signaling, live chat, typing indicators, and message seen receipts. |
| **7-Day Data Lifecycle Policy** | Consultation rooms and encrypted messaging histories remain active for exactly 7 days post-payment, after which rooms and video upload tokens automatically expire to protect patient privacy. |
| **Razorpay Payment Gateway** | Complete slot-reservation and payment workflow with concurrency locking, order generation, cryptographic HMAC-SHA256 signature verification, and webhook handlers. |
| **Doctor KYC & Admin Panel** | Dual-channel OTP verification (Twilio SMS + Nodemailer Email), document upload to **Cloudinary**, and an Admin panel to approve, reject, or suspend medical practitioners. |
| **Redis Rate Limiting** | Custom sliding-window rate limiters backed by **Redis** to prevent abuse on costly Gemini AI endpoints and authentication routes. |


## 🛠️ Tech Stack & Third-Party Services

### 1. Frontend Technologies
- **React 19 (`react`, `react-dom`)**: Core user interface library.
- **Vite 8**: Next-generation frontend tooling and development server.
- **TailwindCSS v4 (`@tailwindcss/vite`)**: Utility-first responsive styling.
- **Framer Motion (`framer-motion`)**: Fluid animations for cards, transitions, and drawers.
- **Lucide React (`lucide-react`)**: Modern icon set.
- **Socket.IO Client (`socket.io-client`)**: Real-time WebSocket connection for chat and WebRTC signaling.
- **Emoji Picker React (`emoji-picker-react`)**: Interactive emoji drawer in telemedicine chat.
- **Zod (`zod`)**: Runtime schema validation.

### 2. Backend Technologies
- **Node.js & Express.js**: High-performance RESTful API and WebSocket hosting.
- **Mongoose 8**: Object Data Modeling (ODM) library for MongoDB.
- **Socket.IO 4**: Full-duplex WebSocket server managing rooms, presence, typing status, and WebRTC offers/answers/ICE candidates.
- **Puppeteer 25**: Headless Chromium browser automation used for crawling live doctor fees, clinic locations, and experience ratings.
- **Cheerio 1.2 & Axios**: Fast HTML parsing and HTTP querying.
- **Multer & Streamifier**: Memory-buffered file handling for images, prescription scans, and PDFs (up to 50MB).
- **Helmet & Cookie-Parser**: Security headers and secure HttpOnly cookie handling.
- **BcryptJS & JSONWebToken (JWT)**: Cryptographic password hashing (salt rounds = 10) and stateless token generation (7-day validity).

### 3. AI / Machine Learning & Vector Search
- **Google Gemini 3.1 Flash Lite (`@google/genai`)**:
  - Powers clinical triage conversations and dynamic diagnostic questions.
  - Multimodal document parsing for laboratory reports.
  - Vision OCR on handwritten prescriptions.
- **Gemini Embeddings (`gemini-embedding-2`)**: Generates 768-dimensional dense vector embeddings.
- **Pinecone Vector Database (`@pinecone-database/pinecone`, `@langchain/pinecone`)**:
  - Cloud-native vector index (`assist`, namespace: `assist-triage`).
  - Cosine similarity search against 40+ disease guidelines to provide clinical context to Gemini.
- **LangChain Core (`@langchain/core`, `@langchain/community`)**: RAG orchestration, document formatting, and embeddings interface.

### 4. Third-Party Cloud Services & APIs

| Service | Category | Why & How It Is Used |
| :--- | :--- | :--- |
| **MongoDB Atlas** | Database | Stores Users, Doctors, Pending KYC Applications, Appointments, Messages, Availability Slots, and Payments. Uses GeoJSON `Point` indexes for clinic locations. |
| **Redis Cloud** | Cache & Limiter | Sliding-window key-value rate limiting (`rateLimit:chatbot`, `rateLimit:fileAnalyze`) to protect Gemini quotas and auth routes. |
| **Razorpay** | Payments | Creates payment orders in INR (`amount * 100` paise), verifies HMAC-SHA256 signatures upon checkout, and processes asynchronous webhooks (`order.paid`, `payment.captured`). |
| **Mapbox GL & Geocoding** | Maps & GIS | Converts scraped physical clinic addresses into geographic coordinates `[longitude, latitude]` and displays interactive pins on the frontend map. |
| **Cloudinary** | Media Storage | Stores doctor government ID documents during KYC and provides cryptographically signed upload URLs (`api_sign_request`) for consultation video recordings. |
| **Twilio Verify v2** | Telecom / SMS | Dispatches 6-digit SMS verification OTPs to doctor mobile phones during registration. |
| **Nodemailer (Gmail SMTP)** | Email Notifications | Delivers branded HTML verification emails with OTPs, doctor onboarding approval confirmations, rejection notices, and suspension alerts. |

---

## 📂 Project Folder Structure

```
HEALTH-CARE-SYSTEM/
├── README.md                           # Master project documentation
├── backend/                            # Express.js REST API & WebSocket Server
│   ├── .env                            # Backend environment configuration
│   ├── package.json                    # Backend dependencies & npm scripts
│   ├── server.js                       # Application entrypoint & HTTP/Socket server
│   ├── config/                         # Infrastructure configurations
│   │   ├── db.js                       # MongoDB Atlas Mongoose connection
│   │   ├── redisClient.js              # Redis Cloud connection client
│   │   └── socket.js                   # Socket.IO handlers (WebRTC, chat, presence, rooms)
│   ├── controllers/                    # Business logic controllers
│   │   ├── adminController.js          # Doctor review, approval, rejection & suspension
│   │   ├── aiController.js             # Multimodal report analysis & stage-wise triage
│   │   ├── appointmentController.js    # Slot reservation, past slot filter & locking
│   │   ├── authController.js           # Auth, JWT cookies, OTP generation & KYC
│   │   ├── chatbotController.js        # RAG triage with Pinecone + Gemini
│   │   ├── doctorController.js         # Doctor search, Lybrate scraper fallback & comparison
│   │   ├── doctorDashboardController.js# Doctor appointment stats & patient list
│   │   ├── messageController.js        # Chat history & media uploads (Cloudinary)
│   │   ├── patientDashboardController.js# Patient bookings & appointments
│   │   ├── paymentController.js        # Razorpay orders, verification & webhooks
│   │   ├── prescriptionController.js   # Gemini OCR & prescription guidance
│   │   └── videoController.js          # Signed Cloudinary video metadata & uploads
│   ├── data/                           # Seed datasets & static data
│   │   └── pinecone_data.csv           # 40+ disease clinical guidelines for vector indexing
│   ├── middleware/                     # Express middlewares
│   │   ├── authMiddleware.js           # JWT verification (`protect`, `isAdmin`)
│   │   └── rateLimiter.js              # Redis sliding-window API rate limiter
│   ├── models/                         # Mongoose Data Models
│   │   ├── Appointment.js              # Booking records, payment state, 7-day expiry
│   │   ├── Doctor.js                   # Doctor profiles with GeoJSON coordinates
│   │   ├── DoctorAvailability.js       # Daily 9 AM - 5 PM time slots & booking state
│   │   ├── Message.js                  # Chat messages (text, image, pdf, video)
│   │   ├── Payment.js                  # Razorpay transaction audit logs
│   │   ├── PendingDoctor.js            # Unapproved doctor KYC submissions
│   │   ├── User.js                     # Patient & Admin accounts
│   │   └── Video.js                    # Telemedicine recorded call metadata
│   ├── routes/                         # API route declarations
│   │   ├── api.js                      # Main application endpoints
│   │   └── auth.js                     # Registration, login, OTP & session endpoints
│   ├── services/                       # Third-party integrations
│   │   ├── cloudinaryService.js        # Cloudinary SDK buffer uploader & signer
│   │   ├── emailServices.js            # Nodemailer HTML email templates
│   │   ├── geminiService.js            # Google GenAI helper functions
│   │   ├── lybrateScraper.js           # Puppeteer scraper for Lybrate Bengaluru
│   │   └── twilioService.js            # Twilio Verify v2 SMS service
│   └── utils/                          # Helper functions & data transformations
│       ├── appointmentFormatter.js     # Expiry calculations & appointment views
│       ├── embeddings.js               # CommonJS/ESM Google GenAI batch embedder
│       ├── geocoder.js                 # Mapbox address-to-coordinate geocoder
│       ├── specialities.js             # Supported medical specialty definitions
│       └── specialityResolver.js       # Fuzzy specialty resolver (Fuse.js)
│
└── frontend/                           # React 19 + Vite Single-Page Application
    ├── .env                            # Frontend environment configuration
    ├── index.html                      # HTML root template with fonts
    ├── package.json                    # Frontend dependencies & npm scripts
    ├── vite.config.js                  # Vite configuration & `/api` proxy setup
    ├── public/                         # Static public assets
    └── src/
        ├── App.jsx                     # Root component, global state, page router
        ├── main.jsx                    # React DOM root mounting
        ├── index.css                   # Global styles & TailwindCSS directives
        ├── assets/                     # UI illustration images & assets
        ├── components/                 # Reusable React components
        │   ├── AuthModal.jsx           # Multi-step login, signup & doctor KYC wizard
        │   ├── BookingStepPage.jsx     # Slot selection & Razorpay checkout integration
        │   ├── ChatDrawer.jsx          # Interactive AI triage sliding chatbot
        │   ├── FlashMessage.jsx        # Toast notification system
        │   └── MapView.jsx             # Mapbox GL dynamic doctor locator map
        ├── hooks/                      # Custom React hooks
        │   ├── useTelehealthCall.js    # WebRTC peer connection, mic/cam/screen toggles
        │   └── useTelehealthChat.js    # Socket.IO chat messaging, typing, seen receipts
        ├── pages/                      # Application view pages
        │   ├── AdminDashboard.jsx      # Doctor application approvals, rejects & suspensions
        │   ├── DoctorDashboard.jsx     # Doctor schedule, pending consults & patients
        │   ├── Home.jsx                # Landing hero page, fast specialty search, CTA
        │   ├── PatientDashboard.jsx    # Patient appointment cards & consultation links
        │   ├── PrescriptionAnalyzer.jsx# Prescription OCR upload and drug explanations
        │   ├── Profile.jsx             # Account settings & profile management
        │   ├── ReportAnalyzer.jsx      # Diagnostic lab report parser & critical alerts
        │   ├── SearchHub.jsx           # Doctor cost comparator matrix & Mapbox search
        │   └── TelehealthRoom.jsx      # Full WebRTC consultation room with screen sharing
        └── styles/                     # CSS stylesheets per component & theme
            ├── AdminDashboard.css
            ├── DoctorDashboard.css
            ├── Home.css
            ├── PatientDashboard.css
            ├── PrescriptionAnalyzer.css
            ├── ReportAnalyzer.css
            ├── SearchHub.css
            ├── TelehealthRoom.css
            └── theme.css
```

---

## ⚙️ Environment Variables Setup

Both `backend` and `frontend` require environment variables to connect to third-party services.

### 1. Backend `.env` (`backend/.env`)

Create a `.env` file in the `backend/` directory with the following variables:

```env
# ==========================================
# SERVER & SECURITY
# ==========================================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars

# ==========================================
# MONGODB ATLAS
# ==========================================
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aerohealth?retryWrites=true&w=majority

# ==========================================
# REDIS CLOUD (For Sliding-Window Rate Limiting)
# ==========================================
REDIS_URI=your-redis-host.db.redis.io
REDIS_PORT=12237
REDIS_PASSWORD=your_redis_password_here

# ==========================================
# GOOGLE GEMINI (AI Triage, Multimodal & OCR)
# ==========================================
GEMINI_API_KEY=your_google_gemini_api_key

# ==========================================
# PINECONE VECTOR DATABASE (RAG Guidelines)
# ==========================================
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=assist
PINECONE_ENVIRONMENT=us-east-1

# ==========================================
# MAPBOX (Address Geocoding & Doctor Maps)
# ==========================================
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_public_or_secret_access_token

# ==========================================
# RAZORPAY PAYMENT GATEWAY
# ==========================================
RAZORPAY_API_KEY=rzp_test_your_key_id
RAZORPAY_API_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# ==========================================
# CLOUDINARY (Media, Doctor IDs & Telehealth Videos)
# ==========================================
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ==========================================
# TWILIO (Doctor Phone OTP Verification)
# ==========================================
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SERVICE_SID=your_twilio_verify_service_sid

# ==========================================
# NODEMAILER / GMAIL (Email OTP & Notifications)
# ==========================================
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_16_character_app_password
```

### 2. Frontend `.env` (`frontend/.env`)

Create a `.env` file in the `frontend/` directory:

```env
# Mapbox token used by Mapbox GL JS on the frontend
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_access_token
```

> **Note on Vite Proxy:** The frontend development server proxies all `/api` requests to `http://localhost:5000` via `frontend/vite.config.js`, meaning no `VITE_API_BASE_URL` is needed when running locally.

---

## 🚀 Installation & How to Run

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (Recommended: `v20.x` LTS)
- **npm**: `v9.x` or higher
- **Git**
- Active accounts with API credentials for:
  - MongoDB Atlas
  - Redis Cloud (or local Redis instance)
  - Google AI Studio (Gemini API)
  - Pinecone (Serverless index: 768 dimensions, cosine metric)
  - Mapbox, Razorpay, Cloudinary, Twilio, and Gmail App Password

---

### 2. Backend Setup

Open a terminal and navigate to the `backend` folder:

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Install all node dependencies
npm install

# 3. Create and populate your .env file
# (Ensure MONGO_URI, GEMINI_API_KEY, REDIS_URI, etc. are properly set)

# 4. Start the backend in development mode (with nodemon)
npm run dev
```

The backend server will start on:
```
Server is running in development mode on port 5000
MongoDB Connected: <cluster-host>
Connected to Redis server successfully.
```

---

### 3. Frontend Setup

Open a **second terminal** and navigate to the `frontend` folder:

```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Verify frontend/.env contains your VITE_MAPBOX_TOKEN

# 4. Start the Vite development server
npm run dev
```

The Vite dev server will start instantly:
```
  VITE v8.0.12  ready in 340 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser and navigate to **`http://localhost:5173`**.

---

### 4. Running Both Servers

For a smooth workflow, keep both servers running concurrently in two separate terminal tabs:

| Terminal | Path | Command | Purpose |
| :--- | :--- | :--- | :--- |
| **Terminal 1** | `HEALTH-CARE-SYSTEM/backend` | `npm run dev` | Express API, Socket.IO, Puppeteer & Redis |
| **Terminal 2** | `HEALTH-CARE-SYSTEM/frontend` | `npm run dev` | React + Vite hot-reloading dev server |

---

## 🔑 Default Credentials & Test Data

### 1. Default Admin Account
To access the **Admin Dashboard** (`/admin-dashboard`) to review, approve, reject, or suspend doctor onboarding applications:
- **Email**: `admin@test.com`
- **Password**: `System_admin`
- **Role**: `admin`

### 2. Razorpay Test Payment Card
When testing the appointment booking checkout flow in Razorpay Test Mode:
- **Card Number**: `4100 2800 0000 1007`
- **Expiry**: Any future date (e.g., `12/30`)
- **CVV**: `123`
- **OTP**: Any 4-digit or 6-digit code (e.g., `123456`)

---

## 🧭 Core Workflows & User Guides

### 1. AI Symptom Triage with RAG
1. Click the **"Chat with Apollo Assist"** bubble at the bottom right of any page.
2. Type in your symptoms (e.g., *"I have acute chest burning, acid regurgitation, and throat ulcers"*).
3. The backend calculates vector embeddings (`gemini-embedding-2`) and queries Pinecone for matching clinical records (score $\ge 0.60$).
4. Gemini responds with dynamic follow-up questions and single/multi-choice buttons.
5. Once sufficient context is gathered, the bot outputs:
   - **Triage Summary & Priority** (e.g., *High*, *Medium*, *Low*).
   - **Recommended Specialist** (e.g., *Gastroenterologist*).
   - **Condition-Specific Precautions** extracted directly from medical guidelines.
   - **Nearby Verified Specialists in Bengaluru** available to book immediately.

### 2. Doctor Search & Live Lybrate Crawler
1. Go to the **Search Hub** or use the Hero search bar on the Home page.
2. Search by specialty (e.g., `Cardiologist`, `ENT Specialist`, `Dermatologist`, `Dentist`).
3. If the database has fewer than 4 verified doctors for that specialty, the backend automatically spawns a headless **Puppeteer** browser to crawl Lybrate Bengaluru:
   - Scrapes doctor names, clinic addresses, consultation fees, and experience years.
   - Geocodes clinic locations to exact `[lng, lat]` coordinates via the Mapbox Geocoding API.
   - Deduplicates and saves new doctor records in MongoDB.
4. Compare multiple doctors side-by-side using the comparison matrix.

### 3. Appointment Booking & Telemedicine Consultation
1. Select a doctor and click **"Book Consultation"**.
2. Pick any available time slot (slots in the past for today's date are automatically disabled).
3. Confirm the reservation (locks the slot temporarily to prevent race conditions).
4. Pay via the integrated **Razorpay Checkout modal**.
5. Once payment is confirmed:
   - The consultation room is unlocked for **7 days**.
   - Access the **Telehealth Room** from your Patient Dashboard.
   - Launch high-definition **WebRTC video/voice calls**, share your screen, send chat messages, or attach diagnostic reports.

### 4. AI Medical Document Analysis
- **Report Analyzer**:
  - Upload laboratory PDF reports or scan images.
  - Gemini extracts all identified tests, pinpoints out-of-range critical alerts, and recommends the appropriate medical specialist.
- **Prescription Analyzer**:
  - Upload handwritten or printed prescriptions.
  - Gemini Vision OCR extracts the medication names.
  - The model provides dosage guidelines, clinical rationale, common side effects, and pharmacist warnings.

### 5. Doctor Onboarding & Verification (KYC)
1. Register with the **Doctor** role.
2. Complete the step-by-step onboarding wizard:
   - Verify phone number via **Twilio SMS OTP**.
   - Verify email address via **Nodemailer OTP**.
   - Upload government-issued medical registration ID/license to **Cloudinary**.
   - Set consultation fees, clinic address, and operational hours.
3. The application is moved to the `PendingDoctor` queue.
4. The system Admin logs in, verifies credentials, and clicks **Approve** or **Reject** with feedback.
5. The doctor receives an automated branded email notification upon approval.

Built for academic, clinical exploration, and telemedicine development in Bengaluru.  
All brand trademarks, provider listings, and hospital references belong to their respective holders.
