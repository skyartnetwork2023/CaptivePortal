https://www.instagram.com/skyart_tech?igsh=bW5peHJxMnk3bHJl
# CaptivePortal

An Omada-compatible captive portal microsite that layers immersive visuals, sponsor slides, ambient audio, and a **voucher-only** authentication workflow. The layout is optimized for static hosting (Vercel, Azure Static Web Apps, S3 + CloudFront, etc.) while still talking to the Omada controller APIs.

## Highlights
- Voucher-only form that maps directly to TP-Link Omada voucher codes.
- Animated hero fed by local fallbacks or Supabase-hosted background scenes.
- Soundscape toggle that streams an ambient loop pulled from Supabase storage.
- Sponsor/ad rail with auto-sliding placements.
- Mobile-friendly layout with accessible labels and status messaging.

## Local preview
1. Serve the folder with a simple static server (e.g. `npx serve .`).
2. Visit `http://localhost:3000?previewSite=true` to load the UI shell.
3. Optional: append `&apiBase=https://controller.example.com:8043` to proxy calls to a reachable controller while previewing.

## Configuring controller endpoints
The portal script calls the Omada controller/gateway endpoints via a helper that prefixes every `/portal/*` path with a configurable base URL.

Options for defining the base:

1. **Inline global (recommended for Vercel),,:**
	```html
	<script>
	  window.__OMADA_PORTAL_BASE__ = 'https://controller.example.com:8043';
	</script>
	```
	Place it before the `index.js` include in [index.html](index.html). Use HTTPS and the same port you expose for the controller’s portal service.

2. **Query parameter:** append `?apiBase=https%3A%2F%2Fcontroller.example.com%3A8043` to the splash page URL in Omada.

3. **Legacy `controllerUrl` param:** Omada already injects this in some firmware versions; the helper will pick it up automatically.

When hosting outside the controller network make sure:
- The controller (or gateway) is reachable from client devices over the specified URL.
- The controller sends `Access-Control-Allow-Origin` for your portal domain (Omada 5.9+ already does this for External Portal Mode).

## Deploying to Vercel
1. Push this folder to GitHub (or import the repo directly in Vercel).
2. Create a new Vercel project:
	- **Framework preset:** `Other` (pure static).
	- **Build command:** `npm run build` *not required*; leave empty.
	- **Output directory:** `.`
3. Add an Environment Variable named `VITE_OMADA_BASE` **if** you plan to inject the URL at build time. Otherwise, edit [index.html](index.html) to hardcode `window.__OMADA_PORTAL_BASE__`.
4. Trigger the first deployment; you will get a public `https://<project>.vercel.app` URL.
5. Record the final custom domain (e.g. `portal.skyartnetwork.com`) — you will need it for the Omada External Portal configuration and the controller’s walled-garden list.

## Wiring into Omada (External Portal Mode)
1. In Omada Controller: **Settings → Authentication → Portal Customization**.
2. Switch to **External Web Portal** and paste the deployed Vercel URL (include `https://` and any required `apiBase` param).
3. Under **Authentication Type**, enable **Voucher** only (the portal UI exposes only that method).
4. Add the Vercel domain, `vercel.app`, `fonts.gstatic.com`, `fonts.googleapis.com`, and any external media hosts you use to **Walled Garden** so unauthenticated clients can download assets.
5. Apply the profile to the SSID(s), test with a client, and confirm the redirect hits your portal.

## Supabase media pipeline
1. Create a Supabase project and a **public** storage bucket (default: `portal-media`).
2. Upload hero imagery to `backgrounds/` and the audio loop to `audio/your-track.mp3` (folders are configurable).
3. Populate `window.__SUPABASE_CONFIG__` in [index.html](index.html) before `index.js`:

	 ```html
	 <script>
		 window.__SUPABASE_CONFIG__ = {
			 url: 'https://abccompany.supabase.co',
			 anonKey: 'public-anon-key',
			 assetBucket: 'portal-media',
			 backgroundPrefix: 'backgrounds',
			 audioObjectPath: 'audio/lounge.mp3',
			 audioTitle: 'Atrium Flow'
		 };
	 </script>
	 ```

4. The runtime pulls public URLs for every file under `backgroundPrefix` (up to 10) and swaps out `BACKGROUND_SLIDES`. The audio element is also rewritten to stream the Supabase object.
5. If the Supabase config is omitted or unreachable, the portal falls back to the hard-coded background list and bundled MP3.

## Customizing media + ads
- **Background scenes:** either rely on Supabase as noted above or edit the fallback `BACKGROUND_SLIDES` array in [index.js](index.js). Each entry accepts `{ source, caption }` (gradient strings or asset URLs).
- **Ad rail:** edit `PORTAL_ADS` (same file) for each placement. Provide `eyebrow`, `title`, `body`, `cta`, `link`, and `background` (gradient or url). The slider auto-plays every 9 seconds.
- **Audio loop:** point `audioObjectPath` in `window.__SUPABASE_CONFIG__` to a Supabase object or keep the bundled `media/skyart-lounge.mp3` fallback and update the `<audio>` tag's `data-track-title`.

## Notes on Omada form auth
The modal survey flow is still handled entirely by the stock controller API. Any custom cards created in Omada will render inside the redesigned modal. Styling for the modal lives at the bottom of [index.css](index.css).

## Troubleshooting
- **CORS errors:** confirm `window.__OMADA_PORTAL_BASE__` points to the controller using HTTPS and that the controller trusts the portal domain. Older firmware may need a reverse proxy that injects permissive CORS headers.
- **Assets not loading before login:** add every external host (Vercel domain, Supabase asset domain, Google Fonts) to Omada’s walled garden.
- **Supabase assets missing:** double-check the bucket policy is public, the `url`/`anonKey` pair is correct, and the referenced folder/object names exist.

- **Voucher rejection:** confirm the Omada site profile enables Voucher auth and that the code entered is still valid; every other method has been intentionally disabled in the UI.
