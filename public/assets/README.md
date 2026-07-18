# Static assets

Files in `public/` are served by Vite as-is from the site root.

- `images/` — photos, illustrations, og-images  → reference as `/assets/images/<file>`
- `icons/`  — favicons, logo marks, svg icons   → reference as `/assets/icons/<file>`
- `fonts/`  — self-hosted font files            → reference as `/assets/fonts/<file>`
- `videos/` — video / animation files           → reference as `/assets/videos/<file>`

Example: `<img src="/assets/images/hero.png" alt="" />`

Note: assets that are imported by components (and should be hashed/optimized
by the build) belong in `src/` instead, e.g. `import logo from '@/assets/logo.svg'`.
