# Esscentra — Auth Frontend

Production-ready **authentication frontend** for the Esscentra platform (Phase 1).
Built with **React + Vite + TypeScript**, a dark glassmorphism UI, and smooth motion via Framer Motion.

It covers the full auth surface: **register, email verification, login, logout, forgot
password, reset password, and profile management** (edit details, change password, avatar
upload, sessions).

> This build runs in **fully-mocked mode** — a simulated backend lives in the browser
> (`src/lib/mockApi.ts`) with realistic latency, validation, and error messages. No server
> required. The function shapes mirror the real Esscentra REST API so wiring axios later is
> a drop-in change.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Build & preview the production bundle:

```bash
npm run build
npm run preview
```

### Demo account

```
email:    demo@esscentra.com
password: Password123
```

On the login screen, **“Fill demo credentials”** drops these in for you.

---

## Try the flows

- **Register** → after submitting you’ll see a *Simulated email* card with a one-click
  **Verify email** link (real apps email this).
- **Verify email** → opens `/verify-email?token=…`, confirms the account, then routes to login.
- **Forgot password** → returns a *Simulated email* card with a **Reset password** link.
- **Reset password** → opens `/reset-password?token=…`; tokens are one-time and time-limited.
- **Profile** (protected) → edit name/phone/bio, upload a photo, change your password, sign out.

All data persists in `localStorage` so accounts survive a refresh. To wipe everything, clear
site data or run `localStorage.clear()` in the console.

---

## Tech

| Area | Choice |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript (strict) |
| Styling | Tailwind CSS, custom glassmorphism + aurora background |
| Animation | Framer Motion (page, toast, tabs, micro-interactions) |
| Forms | React Hook Form + Zod validation |
| Icons | lucide-react |
| Routing | React Router v6 with guarded routes |

## Project structure

```
src/
├── components/        # AuthLayout, AuroraBackground, Logo, ProtectedRoute, DevLinkNotice…
│   └── ui/            # Button, Input, Toast (design-system primitives)
├── context/           # AuthContext (session + user state)
├── lib/               # mockApi (simulated backend), validation (zod), utils
├── pages/             # Login, Register, VerifyEmail, ForgotPassword, ResetPassword, Profile
├── types/             # shared TypeScript types
├── App.tsx            # routes
└── main.tsx           # providers + entry
```

---

## Going live (wiring the real backend)

The mock mirrors these documented endpoints (`/api/v1`):

| Mock function | Real endpoint |
|---|---|
| `register` | `POST /auth/register` |
| `verifyEmail` | `GET /auth/verify-email/:token` |
| `login` | `POST /auth/login` |
| `logout` | `POST /auth/logout` |
| `me` | `GET /auth/me` |
| `forgotPassword` | `POST /auth/forgot-password` |
| `resetPassword` | `POST /auth/reset-password/:token` |
| `updateProfile` | `PUT /users/profile` |
| `updateAvatar` | `PATCH /users/profile-image` |
| `changePassword` | `PATCH /users/change-password` |

To switch over: replace the bodies in `src/lib/mockApi.ts` with `fetch`/axios calls to
`import.meta.env.VITE_API_BASE_URL`, keep the same return shapes, and delete the
`DevLinkNotice` component (links arrive by real email). Refresh tokens should move to an
httpOnly cookie. See `.env.example`.

---

© 2026 Esscentra. Private project.
