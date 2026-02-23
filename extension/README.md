# Craveo Chrome Extension

Quick access to your saved lists without visiting the site.

## Setup

1. **Configure environment**

   Copy `.env.example` to `.env` and fill in (use the same values as the main app's `.env.local`):

   ```bash
   cp .env.example .env
   ```

   Required:
   - `VITE_SUPABASE_URL` — from `NEXT_PUBLIC_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` — from `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_APP_URL` — e.g. `http://localhost:3000` or your production URL

2. **Build**

   ```bash
   cd extension
   npm install
   npm run build
   ```

3. **Load in Chrome**

   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

## Usage

- Click the extension icon to open the popup
- Sign in with your Craveo email/password
- View and open your saved lists
- Use "Site URL" to configure the Craveo URL (defaults to localhost or your build-time `VITE_APP_URL`)

## Supabase Redirect URL (for Google OAuth)

If you add Google sign-in later, add this to Supabase Auth → URL Configuration → Redirect URLs:

```
chrome-extension://YOUR_EXTENSION_ID/auth.html
```

Get your extension ID from `chrome://extensions` (it appears under the extension name when Developer mode is on).
