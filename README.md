# Verio — Secure Financial Extraction & Verification

> A workspace-isolated financial transaction extractor built with Next.js 15, Better Auth, Neon PostgreSQL, and Prisma.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-green?style=flat-square&logo=postgresql)
![Better Auth](https://img.shields.io/badge/Better--Auth-Latest-purple?style=flat-square)

---

## Features

- **Transaction Parsing** — Paste raw bank SMS/statements and get structured ledger entries instantly
- **Workspace Isolation** — All data is strictly scoped per organisation (IDOR-safe)
- **Multi-Member Workspaces** — Invite team members via email with pending invite tracking
- **Google OAuth** — Sign in with Google with automatic account linking
- **Forgot / Reset Password** — Email-based password reset via SMTP or Resend
- **Activity Log** — Full audit trail of all workspace actions
- **Workspace Settings** — Rename workspace, manage members and roles
- **Role-Based Access** — Owner and Member roles with enforced permissions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Auth | Better Auth |
| Database | Neon PostgreSQL |
| ORM | Prisma |
| API | Hono (on Next.js edge) |
| Styling | Tailwind CSS |
| Email | Nodemailer (SMTP) / Resend |
| Testing | Jest |

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

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
DATABASE_URL="postgresql://..."          # Neon PostgreSQL connection string
BETTER_AUTH_SECRET="..."                 # 32+ char random secret (openssl rand -base64 32)
BETTER_AUTH_URL="http://localhost:3000"  # App base URL

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email — SMTP (Gmail App Password)
EMAIL_FROM="Verio <you@gmail.com>"
EMAIL_SMTP_HOST="smtp.gmail.com"
EMAIL_SMTP_PORT="465"
EMAIL_SMTP_USER="you@gmail.com"
EMAIL_SMTP_PASS="your-app-password"

APP_URL="http://localhost:3000"
```

---

## Project Structure

```
src/
├── app/
│   ├── api/[[...route]]/   # Hono API routes
│   ├── dashboard/          # Main parse interface
│   ├── transactions/       # Transaction ledger
│   ├── members/            # Workspace members & invites
│   ├── activity-log/       # Audit log
│   ├── settings/           # Workspace settings
│   ├── login/              # Auth pages
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   └── complete-setup/     # Google OAuth onboarding
├── components/
│   ├── Sidebar.tsx
│   ├── Navbar.tsx
│   └── Brand.tsx
└── utils/
    ├── auth.server.ts      # Better Auth config
    ├── auth-client.ts      # Client-side auth
    ├── db.server.ts        # Prisma client
    ├── email.ts            # Email sending
    └── parser.ts           # Transaction parser
prisma/
└── schema.prisma           # Database schema
__tests__/
├── extraction.test.ts      # Parser unit tests
└── auth-isolation.test.ts  # IDOR isolation tests
```

---

## Running Tests

```bash
npm test
```

---

## Deployment

This app is ready for deployment on **Vercel** or any Node.js hosting platform.

1. Set all environment variables in your hosting dashboard
2. Set `BETTER_AUTH_URL` to your production domain
3. Add your production domain to **Google OAuth Authorized Redirect URIs**:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```
4. Deploy with `npm run build`

---

## License

MIT
