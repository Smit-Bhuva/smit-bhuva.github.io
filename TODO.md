# Eliminate Backend — Direct Web3Forms Frontend Call

- [x] 1. Update `index.html`: point form directly to Web3Forms, embed `access_key`, remove Turnstile container and backend data attributes.
- [x] 2. Refactor `assets/js/script.js`: strip Turnstile + backend-proxy logic, submit `FormData` directly to `https://api.web3forms.com/submit`.
- [x] 3. Delete backend files: `api/contact.js`, `contact.js`, `vercel.json`.
- [x] 4. Clean up `package.json`: remove `@vercel/analytics` dependency.
- [x] 5. Rewrite `DEPLOYMENT.md` for fully static (GitHub Pages) deployment.

