# MP4 to MP3 Converter — Complete Functionality Specification

The goal is to turn the UI mockup into a fully functional application, not just a design where buttons look clickable. Every button, menu, section, upload state, conversion setting, form, and dashboard action must have a defined behavior connected to the Next.js backend, MongoDB, and FFmpeg processing pipeline.

The following specification is designed to be handed directly to your coding agent.

## 1. Main navigation and global interface

Logo — MP4 to MP3

Clicking the logo returns the user to the homepage and resets the main view without deleting existing jobs.

Home

Navigate to \`/\`, show the upload converter and reset transient UI state.

About

Scroll to the About section or navigate to \`/about\` if implemented as a separate page.

Features

Scroll to the features section describing supported conversion capabilities.

My Conversions

Open conversion history. Guests see their current-session jobs; registered users see their saved history after authentication.

Profile avatar

Open a menu containing account status, Dashboard, Settings, Sign in/Register or Sign out, depending on session state.

### Navigation behavior

- Highlight the active navigation item.
- Update the active state when navigating or scrolling to a section.
- Support browser back and forward navigation.
- Preserve the current conversion job when the user navigates away.
- Display a loading indicator when a destination requires data fetching.
- If a guest clicks My Conversions, show their current session's jobs or invite them to sign in to access persistent history.
- If a user is signed in, show their account menu and history without asking them to authenticate again.

### Profile menu contents

For guests:

- Sign in
- Create account
- Privacy
- Terms of service

For signed-in users:

- My profile
- My conversions
- Settings
- Help and support
- Sign out

For administrators, add an Administration link after verifying the user's role on the server.

Sign out must invalidate the session and redirect to the homepage. It must not delete conversion files or jobs unless the user separately requests deletion.

## 2. Main converter section

This is the core of the product. The entire upload-to-download workflow must work from this section.

## MP4 to MP3 Converter

Easily convert your MP4 videos to high-quality MP3 audio files.

Drag & drop your MP4 file here

or select a file from your device

Choose File

MP4 only · Initial maximum 500 MB, configurable by the server

Output format

MP3

Audio quality

192 kbps

Illustrative component preview. The production implementation must connect these controls to real application state and APIs.

### 2.1 Choose File button

Action: Open the native operating system file picker.

Implementation requirements:

- Accept `.mp4` as the primary supported extension.
- Allow the user to cancel without changing the current selection.
- Reject empty or invalid selections.
- Display the selected file's name, size and detected duration when available.
- Validate file size immediately for helpful feedback.
- Validate file contents on the server before processing.
- Do not upload automatically until the user initiates conversion, unless an explicit upload-first workflow is implemented.
- Selecting another file should replace the current selection only after confirming any necessary discard behavior.

Error messages should explain the problem, for example:

- “Please select an MP4 file.”
- “This file exceeds the upload limit.”
- “We couldn't read this video. Try another file.”
- “This video does not contain an audio track.”

The file input must remain accessible to keyboard and screen-reader users.

### 2.2 Drag-and-drop upload area

The entire dropzone should support these interactions:

- Drag a file over the zone: show a visible active state.
- Drop a supported file: validate and select it.
- Drop an unsupported file: show a clear error.
- Click the zone: open the file picker.
- Press Enter or Space while focused: open the file picker.
- Select a new file: update the file preview and available settings.

Do not allow a dropped file to bypass validation or file-size limits.

### 2.3 Selected-file preview

After selecting a valid file, replace the empty upload prompt with a file card containing:

- Video/file icon.
- Filename, truncated safely if too long.
- File size in MB or GB.
- Detected duration, once available.
- Upload status, if upload has started.
- A remove/replace button.
- Validation warnings, if any.

The remove button must clear the current selection and reset selection-specific errors. If upload has already started, the application must cancel or safely detach from the upload before deleting temporary data.

### 2.4 Output format selector

The mockup displays MP3 as the output format.

For the initial release:

- Keep MP3 selected by default.
- If no other output format is supported, display MP3 as a fixed value or a disabled selector.
- Do not present other formats as selectable options unless the backend actually supports them.

Future formats can be added when their encoding pipelines and tests exist.

### 2.5 Audio quality selector

Available options:

| Option   | Intended use                  |
| -------- | ----------------------------- |
| 96 kbps  | Smaller files                 |
| 128 kbps | Basic audio quality           |
| 192 kbps | Recommended default           |
| 256 kbps | Higher bitrate                |
| 320 kbps | Highest supported MP3 bitrate |

When the user changes the bitrate:

- Update the selected setting immediately.
- Keep the selected value while the user configures the current file.
- Send the selected bitrate to the backend when creating the conversion.
- Validate it against the server's allowlist.
- Never allow a browser request to inject arbitrary FFmpeg options.

Optionally show a short explanation of the quality/size trade-off. Do not promise that 320 kbps restores quality lost in the original video.

### 2.6 Convert to MP3 button

This is the primary action.

Before conversion, verify that:

- A file has been selected.
- Client-side file checks pass.
- The selected bitrate is valid.
- The user has not already submitted the same request.
- The user has not exceeded the applicable usage limit.

When clicked:

1. Lock the current settings to the submitted job.
2. Initiate the upload, if necessary.
3. Show upload progress.
4. Ask the backend to create a conversion job after upload validation.
5. Enqueue the job in BullMQ.
6. Navigate to `/convert/[jobId]` or display the processing state in the current page.
7. Poll the job status or subscribe to server updates.
8. Show the result when the worker confirms successful output verification.

While processing, disable the submit button for that job and display an appropriate label, such as “Uploading…”, “Waiting in queue…” or “Converting…”.

Do not report conversion success merely because an API request returned successfully. The actual output must exist and pass validation.

## 3. Conversion progress and result states

The interface must have distinct states rather than using one generic loading spinner.

State A — Uploading

Show the percentage of bytes uploaded and the current transfer status.

Example: Uploading video… 38%

Provide a cancel action. Cancellation must stop the upload and clean up incomplete multipart uploads when applicable.

State B — Waiting in queue

Display “Your video is waiting to be converted.” Include the queue state, job identifier and cancel action when cancellation is still possible.

State C — Converting

Example: Extracting audio… 65%

Update the progress from worker-reported FFmpeg progress. If progress cannot be measured, show an indeterminate progress indicator rather than inventing a percentage.

State D — Conversion complete

Display the output filename, actual output size, audio duration, bitrate, an audio player and a prominent Download MP3 button. Add a “Convert another file” action.

State E — Conversion failed

Display a friendly explanation, a retry button when eligible and an option to choose another file. Keep internal error details out of the UI.

### 3.1 Download MP3 button

The download button should:

1. Verify that the job is completed.
2. Request the authorized download endpoint.
3. Confirm that the user or guest session is allowed to access the job.
4. Deliver the audio with the correct download filename and `audio/mpeg` content type.
5. Show a helpful message if the output has expired or is no longer available.

The downloaded file should use a sanitized filename, such as `presentation.mp3`.

If a signed URL is used, it must be short-lived and generated by the server after authorization. Do not expose permanent public storage URLs.

### 3.2 Audio preview

Display an HTML audio player when the conversion succeeds.

Include:

- Play and pause.
- Seek bar.
- Current playback time and total duration.
- Volume control where supported.
- A fallback message if the browser cannot play the file.

The preview must use the actual generated MP3. Do not use a placeholder track or assume every browser supports every playback feature.

### 3.3 Retry button

- Display only for eligible failures.
- Reuse the validated source and conversion settings if the source is still available.
- Create a new processing attempt or safely requeue the existing job.
- Prevent repeated clicks from creating duplicate jobs.
- Display the new queue state.
- Explain when the source has expired and must be uploaded again.

### 3.4 Convert another file

Return the user to the upload interface and clear transient selection state. Preserve the completed job in the user's history or guest session according to the retention policy.

### 3.5 Cancel conversion

Allow cancellation only when the job can still be safely cancelled.

- Queued job: remove or cancel the queued work.
- Processing job: request cancellation and terminate the worker process safely.
- Completed job: do not label cancellation as available.
- Already cancelled job: display the final cancelled state.

The backend must own the state transition. Hiding the button is not sufficient.

## 4. About section

Create a dedicated About section that explains what the application does and how it handles user files.

### Content

Heading: About MP4 to MP3 Converter

Description: A straightforward online tool for extracting audio from video files and downloading it in MP3 format.

Include three short subsections:

- Simple conversion: Upload a supported video, select audio quality and convert.
- Quality options: Choose a supported bitrate according to your needs.
- Privacy-conscious processing: Explain the actual storage and deletion policy in clear language.

### Functional behavior

- The About navigation item scrolls to the section.
- A “Learn how it works” link scrolls to the three-step explanation.
- A “Start converting” button scrolls to the upload area.
- On mobile, anchor navigation must account for the sticky header if one exists.

Do not claim that files are never stored if the backend temporarily stores uploads and generated MP3s. State the real retention behavior instead.

## 5. Features section

Create a feature grid containing these cards:

Fast Conversion

Process audio in a background queue and show live status updates.

Quality Control

Choose supported MP3 bitrates before submitting the conversion.

Private File Handling

Keep media private and delete temporary files according to policy.

Easy Downloads

Download the generated MP3 while it remains available.

Conversion History

Review previous jobs and access eligible outputs.

Responsive Experience

Use the converter on mobile, tablet and desktop.

Each card can be informational. If a card contains a link or CTA, it must navigate to a real destination or invoke a real supported action.

## 6. Three-step process section

The mockup contains Upload, Convert and Download steps. Make each step informative and actionable.

1\. Upload

Select a supported MP4 video or drop it into the upload area.

Action: Open the file picker.

Details

2\. Convert

Choose audio quality and let the server extract and encode the audio.

Action: Focus the converter settings.

Details

3\. Download

Preview the completed audio and download the MP3 file.

Action: Open the download result when a completed job exists.

Details

If there is no selected file or completed conversion, these step actions should guide the user to the relevant part of the page rather than pretending an action has completed.

## 7. My Conversions — complete history functionality

Create a dedicated page at `/conversions` or `/dashboard/conversions`.

### Page layout

## My Conversions

Manage your recent audio conversions.

New conversion

Search by filename…

All

Queued

Processing

Completed

Failed

presentation.mp3

Example row · 12.4 MB · Completed

Illustrative layout only; actual rows, counts and statuses must come from the database.

### Search, filters and sorting

- Search by original filename.
- Filter by job status.
- Filter by creation date.
- Sort newest first or oldest first.
- Paginate results.
- Show total matching results.
- Provide a clear-filters action.
- Preserve filter state in URL query parameters where practical.

### Each conversion row

Display:

- Original filename.
- Output filename, if available.
- File size.
- Duration.
- Conversion settings.
- Creation date.
- Current status.
- Available actions.

### Row actions

| Action              | Behavior                                                    |
| ------------------- | ----------------------------------------------------------- |
| View details        | Open the conversion detail page                             |
| Download            | Download the MP3 if completed and available                 |
| Retry               | Retry eligible failed jobs                                  |
| Rename display name | Update a metadata-only display name, if supported           |
| Delete              | Confirm deletion and remove the job from the user's history |
| Copy job reference  | Copy the non-sensitive public job reference                 |

Deleting a record must trigger the appropriate media deletion workflow. If the deletion is asynchronous, show “Deletion pending” until it is completed. If permanent deletion fails, retain enough internal state to retry cleanup without exposing the media.

### Empty states

- No conversions: “You haven't converted any videos yet.”
- No search matches: “No conversions match your search.”
- No completed downloads: Explain that an MP3 becomes available when a conversion succeeds.
- Guest without saved session: Offer sign-in or registration for persistent history.

### Bulk actions

For a later enhancement, support selecting multiple history entries and deleting them together. Do not add bulk download or bulk delete until authorization, selection, confirmation and partial-failure handling have been implemented.

## 8. Authentication and account pages

These pages are necessary for persistent history and user settings. Guest conversion should still remain available.

### Registration — `/register`

Fields:

- Full name.
- Email address.
- Password.
- Confirm password.
- Terms and privacy acknowledgement.
- Create account button.

Validation:

- Require valid input.
- Check password confirmation.
- Normalize email addresses.
- Enforce server-side uniqueness.
- Rate-limit registration.
- Never reveal database errors.

On success, create the account, initiate email verification if enabled and redirect to an appropriate confirmation screen.

### Login — `/login`

Fields:

- Email.
- Password.
- Show/hide password control.
- Remember-session option if supported.
- Sign in button.
- Forgot password link.
- Create account link.

Functional requirements:

- Validate fields before submitting.
- Display a generic invalid-credentials message.
- Prevent repeated rapid submissions.
- Preserve a safe internal redirect to the requested page.
- Never redirect to arbitrary external URLs supplied by the user.

### Forgot password — `/forgot-password`

- Ask for the user's email.
- Display a generic confirmation whether the account exists.
- Send a time-limited reset link when applicable.
- Provide a resend option with rate limiting.
- Do not reveal the reset token in logs.

### Reset password — `/reset-password/[token]`

- Verify token validity and expiration.
- Accept and confirm a new password.
- Invalidate the token after successful use.
- Invalidate relevant existing sessions.
- Show success and link to sign in.
- Show a recovery option when the link has expired.

### Account settings — `/settings`

Provide:

- Name and profile information.
- Email and verification status.
- Password change.
- Theme preference.
- Session and security settings.
- Data retention information.
- Delete account action.
- Sign out.

Account deletion requires a confirmation step and a clear explanation of which profile, history and media records will be deleted. The operation must be implemented in the backend, not just remove the account from the UI.

## 9. Admin dashboard functionality

Use a separate, protected route at `/admin`.

## Admin Overview

Total jobs

### Live metric

Successful

### Live metric

Failed

### Live metric

Active queue

### Live metric

Production values must be calculated from actual database and queue data; never hardcode these metrics.

### Admin sections

Overview

- Total jobs.
- Successful and failed jobs.
- Jobs currently processing.
- Average processing duration.
- Queue waiting time.
- Storage utilization.
- Failure trends.

Job management

- Search by job reference or filename.
- Filter by status, date and owner.
- Inspect sanitized error codes and timestamps.
- Retry eligible jobs.
- Cancel eligible jobs.
- Inspect processing attempts.
- View cleanup failures.

User management

- Search users.
- View account creation date and usage statistics.
- Suspend or reinstate accounts where policy permits.
- Inspect abuse flags.
- Never display passwords or authentication secrets.
- Restrict personal data to what is necessary for administration.

System settings

- Maximum upload size.
- Maximum media duration.
- Supported bitrate options.
- Queue concurrency.
- Usage quotas.
- Retention policy.
- Maintenance mode.

Validate settings on the server and prevent unsafe configuration changes.

Audit log

Record administrative changes, cancellations, retries, account suspensions and settings changes with actor ID, timestamp, action and target. Restrict audit-log access to authorized administrators.

Authorization: The server must verify admin roles for every admin API request. A user should never gain administrator privileges by editing browser state or request payloads.

## 10. Footer and legal sections

The footer in the mockup contains the product logo, quick links, legal links and social icons.

### Quick Links

- Home — return to the converter.
- About — navigate to the About section.
- Features — navigate to the Features section.
- My Conversions — open history or sign-in flow.

### Legal

Privacy Policy should explain:

- What information is collected.
- How uploaded videos and generated audio are processed.
- Where files are stored.
- How long files and metadata are retained.
- How deletion works.
- How users can contact the operator about privacy requests.

Terms of Service should explain:

- Acceptable use.
- User responsibility for rights to uploaded media.
- Usage limits and service availability.
- Prohibited abuse.
- Limitations and disclaimers.
- How to contact support.

These pages must contain real, reviewed policies consistent with actual system behavior—not generic text that makes promises the backend does not meet.

### Social icons

Only show icons for official profiles that actually exist. Each should open the correct external URL, use an accessible label and open safely. Remove any placeholder social links that have not been configured.

### Copyright

Generate the displayed year dynamically. Do not hardcode an outdated year in the footer.

## 11. Backend integration map

Every visible action should have an explicit implementation path.

| UI feature            | Backend integration                                     |
| --------------------- | ------------------------------------------------------- |
| Choose File           | Browser file input; upload API when submitted           |
| Convert to MP3        | Upload service, conversion API, BullMQ                  |
| Conversion progress   | Job status API or SSE                                   |
| Download MP3          | Authorized download endpoint and private storage        |
| Retry                 | Retry endpoint and queue                                |
| Cancel                | Cancellation endpoint and worker coordination           |
| My Conversions        | Authenticated history endpoint or guest-session history |
| Search/filter         | Validated history query parameters                      |
| Delete history        | Deletion endpoint and cleanup worker                    |
| Register/login        | Authentication service                                  |
| Forgot/reset password | Token-based password recovery and email delivery        |
| Profile settings      | Authenticated user endpoints                            |
| Admin overview        | Protected metrics endpoint                              |
| Admin job actions     | Role-protected job-management API                       |
| Privacy and Terms     | Actual policy pages                                     |
| Footer navigation     | Internal routes or section anchors                      |

All frontend data should reflect the actual server state. Do not maintain a separate fake conversion status that can disagree with the database or worker.

## 12. Final acceptance criteria

Before the coding agent marks the website complete, verify every item below.

## Implementation checklist

0/23

Core converter

File picker and drag-and-drop both work.

File validation and size limits are enforced.

Bitrate settings reach FFmpeg correctly.

Upload, queue and conversion progress update accurately.

A real MP3 is generated and can be downloaded.

Invalid files and failed conversions show useful errors.

All interface controls

Navigation and logo links work.

Profile menu and account actions work.

About and Features navigation works.

Every footer link has a valid destination.

All dialogs, dropdowns and selectors work.

Mobile navigation and responsive layouts work.

Accounts and history

Registration, login and password reset work.

History is retrieved from MongoDB.

Users cannot access another user's files or jobs.

Retry, cancel and deletion work correctly.

Expired downloads are rejected.

Production readiness

Admin actions are protected by server-side permissions.

FFmpeg runs in a separately managed worker.

Storage cleanup and retention are enforced.

Error handling, logs and monitoring are implemented.

Automated tests pass.

Deployment and environment setup are documented.

Copy checklist

## 13. Master prompt for your coding agent

Use this prompt with the UI mockup and the technical documentation from our earlier discussion.

# IMPLEMENT ALL FUNCTIONALITY — MP4 TO MP3 CONVERTER

Act as a senior full-stack developer, UI/UX engineer, backend architect and application security engineer.

Your task is to turn the supplied MP4-to-MP3 converter UI design into a complete, functional web application.

## Technology stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- MongoDB and Mongoose
- FFmpeg and FFprobe
- Redis and BullMQ
- Secure authentication
- Private file storage
- Automated tests
- Docker for local development and deployment

## Critical requirement

Every visible button, link, navigation item, menu, form, dropdown, section action, table action and icon button must have a meaningful behavior.

Do not leave decorative controls, placeholder links, fake metrics, simulated production conversions or nonfunctional forms.

Inspect the supplied design and existing repository before implementation. Preserve the visual design, including its dark theme, blue-purple accents, spacing, typography, layout and responsive behavior, unless an improvement is required for usability.

## 1. Main navigation

Implement the logo, Home, About, Features, My Conversions and profile menu.

Support active navigation states, browser navigation, mobile layouts and appropriate scroll behavior.

The profile menu must change according to authentication status. Include registration, login, settings, history, sign-out and an admin link only for authorized administrators.

## 2. Converter interface

Implement the complete upload zone with file picker, drag-and-drop, file preview, file removal, validation errors and loading states.

Show filename, file size and detected duration when available.

Implement the output format selector and bitrate selector. Use MP3 as the initial output format and support only actual server-implemented bitrate options.

The Convert to MP3 button must validate the selection, upload the file, create a backend job and display the real processing state.

Prevent duplicate submissions.

## 3. Conversion pipeline

Use FFmpeg and FFprobe in a separate background worker. Use Redis and BullMQ for queue processing.

Implement real media probing, audio extraction, MP3 encoding, progress updates, output verification, error handling, retry, cancellation and cleanup.

Do not report success until the generated output has been verified and stored.

Enforce file-size and duration limits, process timeouts, concurrency limits, CPU and memory restrictions, and safe temporary file handling.

Never execute arbitrary user-provided shell commands or FFmpeg arguments.

## 4. Result interface

When conversion succeeds, display the output filename, file size, duration, selected bitrate, audio player and Download MP3 button.

Implement authorized downloads with safe filenames and appropriate HTTP headers.

Include retry, cancel where supported, delete and Convert Another File actions.

Handle expired files, failed jobs, network errors and interrupted uploads.

## 5. About and Features

Implement the About section, feature cards and three-step Upload, Convert and Download explanation.

All navigation anchors and CTAs must work. Use accurate descriptions of the implemented features and real retention policy.

## 6. User dashboard

Implement conversion history using MongoDB.

Include filename search, status filtering, date filtering, sorting, pagination, detail pages, download, retry and delete actions.

Provide loading, empty, error and expired-output states.

Ensure that authenticated users can access only their own records. Guest jobs must be bound to a secure guest session.

## 7. Authentication

Implement registration, login, logout, secure sessions, password reset, profile management and account deletion.

Use secure password hashing and single-use, expiring password-reset tokens. Apply rate limits and server-side validation.

Keep guest conversion available without forcing registration.

## 8. Admin dashboard

Implement live job statistics, queue monitoring, storage health, failure trends, user management, job search, retry, cancellation, system settings and audit logs.

Use actual database and queue data.

Protect every administrative API and operation through server-side role checks.

## 9. Footer and legal pages

Implement all configured quick links, Privacy Policy, Terms of Service, copyright year and real social links.

Remove unconfigured social placeholders. Ensure legal pages reflect actual data handling, storage and retention behavior.

## 10. Backend and data integrity

Implement typed API routes, validated request schemas, MongoDB models, appropriate indexes, consistent error responses and explicit job state transitions.

Add idempotency protection to upload completion and job creation.

Ensure cleanup handles both database records and physical media files. Do not rely on MongoDB TTL indexes to delete stored files.

Keep secrets server-side and never expose storage credentials, raw file paths or internal errors.

## 11. UI quality

Make the interface responsive and accessible.

Implement keyboard navigation, visible focus, accessible form labels, status announcements, meaningful disabled states, confirmation dialogs and reduced-motion support.

Use consistent reusable components. Do not rewrite the entire design unnecessarily.

## 12. Testing and delivery

Write unit tests, integration tests and end-to-end tests.

Test the complete upload-to-download workflow, invalid files, oversized files, missing audio streams, failed jobs, retries, cancellation, expiration, authorization, account management and admin permissions.

Run linting, TypeScript checks, automated tests and production build checks. Fix failures before reporting completion.

Provide a README, .env.example, Docker Compose configuration, database setup, FFmpeg installation, worker startup instructions, deployment steps and troubleshooting guidance.

## Execution approach

First inspect the repository and map every visible UI control to its intended behavior.

Then implement in phases:

1. UI interactions and component states.
2. MongoDB models and API routes.
3. Upload and real FFmpeg conversion pipeline.
4. Download, progress, retry and cancellation.
5. Authentication and history.
6. Admin dashboard and cleanup.
7. Testing, security and deployment.

At completion, report implemented features, remaining limitations, test results and exact commands for running the complete application locally.

Do not claim that anything works unless it has been implemented and verified.

Implementation priority: Get one complete path working first: select an MP4 → upload → queue → convert with FFmpeg → preview → download. Then connect every remaining section to real data and services. This will make the project functional without sacrificing the design.
