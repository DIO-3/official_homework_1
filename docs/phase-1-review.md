# Phase 1 review

## Starter baseline

Installed backend dependencies with `npm ci` and ran the original Express server on port 3000 before changing the frontend. API checks passed for searching the existing testuser, adding and finding a temporary student, deleting that student, returning 404 for a missing student, and returning 400 for missing required fields. Original student data was restored after testing.

Existing gaps found by code review: duplicate IDs are accepted; names are matched exactly; deletion identifies students by name; courses.html contains only navigation; there are no course or enrollment endpoints. The old search result used innerHTML with database values. Vue now renders those values as text.

## Vue foundation

Added Vue 3, Vue Router, Pinia, Vite, and a lockfile. Views, reusable components, shared notices, and HTTP requests have separate folders. All frontend logic uses the Composition API. The Students view preserves add, search, display, and delete against the unchanged starter API. Courses and Enrollments are placeholders for later phases. Removed the old DOM script and empty course HTML page.

## Run this phase

Requires Node 20.19+ or 22.12+ with npm. Tested with Node 26.8.2.

Terminal 1, from the repository root:

```sh
cd backend
npm ci
node server.js
```

Terminal 2, from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies API requests to port 3000.

## Verification

- `npm run build --prefix frontend` passes.
- Browser: Students page renders; existing student search and temporary student creation/search pass.
- Browser automation stalled on the native delete confirmation. Temporary data was removed through the API and the original students.json was verified and restored byte for byte. The backend delete operation passed separately; browser confirmation remains a manual review item.
- Direct Students, Courses, and Enrollments routes render. Browser click navigation could not be verified after the stuck confirmation; manually check the three navigation links during review.

MongoDB, duplicate protection, full course/enrollment functionality, final styling, and Express production serving belong to later phases. The real local .env will be added and unignored in Phase 2.
