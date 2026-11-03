# CIS 3339 Homework 1: Vue 3 and MongoDB Migration

## Assignment Overview

In this assignment, you will migrate the provided Student Management System into a modern full-stack enterprise application.

The starter project contains a Node.js/Express backend and a frontend written with HTML and JavaScript. Your job is to:

- migrate **all frontend functionality** to **Vue 3 using the Composition API**;
- replace JSON-file storage with **MongoDB**;
- complete the student, course, and enrollment features; and
- create a production build that can be run and tested on `localhost`.

Do not remove working features during the migration.

## Learning Objectives

After completing this assignment, you should be able to:

- build a component-based frontend with Vue 3;
- manage reactive state and application logic with the Composition API;
- create and consume REST API endpoints;
- model related data in MongoDB;
- maintain referential integrity among students, courses, and enrollments; and
- build and locally deploy a full-stack application.

## Prerequisites

- Node.js and npm
- MongoDB Community Edition running locally
- A modern web browser
- Basic knowledge of JavaScript, Vue, Node.js, Express, REST APIs, and MongoDB

## AI Tools

You can use AI development tools, such as Visual Studio Code with GitHub Copilot or other AI tools. You are responsible for understanding, testing, and being able to explain all submitted code.

---

## Part 1: Run and Review the Starter Code

Before making changes, review the existing files in `backend/` and `frontend/` and run the starter application.

### Run the Backend

```bash
cd backend
npm install
node server.js
```

The starter server runs at `http://localhost:3000`.

### Review the Frontend

Open the files in `frontend/` and identify how the current pages call the backend. The starter frontend uses plain HTML and JavaScript; it is provided only as the starting point for your Vue migration.

Verify the existing student search and add functionality before you begin. This gives you a known baseline for testing the migrated application.

---

## Part 2: Required Implementation

### Requirement 1: Migrate the Frontend to Vue 3

Replace the plain HTML/JavaScript frontend with a Vue 3 application.

Your Vue application must:

- use a standard npm-based Vue project structure;
- use **Vue 3 Composition API** for all frontend functionality;
- use **Vue Router** to provide client-side navigation between the application's main views;
- use **Pinia** for shared application state where state must be accessed or updated by multiple components or views;
- organize the interface into appropriate reusable components;
- use reactive Vue state, computed values, lifecycle hooks, and event handlers where appropriate;
- call the Express backend through HTTP requests;
- display useful success, validation, loading, and error feedback; and
- contain no application logic in legacy standalone DOM-manipulation scripts.

Do not use the Vue Options API (`data`, `methods`, `computed`, and similar component options) to implement assignment functionality.

### Requirement 2: Student Management

The Vue application must allow a user to:

- add a student with a name, student ID, phone number, and ZIP code;
- search for a student;
- display student information; and
- delete a student.

Validate required fields and prevent duplicate student IDs.

### Requirement 3: Course Management

The Vue application must allow a user to:

- add a course with a course ID and course name;
- list all courses; and
- delete a course.

Validate required fields and prevent duplicate course IDs.

The example images in `images/` may be used as a reference for the expected features. You may redesign the interface.

### Requirement 4: Enrollment Management

The Vue application must allow a user to:

- select an existing student and an existing course;
- enroll the selected student in the selected course;
- prevent duplicate enrollments; and
- select a course and list all students enrolled in it.

Student and course selections must be populated from data returned by the backend rather than hard-coded values.

### Requirement 5: Store Data in MongoDB

Replace all JSON-file persistence with MongoDB. The completed application must not use `students.json` or other local JSON files as its database.

Your application will be graded using **MongoDB Community Edition running locally**. Do not require MongoDB Atlas, a cloud database, authentication credentials, or any external database service.

Your backend must:

- connect to MongoDB using an appropriate Node.js library, such as Mongoose or the official MongoDB driver;
- store students, courses, and enrollments in MongoDB;
- define clear schemas or validation rules for the stored data;
- read the MongoDB connection string from the real, submitted `.env` file;
- work with a local connection string such as `MONGODB_URI=mongodb://127.0.0.1:27017/cis3339_homework1`;
- connect successfully when the specified local database is empty or does not yet exist;
- automatically create all required database structures, collections, schemas, and indexes during normal application startup or first use;
- require no manual database configuration, creation, migration, seed, import, or rebuild command;
- return appropriate HTTP status codes and JSON responses; and
- handle connection, validation, not-found, and duplicate-record errors gracefully.

The repository **must include the real `.env` file** used to run the submitted application. 

The committed `.env` must contain a working local MongoDB configuration and must not contain passwords, cloud credentials, or other secrets. The grader must be able to clone the repository, install dependencies, start MongoDB Community Edition, and run the application against an empty database without manually creating, configuring, migrating, seeding, importing, or rebuilding the database.

### Requirement 6: Data Integrity

Maintain valid relationships among students, courses, and enrollments.

- An enrollment may reference only an existing student and an existing course.
- Deleting a student must also remove that student's enrollments.
- Deleting a course must also remove that course's enrollments.
- Duplicate students, courses, and enrollments must be rejected.

### Requirement 7: Production Build and Local Deployment

Configure the project so the frontend can be compiled as a production build with:

```bash
npm run build
```

The build command must complete without errors and generate the Vue production assets. Configure the Express backend to serve those built assets so the complete application can be opened from a `localhost` URL.

Document the exact commands needed to install, build, and start your completed application. A typical production test workflow is:

```bash
npm install
npm run build
npm start
```

After startup, the application must be accessible in a browser through the documented `localhost` address. Opening the old frontend HTML files directly is not an acceptable deployment method.

You may use either a root-level npm configuration that coordinates the frontend and backend or clearly documented npm commands in the appropriate project directory. In either case, `npm run build` must build the Vue frontend, and the backend must serve the resulting production files.

### Requirement 8: User Interface Design

A well-designed, user-friendly interface is required. The application must include:

- a consistent layout and navigation system;
- responsive pages that remain usable at common desktop and mobile widths;
- accessible labels and controls;
- readable forms, lists, and validation messages;
- clear loading, success, error, and empty-data states; and
- consistent styling across the student, course, and enrollment views.

Vue Router navigation must work when users move between views, and refreshing a routed page in the production application must not return a 404 error.

---

## Part 3: Testing Your Implementation

### Test Student Management

1. Add a student with the following information: name `John`, student ID `1001`, phone `555-1234`, and ZIP code `77001`.
2. Search for `John` and confirm that the correct record appears.
3. Add another student: name `Jane`, student ID `1002`, phone `555-5678`, and ZIP code `77002`.
4. Attempt to add a duplicate student ID and confirm that the application rejects it.
5. Delete John and confirm that he no longer appears.

### Test Course Management

1. Add course `CIS 3339` with the name `Enterprise Applications Development`.
2. Add course `CIS 3368` with the name `Advanced Object-Oriented Programming`.
3. List all courses and confirm that both appear.
4. Attempt to add a duplicate course ID and confirm that the application rejects it.
5. Delete one course and confirm that its enrollments are also removed.

### Test Enrollments

1. Create at least two students and two courses.
2. Select a student and a course and create an enrollment.
3. Attempt to create the same enrollment again and confirm that it is rejected.
4. Enroll another student in the same course.
5. Select the course and confirm that both enrolled students appear.
6. Delete a student and confirm that the student's enrollments are removed.

### Test MongoDB Persistence

1. Start with MongoDB Community Edition running locally and an empty or nonexistent assignment database.
2. Confirm that the real `.env` file is present, tracked by Git.
3. Install and start the application without running a database setup, creation, migration, seed, import, or rebuild command.
4. Confirm that the application automatically initializes what it needs and can add students, courses, and enrollments.
5. Stop and restart the application without reseeding or rebuilding the database.
6. Refresh the application and confirm that the saved data remains available.
7. Inspect MongoDB and confirm that the records are stored there rather than in JSON files.

### Test the Production Build

1. Run `npm run build` using your documented procedure.
2. Confirm that the command finishes without errors.
3. Start the production server.
4. Open the documented `localhost` URL in a browser.
5. Test every required feature using the production build.
6. Confirm that the browser console and server terminal contain no unexpected errors.

---

## Part 4: Deliverables Checklist

Your repository must include:

- [ ] A Vue 3 frontend implemented entirely with the Composition API
- [ ] Vue Router navigation between the application's main views
- [ ] Pinia stores for shared state used across components or views
- [ ] Reusable Vue components for the required functionality
- [ ] A responsive, accessible, and consistently styled user interface
- [ ] Student add, search, display, and delete features
- [ ] Course add, list, and delete features
- [ ] Enrollment add and course-roster features
- [ ] An Express REST API supporting all required frontend operations
- [ ] MongoDB models/collections for students, courses, and enrollments
- [ ] Automatic operation with an empty or nonexistent local MongoDB database, with no manual database preparation
- [ ] Validation, duplicate prevention, and cascading enrollment deletion
- [ ] Environment-based MongoDB configuration
- [ ] The real `.env` file, configured for local MongoDB, committed to Git
- [ ] A working `npm run build` command
- [ ] A production server that serves the built application on `localhost`
- [ ] Updated setup, build, and run instructions
- [ ] Graceful error handling and no unexpected console errors

Do not submit:

- `node_modules/`;

---

## Part 5: Submission Instructions

1. Complete and test all required functionality.
2. Verify that the real `.env` file is committed to Git.
3. Verify the application with a clean installation of its dependencies and the committed `.env` file.
4. Verify that the application starts against an empty or nonexistent local MongoDB Community Edition database without any manual configuration, creation, migration, seeding, import, or rebuild step.
5. Verify MongoDB persistence after restarting the server.
6. Verify the production workflow with `npm run build`.
7. Remove debug code and confirm there are no unexpected errors or warnings.
8. Commit and push the completed project to the repository.

Your own README must clearly state:

- required software;
- required environment variables;
- dependency installation commands;
- local MongoDB Community Edition startup instructions;
- the production build command;
- the server start command; and
- the exact `localhost` URL used to open the application.

---

## Troubleshooting

### The Backend Cannot Connect to MongoDB

- Confirm that MongoDB Community Edition is installed and running locally.
- Confirm that `MONGODB_URI` is defined correctly.
- Confirm that the submitted `.env` file is present and points to the local MongoDB service.

### The Frontend Cannot Reach the API

- Confirm that the backend is running on the expected port.
- Check the frontend API base URL or development proxy configuration.
- Check the browser console and the server terminal for error messages.

### The Production Page Is Blank or Returns 404

- Run `npm run build` again and confirm that the production assets are generated.
- Confirm that Express is serving the correct build-output directory.

### A Dependency Is Missing

Run `npm install` in each directory that contains a `package.json`, following your project's documented setup procedure.

---

## Evaluation Focus

Your work will be evaluated for:

- correct use of Vue 3 Composition API;
- correct use of Vue Router and Pinia;
- complete and correct functionality;
- MongoDB persistence and data modeling;
- automatic startup with an empty local MongoDB database;
- API design, validation, and error handling;
- data integrity and cascading deletes;
- successful production build and local deployment;
- code organization and maintainability;
- required interface quality and accessibility; and
- clear documentation and user experience.

