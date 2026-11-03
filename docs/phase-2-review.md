# Phase 2 review

Phase 2 replaces the JSON database with local MongoDB and adds the complete student, course, and enrollment API. The Phase 1 student page still works. Full course and enrollment screens are part of Phase 3.

## Run locally

Use Node.js 20.19 or newer and MongoDB Community Edition. MongoDB must be running on 127.0.0.1:27017. On this Mac it is already installed through Homebrew and running. If needed, start it with:

```sh
brew services start mongodb-community@8.0
```

The tracked `backend/.env` contains only local configuration:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/cis3339_homework1
PORT=3000
```

From the repository root:

```sh
cd backend
npm ci
npm start
```

The backend listens at http://localhost:3000. It loads `.env` relative to server.js, so starting it from another directory also works. Existing shell environment values can override these settings for isolated testing. The server creates collections and indexes before it accepts requests. Do not run database creation, seed, import, or migration commands.

Run the Vue interface in a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite forwards the current frontend requests to the backend. Express serving of the production build is scheduled for Phase 4.

## API

IDs are nonempty strings. A student has `id`, `name`, `phone`, and `zip`. A course has `id` and `name`. An enrollment has `studentId` and `courseId`. Text is trimmed; limits are 64 characters for IDs, 200 for names, 40 for phone, and 20 for ZIP. Returned records also include MongoDB `_id` values; use the assignment `id` in API paths.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | /api/health | Database readiness |
| GET | /api/students | All students; optional `?search=` matches name or ID |
| GET | /api/students/:id | One student |
| POST | /api/students | Add a student |
| DELETE | /api/students/:id | Delete a student and their enrollments |
| GET | /api/courses | All courses |
| GET | /api/courses/:id | One course |
| POST | /api/courses | Add a course |
| DELETE | /api/courses/:id | Delete a course and its enrollments |
| POST | /api/enrollments | Enroll an existing student in an existing course |
| GET | /api/courses/:id/students | List enrolled students |

Encode IDs used in URLs, for example `CIS%203339`. Lists return arrays; individual GET requests return records. Successful additions return 201 with a message and a `student`, `course`, or `enrollment` property. Deletions return 200 with a message and the removed record. Errors return `{ "error": "..." }`: 400 for invalid input, 404 for missing records, 409 for duplicates, 413 for oversized bodies, and 503 when MongoDB is unavailable.

The starter `/add-student`, `/find-student`, and `/delete-student` endpoints remain supported, including under `/api`, so Phase 1 keeps working. Exact-name search remains available there. Deletion now uses student ID in the Vue page. Legacy name-only deletion rejects ambiguous names instead of deleting an arbitrary student.

## Data integrity

Mongoose schemas validate all three collections. MongoDB unique indexes enforce student IDs, course IDs, and student/course enrollment pairs. Startup explicitly waits for collections and indexes to exist, including on an empty database.

All API writes run through one queue in the Express process. Enrollment checks and insertion cannot interleave with student or course deletion. Deletes remove enrollments before removing their parent, so a failed parent deletion cannot leave an orphan enrollment. This design targets the assignment's single local backend process and standalone MongoDB; multiple backend processes writing to the same database are outside this phase's deployment model. No replica set or transaction setup is required.

Removed students.json; the application no longer reads or writes JSON files for persistence. The old template record is not imported automatically. The assignment database starts empty.

## Verification

Run `npm test` from backend with local MongoDB running. Tests generate an isolated database named `cis3339_hw1_test_<random UUID>`, initialize it through normal startup code, and remove only that database afterward. They do not modify the assignment database.

Verified against MongoDB Community Edition 8.0.32:

- All 18 backend tests pass, covering automatic initialization, schemas/indexes, validation, duplicate IDs and enrollments, literal-text search, rosters, both cascades, concurrent requests, legacy student endpoints, and JSON errors.
- A separate server-process test starts against a nonexistent database, creates student/course/enrollment records through HTTP, stops the server, restarts it, and verifies the saved student and roster.
- A failed MongoDB connection exits cleanly with a useful startup message; disconnected requests return JSON 503 and recover after reconnecting.
- `npm run build --prefix frontend` passes after the student deletion request was changed to identify its record by ID.
- Compatible patches to the starter dependencies leave `npm audit` with zero reported vulnerabilities.
- No JSON-file persistence remains. Temporary test databases are removed after their tests.

Mongoose index initialization and standalone MongoDB behavior were checked against the [Mongoose schema documentation](https://mongoosejs.com/docs/guide.html#indexes) and [MongoDB transaction documentation](https://www.mongodb.com/docs/v8.0/core/transactions-production-consideration/).
