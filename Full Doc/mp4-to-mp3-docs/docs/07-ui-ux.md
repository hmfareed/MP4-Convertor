# 07 — UI/UX

## Design direction
A clean, professional, responsive interface with generous whitespace, clear typography, a prominent upload area, restrained colors and accessible status indicators.

## Reusable components
Uploader, settings panel, file card, progress indicator, result card, audio player, download button, history table, dialogs, admin dashboard.

## Required states

| State | Notes |
|-------|-------|
| Loading | Skeletons rather than spinners where layout is known |
| Empty | Friendly guidance (for example, empty history) |
| Error | Plain-language message with next action |
| Offline | Detect connectivity loss; preserve selected settings |
| Upload | Determinate progress, cancel option |
| Queued | Position or "waiting" indication |
| Processing | Real progress from the worker |
| Completed | Result card with preview and download |
| Failed | Reason from error code, retry control |
| Expired | Explains retention; invites a new conversion |
| Rate-limited | Shows when the user can try again |

Do not rely on color alone for status: pair color with icon and text.

## Responsive behavior
Must work on mobile, tablet and desktop. The upload area is the focal point on every breakpoint; tables collapse into cards on small screens. (Proposed)

## Accessibility
- Full keyboard operation, including the dropzone (activatable with Enter/Space)
- Visible focus indicators
- Accessible labels and descriptions for all controls
- Progress exposed with `role="progressbar"` and live-region announcements for status changes
- Reduced-motion support through `prefers-reduced-motion`
- Dialogs trap and restore focus
- Sufficient color contrast (target WCAG 2.2 AA) (Proposed)

## Pages (Proposed)
Home / converter, job detail, history, login, register, forgot/reset password, settings, privacy and retention policy, admin dashboard, 404 and error pages.

## Content notes (Proposed)
Show the retention period and upload limits near the uploader so users know what happens to their files.
