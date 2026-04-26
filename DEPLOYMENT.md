# Static Site Deployment

This is a fully static portfolio site. It can be hosted on any static hosting service such as **GitHub Pages**, **Netlify**, **Vercel (static)**, or **Cloudflare Pages**.

## Contact Form

The contact form submits directly to **Web3Forms** from the browser — no backend or serverless function is required.

The form already includes the required access key:

```html
<input type="hidden" name="access_key" value="6b12563a-c69c-4923-ac9b-a1033947ef98">
```

If you ever need to rotate the key, update the `value` above in `index.html` and generate a new key at [web3forms.com](https://web3forms.com/).

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Select the branch you want to publish (usually `main`).
4. Your site will be live at `https://<username>.github.io/<repo>/`.

No build step or environment variables are needed.

