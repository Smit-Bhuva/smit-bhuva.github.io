# Serverless Contact Setup

This project now sends contact form submissions to a serverless endpoint at `/api/contact`.

If your frontend is hosted on GitHub Pages and backend is on Vercel, set `data-api-url` on the contact form to your deployed Vercel endpoint, for example:

```html
<form ... action="/api/contact" data-api-url="https://your-project.vercel.app/api/contact">
```

## 1) Deploy to Vercel

This repository includes a Vercel serverless function:
- `api/contact.js`

## 2) Configure Environment Variables in Vercel

Set these in your Vercel project settings:

- `WEB3FORMS_ACCESS_KEY` (required)
- `TURNSTILE_SECRET_KEY` (optional but recommended)

## 3) Configure Turnstile Site Key in Frontend (Optional)

In `index.html`, set `data-turnstile-site-key` on the form:

```html
<form ... data-turnstile-site-key="YOUR_TURNSTILE_SITE_KEY">
```

If left empty, CAPTCHA is disabled on the frontend.

## 4) Rate Limiting

The API includes an in-memory per-IP rate limit:
- 5 requests per minute

Note: in-memory limits are best-effort for serverless environments and may vary across instances.

## 5) Local Development

For local testing, add variables to `.env.local` (not committed), then run via Vercel CLI.

```bash
vercel dev
```

## 6) Security Notes

- The Web3Forms key is now server-side only.
- Honeypot and basic validation are enabled.
- Optional Turnstile verification is enforced when `TURNSTILE_SECRET_KEY` is configured.

## 7) Cross-origin support

The contact API includes CORS handling and OPTIONS preflight support so your GitHub Pages frontend can call your Vercel backend.
