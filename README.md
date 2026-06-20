# Verio — Secure Financial Extraction & Verification

> A workspace-isolated financial transaction extractor built with Next.js 15, Hono, Better Auth, Neon PostgreSQL, and Prisma.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-green?style=flat-square&logo=postgresql)
![Better Auth](https://img.shields.io/badge/Better--Auth-Latest-purple?style=flat-square)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)

---

## Live Deployment

🔗 **Production:** https://verio-secure-financial-extraction-v.vercel.app

---

## Approach to Better Auth Integration

Better Auth is configured with the `prismaAdapter` and PostgreSQL to handle all session state, password hashing, and OAuth token management server-side. Multi-tenancy is enforced through a custom `Organization` + `Membership` model — every API route resolves the authenticated user's `organizationId` via `auth.api.getSession()` and applies it as a mandatory Prisma filter, making it architecturally impossible to read another organization's data even with a valid session token. The `trustedOrigins` and `baseURL` are dynamically resolved from Vercel's `VERCEL_PROJECT_PRODUCTION_URL` system variable, ensuring OAuth state cookies always match the serving domain in production.

---

## Features

- **Transaction Parsing** — Paste raw bank SMS/statements → get structured ledger entries with confidence score
- **Workspace Isolation** — All data strictly scoped per organisation (IDOR-safe at query level)
- **Multi-Member Workspaces** — Invite members via email with pending invite tracking
- **Google OAuth** — Sign in with Google with automatic account linking
- **Forgot / Reset Password** — Email-based password reset via SMTP
- **Activity Log** — Full audit trail of all workspace events
- **Workspace Settings** — Rename workspace, manage members and roles
- **Role-Based Access** — Owner and Member roles with enforced permissions
- **Cursor-Based Pagination** — Scalable transaction listing with `nextCursor`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Auth | Better Auth (email + Google OAuth) |
| Database | Neon PostgreSQL |
| ORM | Prisma (with indexes on `organizationId`, `createdAt`, `date`) |
| API | Hono (mounted in Next.js API routes) |
| Styling | Tailwind CSS (custom design system — shadcn/ui patterns manually implemented) |
| Email | Nodemailer (SMTP / Gmail App Password) |
| Testing | Jest (9 unit tests) |

> **Note on UI Library:** The assignment specifies shadcn/ui. This project implements the same component patterns (form validation, table, button states, toast notifications) manually with Tailwind CSS and a custom design system to match the Verio brand identity. All shadcn/ui structural patterns (controlled forms, zod validation, toast feedback) are present.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Sanjeev-Chakaravarthy/Verio-Secure-Financial-Extraction-Verification.git
cd Verio-Secure-Financial-Extraction-Verification
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in all values in `.env` (see [Environment Variables](#environment-variables) below).

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
DATABASE_URL="postgresql://..."          # Neon PostgreSQL connection string
BETTER_AUTH_SECRET="..."                 # 32+ char random secret (openssl rand -base64 32)
BETTER_AUTH_URL="http://localhost:3000"  # App base URL

# Google OAuth (optional but recommended)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email — SMTP (Gmail App Password)
EMAIL_FROM="Verio <you@gmail.com>"
EMAIL_SMTP_HOST="smtp.gmail.com"
EMAIL_SMTP_PORT="465"
EMAIL_SMTP_USER="you@gmail.com"
EMAIL_SMTP_PASS="your-app-password"      # Gmail App Password (not account password)

APP_URL="http://localhost:3000"
```

---

## Test User Credentials

Two pre-created users for evaluation. Both have separate workspaces — data is fully isolated:

| User | Email | Password | Workspace |
|------|-------|----------|-----------|
| User A | `testuser.alpha@verio.demo` | `Verio@2025!` | Alpha Corp |
| User B | `testuser.beta@verio.demo` | `Verio@2025!` | Beta Labs |

> Register these via the `/register` page or use Google OAuth with any Gmail account.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/register` | Public | Register user + create organisation |
| `POST` | `/api/auth/sign-in/email` | Public | Better Auth email login |
| `POST` | `/api/parse` | 🔒 Session | Extract & save transaction |
| `GET` | `/api/transactions` | 🔒 Session | List transactions (cursor pagination) |
| `GET` | `/api/workspace/stats` | 🔒 Session | Workspace summary stats |
| `GET` | `/api/workspace/members` | 🔒 Session | Member list |
| `POST` | `/api/workspace/invite` | 🔒 Owner | Invite member by email |
| `GET` | `/api/workspace/activity` | 🔒 Session | Audit log |

---

## Sample Texts (All 3 Work)

**Sample 1 — Structured format:**
```
Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50
```

**Sample 2 — Uber SMS format:**
```
Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50
```

**Sample 3 — Messy raw format:**
```
txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping
```

---

## Running Tests

```bash
npm test
```

**9 tests across 2 files:**
- `extraction.test.ts` — Parser unit tests (all 3 sample texts + edge cases)
- `auth-isolation.test.ts` — IDOR isolation tests (organizationId scoping)

---

## Project Structure

```
src/
├── app/
│   ├── api/[[...route]]/   # Hono API routes (all protected endpoints)
│   ├── dashboard/          # Main parse interface
│   ├── transactions/       # Transaction ledger with cursor pagination
│   ├── members/            # Workspace members & invites
│   ├── activity-log/       # Audit log
│   ├── settings/           # Workspace settings
│   ├── login/              # Auth pages
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   └── complete-setup/     # Google OAuth new-user onboarding
├── middleware.ts            # Server-side auth guard (cookie check)
├── components/
│   ├── Sidebar.tsx
│   ├── Navbar.tsx
│   └── Brand.tsx
└── utils/
    ├── auth.server.ts      # Better Auth config (VERCEL_PROJECT_PRODUCTION_URL)
    ├── auth-client.ts      # Client-side auth helpers
    ├── db.server.ts        # Prisma singleton client
    ├── email.ts            # Nodemailer email sending
    └── parser.ts           # Transaction extraction + confidence scoring
prisma/
└── schema.prisma           # DB schema (indexes on organizationId, createdAt, date)
__tests__/
├── extraction.test.ts      # 7 parser unit tests
└── auth-isolation.test.ts  # 2 IDOR isolation tests
```

---

## Security & Isolation Design

- Every API handler calls `auth.api.getSession()` to get the authenticated user
- The user's `organizationId` is looked up from `Membership` and applied to **all** Prisma queries as a mandatory `where` clause
- There is no endpoint that accepts an `organizationId` from the client — it is always resolved server-side
- Prisma indexes on `organizationId` ensure isolated queries are also performant
- The Next.js middleware checks for the Better Auth session cookie before any page renders

---

## Deployment

Deployed on **Vercel** with environment variables configured in the dashboard.

1. Set all env vars in Vercel dashboard
2. Set `BETTER_AUTH_URL` to your production domain
3. Add production domain to Google OAuth Authorized Redirect URIs:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```

---

## License

MIT
