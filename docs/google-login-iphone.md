# Google login through the frontend domain

The Vercel rewrites in `frontend/vercel.json` proxy API and OAuth requests to
`https://aptisesol-production.up.railway.app`. The browser must start and finish
OAuth on the same frontend host so the OAuth session and JWT cookies belong to
that host instead of a third-party Railway site.

## Deployment

1. Deploy the backend and frontend changes in this checkout.
2. In Google Cloud, open the OAuth web client and add this Authorized redirect URI
   (retain the old URI until migration is verified):
   `https://www.aptislingo.site/login/oauth2/code/google`.
3. Set these Railway backend variables and redeploy:

   ```env
   FRONTEND_URL=https://www.aptislingo.site
   GOOGLE_REDIRECT_URI=https://www.aptislingo.site/login/oauth2/code/google
   AUTH_COOKIE_SECURE=true
   SERVER_SERVLET_SESSION_COOKIE_SECURE=true
   SERVER_SERVLET_SESSION_COOKIE_SAME_SITE=lax
   ```

   Include `https://www.aptislingo.site` in `APP_CORS`, preserving other required
   origins. Spring CORS validation still applies to proxied requests carrying an
   Origin header.

4. On the Vercel frontend project, set `VITE_API_URL=/api` for Production and
   redeploy. Vite embeds this value at build time.
5. Start login from `https://www.aptislingo.site`. Keep the apex domain redirect
   to `www` so the host remains consistent.

## Verification

- Open `/api/ui-settings` to check that the proxy returns API data, not HTML.
- Google authorization's `redirect_uri` must be the exact frontend URI above.
- `/oauth2/authorization/google` must set the session cookie on the frontend host.
- The callback `/login/oauth2/code/google` must receive that same session cookie
  and set the auth cookies before redirecting to `/oauth2/callback`.
- `/api/auth/session` must return 200 on iPhone and desktop after login.

Local development can keep `VITE_API_URL=http://localhost:8080/api` and omit
`GOOGLE_REDIRECT_URI` to retain Spring's default redirect URI template.
Deployment and real-device OAuth verification must be completed separately;
local builds do not verify Vercel cookie forwarding or Google Cloud settings.
