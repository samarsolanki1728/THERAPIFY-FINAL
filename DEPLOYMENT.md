# Separate Vercel projects

In the frontend Vercel project's Production environment, set `VITE_API_URL`
to the exact backend origin (for example, `https://your-backend.vercel.app`).
Use the origin, not `/api/health`. A trailing `/api` is also normalized by the
shared frontend configuration so requests contain `/api` once.

In the backend Vercel project's Production environment, set `FRONTEND_URL`
to the exact frontend origin (for example, `https://your-frontend.vercel.app`).
The backend allows that origin and `http://localhost:5173`, including
credentialed requests and Authorization headers. The events origin guard
uses the same allowlist. Arbitrary Vercel subdomains are not allowed.

Redeploy both projects after configuring their environment. Vite embeds
`VITE_API_URL` at build time, so a frontend rebuild is required after changes.
These URL settings are public configuration, not secrets. Keep existing
database, Gemini, JWT and encryption settings unchanged and server-only.

Local development defaults to frontend `http://localhost:5173` and backend
`http://localhost:5000`. An existing backend `PORT` setting still takes precedence;
if using another port, set frontend `VITE_API_URL` to match it.

Verify `/api/health` on the backend, then check the frontend browser Network
panel: requests should target the backend origin with a single `/api` prefix.
Test sign-in, chat, moods, journals, wellness, and events.

Run `npm test` in each project and `npm run build` in the frontend before deployment.
