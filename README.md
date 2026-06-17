# 🎓 MindForge – Forge knowledge with AI

MindForge is a full-stack, AI-powered study platform that transforms documents into interactive learning experiences through RAG, AI chat, flashcards, and quizzes. By leveraging retrieval-augmented generation (RAG), vector databases, and large language models, it allows students to upload PDFs and semantically search, chat, summarize, and generate flashcards or quizzes from their study materials.

**Frontend:** React (Vite), TypeScript, Tailwind CSS (v4), TanStack React Query  
**Backend:** Node.js, Express, TypeScript  
**Database:** PostgreSQL (Neon) with `pgvector` extension  
**ORM:** Prisma  
**Authentication:** Supabase Auth (Client + Server SDKs)  
**File Storage:** Supabase Storage Bucket  
**AI Integration:** Google Gemini API (`gemini-2.5-flash` & `gemini-embedding-2`)  
**PDF Export:** jsPDF

---

## 🚀 Features

### 🔐 Authentication

- Secure Email & Password Sign Up / Login
- Secure password recovery (Forgot Password & Reset Password flows)
- Profile mapping inside PostgreSQL synced automatically via Supabase UUIDs
- Secure JWT-based request authorization using Express middleware

### 📚 Subject & Resource Management

- Organize study materials into customizable, color-tagged **Subjects**
- Create, update, and delete subjects with custom names and descriptions
- Visual tag indicators to quickly identify categorized study assets

### 📄 Intelligent Document Processing

- Upload lecture notes & PDF textbooks (supports files up to 10MB)
- Automated page-by-page text extraction (`pdf-parse`)
- Text chunking using semantic word-boundary preservation logic
- High-performance vector embeddings generation using Google Gemini embedding API
- Automated storage persistence inside Supabase Storage bucket

### 💬 Scoped RAG AI Chat

- Create multi-session chat history scoped to specific subjects or individual files
- Performs real-time semantic query expansion and context retrieval
- Shows interactive, verified citations linking answer text to specific source PDFs and page numbers
- Maintained chat sessions with historical memory for logical query progression

### 📇 AI Flashcards

- Generate sets of study flashcards directly from PDF contents using Gemini AI
- Responsive, interactive flipping card UI for self-testing and active recall
- Add or remove flashcards seamlessly under subjects

### 📝 AI Quizzes

- Build dynamic multiple-choice study quizzes from uploaded notes
- Interactive quiz environment with score tracking upon completion

### 📄 Document Summary Export

- Instantly request complete AI-generated summaries of your PDF documents
- Read summaries via an overlay modal or export them as beautifully structured PDFs with professional margins and page numbers using `jsPDF`

---

## 🏗 Project Structure

```bash
📦 MindForge
├─ .gitignore
├─ README.md
├─ backend
│  ├─ .env.example
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ prisma
│  │  ├─ migrations
│  │  └─ schema.prisma
│  ├─ prisma.config.ts
│  └─ src
│     ├─ app.ts
│     ├─ index.ts
│     ├─ config
│     │  ├─ db.ts
│     │  ├─ gemini.ts
│     │  └─ supabase.ts
│     ├─ controllers
│     │  ├─ auth.controller.ts
│     │  ├─ chat.controller.ts
│     │  ├─ document.controller.ts
│     │  ├─ flashcard.controller.ts
│     │  ├─ quiz.controller.ts
│     │  └─ subject.controller.ts
│     ├─ middlewares
│     │  ├─ auth.middleware.ts
│     │  ├─ error.middleware.ts
│     │  └─ upload.middleware.ts
│     ├─ routes
│     │  ├─ index.ts
│     │  ├─ auth.routes.ts
│     │  ├─ chat.routes.ts
│     │  ├─ document.routes.ts
│     │  ├─ flashcard.routes.ts
│     │  ├─ quiz.routes.ts
│     │  └─ subject.routes.ts
│     ├─ services
│     │  ├─ gemini.service.ts
│     │  ├─ gemini.ts
│     │  ├─ pdf.service.ts
│     │  ├─ rag.service.ts
│     │  └─ supabase.service.ts
│     ├─ types
│     │  └─ express.d.ts
│     └─ validators
│        └─ auth.validator.ts
└─ frontend
   ├─ .env.example
   ├─ eslint.config.js
   ├─ index.html
   ├─ package.json
   ├─ tsconfig.json
   ├─ vite.config.ts
   └─ src
      ├─ App.css
      ├─ App.tsx
      ├─ index.css
      ├─ main.tsx
      ├─ components
      │  └─ ErrorBoundary.tsx
      ├─ config
      │  └─ env.ts
      ├─ context
      │  └─ AuthContext.tsx
      ├─ layouts
      │  └─ DashboardLayout.tsx
      ├─ lib
      │  ├─ queryClient.ts
      │  ├─ supabase.ts
      │  └─ utils.ts
      ├─ services
      │  └─ api.ts
      └─ features
         ├─ auth
         │  └─ pages
         │     ├─ ChangePasswordModal.tsx
         │     ├─ ForgotPasswordPage.tsx
         │     ├─ LoginPage.tsx
         │     ├─ ResetPasswordPage.tsx
         │     └─ SignupPage.tsx
         └─ subjects
            └─ pages
               ├─ DashboardPage.tsx
               └─ SubjectDetailPage.tsx
```

---

## ⚙️ Backend Setup

### 1️⃣ Install dependencies

```bash
cd backend
npm install
```

### 2️⃣ Create `.env`

Create a `.env` file in the `backend/` directory matching the following structure:

```env
PORT=5000
NODE_ENV=development

# Neon PostgreSQL Database with pgvector extension enabled
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

# Supabase Project API Settings (Required for authentication verification & file buckets)
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-public-key"

# Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"
```

### 3️⃣ Setup Prisma and Database Migrations

Generate Prisma types and run migrations to install schemas and set up vector columns:

```bash
npx prisma generate
npx prisma migrate dev
```

### 4️⃣ Run backend

```bash
npm run dev
```

---

## 🎨 Frontend Setup

### 1️⃣ Install dependencies

```bash
cd frontend
npm install
```

### 2️⃣ Create `.env`

Create a `.env` file in the `frontend/` directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-public-key"

# Backend API Endpoint URL
VITE_API_URL="http://localhost:5000/api"
```

### 3️⃣ Run frontend

```bash
npm run dev
```

---

## 🔑 Authentication Architecture

- **Identity Management:** Managed entirely via Supabase Auth. It handles password protection, session expiry, token exchange, and OAuth integrations.
- **Client Side:** Supabase Auth stores user tokens securely. These tokens are passed dynamically as a bearer token (`Authorization: Bearer <token>`) inside API request headers handled by Axios.
- **Server Side:** Express authentication middleware intercepts routes, extracting the token and validating it directly with Supabase via `supabase.auth.getUser(token)`.
- **Database Profiles:** Active profiles are synchronized under the `Profile` model in PostgreSQL mapping the Supabase user identity UUID.

---

## 📚 RAG Pipeline & AI Workflows

### 📥 1. Document Indexing Flow

1. **Upload:** User uploads a PDF file through the frontend UI.
2. **Storage:** The backend uploads the file raw binary buffer to a Supabase Storage bucket, caching public URLs.
3. **Extraction:** `pdf-parse` reads the PDF, mapping page contents and page numbers.
4. **Preserved Chunking:** Chunks are sliced at overlapping intervals (`1000` chars length, `200` overlap) using string-boundary checks to prevent text splitting in the middle of words.
5. **Batch Embedding:** Chunks are grouped and sent to Gemini (`gemini-embedding-2`) to generate corresponding `768`-dimensional embedding vectors.
6. **Vector Batching:** Chunks with embeddings are saved using Prisma raw transactions to store the vector embeddings in the `DocumentChunk` table.

### 💬 2. Retrieval-Augmented Generation (RAG) Chat

1. **User Query:** User sends a query scoped to their active subject or document.
2. **Embedding:** The query text is converted to a vector embedding.
3. **Similarity Search:** A raw SQL query is executed on the database calculating cosine distance:
   ```sql
   SELECT c.id, c.content, c."pageNumber", d.name
   FROM "DocumentChunk" c
   INNER JOIN "Document" d ON c."documentId" = d.id
   ORDER BY c.embedding <=> $1::vector
   LIMIT 5
   ```
4. **Context Injection:** Retained text chunks are injected into a prompt instructions template.
5. **Generation:** `gemini-2.5-flash` receives the query, history, and context, compiling a final response with inline references.
6. **Citations:** Source metadata (document name, page number) is extracted and passed to the frontend for precise user-facing citation links.

---

## 🧠 Technologies Used

- **React + Vite + TypeScript**
- **Tailwind CSS (v4)**
- **Express + Node.js**
- **Prisma ORM**
- **PostgreSQL (Neon)** with `pgvector`
- **Supabase** (Authentication & Storage Buckets)
- **Google Gemini API** (`gemini-2.5-flash` text gen & `gemini-embedding-2` embedding generator)
- **TanStack React Query** (Client-side state synchronization, query caching)
- **jsPDF** (Dynamic summary layout compilation & export)
- **PDF-Parse** (Server-side text parsing)
- **Zod & React Hook Form** (Form validations)

---

## 💻 Author

**Sayanth Krishna**  
Full Stack Developer  
Calicut, India
