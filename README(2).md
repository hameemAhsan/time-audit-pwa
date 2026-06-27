# Time Audit & Productivity Tracker PWA

A mobile-first, Android-focused Progressive Web App for tracking your full 24-hour day, reviewing productivity, finding unlogged time, checking study time, using a Pomodoro timer, and exporting accountability reports.

This project is designed as a **Phase 1 local-only PWA**. It does **not** need a backend, database server, login system, or cloud sync.

---

## Live App

If deployed with GitHub Pages under this repository name, the app link should be:

```text
https://hameemahsan.github.io/time-audit-pwa/
```

If your GitHub username or repository name is different, the link format is:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/
```

Example:

```text
https://myusername.github.io/time-audit-pwa/
```

---

## Project Purpose

The app helps you answer:

- What did I actually do today?
- Where did my time go?
- How much time did I study?
- Which category used the most time?
- What time was wasted?
- Did I meet my daily, weekly, or monthly targets?
- Can I export a report for an accountability partner?

The app is not mainly a study tracker. It is a full-day time audit and reflection tool.

---

## Main Features

### Today Dashboard

The Today screen shows:

- Date
- Logged time
- Unlogged time
- Total study time
- Average productivity rating
- Current streak
- Top category
- Target progress
- Daily timeline
- Missing time gaps
- Quick actions

### Activity Logging

You can manually log any custom time block.

Example:

```text
Start: 9:00 AM
End: 11:00 AM
Activity: MBA Study
Category: Study
Productivity: 5/5
Note: Finished statistics practice
```

Each activity log includes:

- Start time
- End time
- Activity
- Category
- Productivity rating
- Optional note

The app should prevent impossible entries such as end time before start time and warn about overlapping logs.

### Missing Time Detection

If you log:

```text
8:00 AM – 10:00 AM Study
11:00 AM – 12:00 PM Class
```

The app detects:

```text
Missing: 10:00 AM – 11:00 AM
```

Missing blocks can be used to quickly fill gaps in the day.

### Custom Categories

Default categories include:

- Study
- Work
- Class
- Business
- Sleep
- Food
- Commute
- Rest
- Exercise
- Chores
- Entertainment
- Scrolling
- Social
- Family
- Prayer
- Planning
- Other

You can add, rename, delete, color-code, and configure categories.

Each category can be marked as:

```text
Counts as study time: Yes / No
```

Study time is calculated from categories where this setting is enabled.

### Custom Activities

Default activities include:

- Studying
- Class
- Assignment
- Reading
- Practice problem
- Business work
- Meeting
- Eating
- Sleeping
- Commute
- Scrolling
- YouTube
- Gaming
- Exercise
- Prayer
- Family time
- Rest
- Chores
- Planning
- Other

You can also create your own activities, such as:

- MBA Study
- Math Research
- Srijani Work
- Gym
- Content Planning
- Exam Prep

### Productivity Rating

Every log has a 1–5 productivity rating.

```text
1 = Very unproductive
2 = Low productivity
3 = Neutral / necessary
4 = Productive
5 = Highly productive
```

The app calculates:

- Average productivity for the day
- Average productivity for the week
- Average productivity for the month
- Productivity by category
- Productivity by activity

### Daily Reflection

Each day can have a reflection:

- Daily note
- What went well today?
- What wasted time today?
- What should improve tomorrow?
- Tomorrow’s main priority
- Overall productivity rating

Activity notes and daily reflections are separate.

### Category Targets

You can set targets for categories.

Target types:

```text
Minimum target = do at least this much
Maximum target = do not cross this much
```

Examples:

```text
Study: at least 4 hours per day
Exercise: at least 30 minutes per day
Scrolling: at most 1 hour per day
Entertainment: at most 2 hours per day
```

Target periods:

- Daily
- Weekly
- Monthly

### Streak System

A day counts toward your streak when you log at least the minimum required time.

Default recommendation:

```text
At least 12 hours logged per day
```

The app shows:

- Current streak
- Best streak
- Last 7 days visual
- Last 30 days visual

### Reports

The Reports screen supports filters such as:

- Today
- Yesterday
- Custom date
- This week
- Last week
- This month
- Last month
- Custom range

Report summary includes:

- Total logged time
- Total unlogged time
- Total study time
- Average productivity rating
- Top category
- Most used activity
- Target achievement
- Streak status

### Charts

The app includes simple mobile-friendly visual reports.

Required chart types:

- Daily timeline
- Streak visual
- Category comparison chart
- Clustered bar chart
- Stacked bar chart
- Radar / spider chart
- Activity line chart

Category comparison allows up to 3 selected categories.

Radar chart is for focus distribution across manually selected categories.

Activity line chart allows up to 3 selected activities.

### Pomodoro Timer

The Pomodoro timer is for focus support only.

It supports:

- 25-minute focus / 5-minute break
- 50-minute focus / 10-minute break
- Custom focus duration
- Custom break duration
- Start
- Pause
- Reset
- Sound alert
- Vibration alert if supported

Important rule:

```text
Pomodoro does not auto-save time logs.
```

After a Pomodoro session, manually add your activity log.

### Exports

The app supports accountability and backup exports.

#### Image Report Export

Use this to send a clean summary to an accountability partner.

Image report can include:

- Date
- Logged time
- Unlogged time
- Study time
- Average productivity
- Current streak
- Top categories
- Target progress
- Optional reflection summary
- Optional timeline summary

Privacy toggles may include:

- Include notes
- Include daily reflection
- Include full timeline
- Include only summary
- Include productivity rating

#### CSV Export

CSV export includes raw logs with columns:

```text
Date
Start Time
End Time
Duration Minutes
Activity
Category
Productivity Rating
Note
```

CSV export options:

- Today
- This week
- This month
- Custom date range

#### JSON Backup and Restore

This is for data safety, not accountability sharing.

JSON backup should include:

- Categories
- Activities
- Activity logs
- Reflections
- Targets
- Settings

Use JSON backup before clearing browser storage or moving devices.

---

## Tech Stack

This app is built as a simple static PWA.

Recommended stack:

```text
HTML
CSS
JavaScript
LocalStorage or IndexedDB
Manifest
Service Worker
Client-side CSV export
Client-side image export
```

There is no backend in Phase 1.

---

## Folder Structure

The GitHub repository should look like this:

```text
index.html
app.js
styles.css
manifest.json
service-worker.js
offline.html
README.md
assets/
  icon-192.png
  icon-512.png
docs/
```

Important:

```text
index.html must be in the root of the repository.
```

Correct:

```text
time-audit-pwa/
  index.html
  app.js
  styles.css
  manifest.json
  service-worker.js
  assets/
    icon-192.png
    icon-512.png
```

Wrong:

```text
time-audit-pwa/
  time-audit-pwa/
    index.html
    app.js
    styles.css
```

If the files are inside an extra nested folder, GitHub Pages may not load the app properly.

---

## PWA Requirements

For the app to install properly on Android, these must work:

```text
manifest.json
service-worker.js
assets/icon-192.png
assets/icon-512.png
```

Test these URLs after deployment:

```text
https://hameemahsan.github.io/time-audit-pwa/manifest.json
https://hameemahsan.github.io/time-audit-pwa/service-worker.js
https://hameemahsan.github.io/time-audit-pwa/assets/icon-192.png
https://hameemahsan.github.io/time-audit-pwa/assets/icon-512.png
```

Expected result:

```text
manifest.json shows JSON text
service-worker.js shows JavaScript code
icon-192.png shows an image
icon-512.png shows an image
```

If any of these show 404, the PWA install may fail.

---

## Important GitHub Pages Manifest Setup

If this app is deployed at:

```text
https://hameemahsan.github.io/time-audit-pwa/
```

then `manifest.json` should use paths based on `/time-audit-pwa/`.

Recommended `manifest.json`:

```json
{
  "id": "/time-audit-pwa/",
  "name": "Time Audit & Productivity Tracker",
  "short_name": "Time Audit",
  "description": "A local-first 24-hour time audit and productivity tracker PWA.",
  "start_url": "/time-audit-pwa/",
  "scope": "/time-audit-pwa/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f7f4ef",
  "theme_color": "#111827",
  "categories": ["productivity", "education", "utilities"],
  "icons": [
    {
      "src": "/time-audit-pwa/assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/time-audit-pwa/assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/time-audit-pwa/assets/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/time-audit-pwa/assets/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

If your repository name is different, replace `time-audit-pwa` with your actual repository name.

Example:

```text
/time-audit-pwa/
```

becomes:

```text
/my-repository-name/
```

---

## How to Upload to GitHub

### Step 1: Create a Repository

1. Go to GitHub.
2. Click the `+` icon in the top-right corner.
3. Click **New repository**.
4. Repository name:

```text
time-audit-pwa
```

5. Choose **Public**.
6. Do not add a new README if this README already exists.
7. Click **Create repository**.

### Step 2: Upload Files

1. Open the repository.
2. Click **Add file**.
3. Click **Upload files**.
4. Open your extracted project folder on your computer.
5. Select all files and folders inside it.
6. Drag them into GitHub.
7. Commit message:

```text
Initial PWA upload
```

8. Click **Commit changes**.

Important:

Upload the project contents, not only the zip file.

Correct upload:

```text
index.html
app.js
styles.css
manifest.json
service-worker.js
assets/
```

Wrong upload:

```text
time-audit-pwa.zip
```

---

## How to Deploy with GitHub Pages

1. Go to your repository.
2. Click **Settings**.
3. Click **Pages** from the left sidebar.
4. Under **Build and deployment**, set:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

5. Click **Save**.
6. Wait 1–5 minutes.
7. Go to the **Actions** tab.
8. Wait until the latest deployment becomes green.
9. Open the live link:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/
```

For this repo:

```text
https://hameemahsan.github.io/time-audit-pwa/
```

---

## How to Update the App on GitHub

### Beginner Method

1. Make corrections locally.
2. Open the GitHub repository.
3. Click **Add file**.
4. Click **Upload files**.
5. Upload the corrected files/folders again.
6. Commit message:

```text
Update corrected version
```

7. Click **Commit changes**.
8. Go to **Actions**.
9. Wait until deployment becomes green.
10. Open the live app and hard refresh.

On PC Chrome:

```text
Ctrl + Shift + R
```

or:

```text
Ctrl + F5
```

### Do You Need to Delete Old Files?

Usually no.

The safer method is:

```text
Upload corrected files on top of old files.
```

Only delete old files if the corrected version removed files that should no longer exist.

---

## Why Assets Sometimes Do Not Upload

GitHub website upload can skip folders if you use the file picker incorrectly.

To upload the `assets` folder:

1. Open the repository.
2. Click **Add file**.
3. Click **Upload files**.
4. Drag the whole `assets` folder into the upload area.
5. Commit changes.

Make sure GitHub shows:

```text
assets/icon-192.png
assets/icon-512.png
```

If the icons are missing, these links will show 404:

```text
https://hameemahsan.github.io/time-audit-pwa/assets/icon-192.png
https://hameemahsan.github.io/time-audit-pwa/assets/icon-512.png
```

If those links show 404, the app may not install on Android.

---

## How to Install on Android

1. Open **Chrome** on Android.
2. Paste the live app link:

```text
https://hameemahsan.github.io/time-audit-pwa/
```

3. Wait until the app fully loads.
4. Tap the three-dot menu `⋮`.
5. Tap **Add to Home screen** or **Install app**.
6. Confirm.
7. Check your home screen and app drawer for:

```text
Time Audit
```

Important:

Do not open from Facebook, Messenger, WhatsApp, or GitHub app browser. Use Chrome directly.

---

## If Install Does Not Work

Check these first:

```text
https://hameemahsan.github.io/time-audit-pwa/manifest.json
https://hameemahsan.github.io/time-audit-pwa/service-worker.js
https://hameemahsan.github.io/time-audit-pwa/assets/icon-192.png
https://hameemahsan.github.io/time-audit-pwa/assets/icon-512.png
```

If any shows 404, fix that file first.

Then open Chrome DevTools on PC:

```text
F12 → Application → Manifest
```

Look for install errors such as:

```text
No manifest detected
No suitable icon
No matching service worker
Page is not installable
```

Also check:

```text
F12 → Application → Service Workers
```

You should see the service worker activated and running.

---

## PWA Cache Issues

Because this is a PWA, browsers may keep showing the old version after an update.

### On PC Chrome

Open the site and press:

```text
Ctrl + Shift + R
```

or:

```text
Ctrl + F5
```

### On Android Chrome

1. Open Chrome.
2. Go to site settings for `hameemahsan.github.io`.
3. Clear cache.
4. Reopen the app.

### For Installed PWA

1. Long press the app icon.
2. Tap **App info**.
3. Tap **Storage**.
4. Tap **Clear cache**.
5. Reopen the app.

Warning:

```text
Clear cache = usually safe
Clear storage / clear data = deletes local app data
```

Since this app stores data locally, clearing storage can delete logs and settings.

---

## Service Worker Version Tip

If the old version keeps appearing, update the cache version in `service-worker.js`.

Example:

```js
const CACHE_NAME = 'time-audit-pwa-v1';
```

Change it to:

```js
const CACHE_NAME = 'time-audit-pwa-v2';
```

Then commit the change and wait for GitHub Pages to redeploy.

---

## How to Use the App

### Daily Use Flow

1. Open the app.
2. Go to **Today**.
3. Check logged time, unlogged time, study time, streak, and timeline.
4. Tap **Add Activity**.
5. Enter start time and end time.
6. Choose activity.
7. Choose category.
8. Give productivity rating from 1 to 5.
9. Add a note if needed.
10. Save.
11. Return to **Today**.
12. Fill any missing time gaps.
13. At night, write daily reflection.
14. Export image report or CSV if needed.

### Recommended Daily Tracking Habit

Use the app 3–5 times per day:

```text
Morning: log sleep and morning routine
Midday: log study/work/class blocks
Evening: log afternoon and evening activities
Night: fill missing time and write reflection
End of day: export report if needed
```

### Example Day

```text
7:30 AM – 8:15 AM
Breakfast
Food · 3/5

9:00 AM – 11:00 AM
MBA Study
Study · 5/5

11:00 AM – 12:30 PM
Class
Class · 4/5

2:00 PM – 4:00 PM
Srijani Work
Business · 4/5

10:30 PM – 11:00 PM
Daily Reflection
```

---

## Data Storage and Privacy

This Phase 1 app uses local browser storage.

That means:

- Data stays on your device/browser.
- There is no login.
- There is no cloud sync.
- Data from laptop does not automatically appear on phone.
- Clearing browser storage can delete your data.

Before changing devices or clearing storage, export a JSON backup.

---

## Backup and Restore

### Backup

Use the JSON backup/export option from the app settings.

Save the backup file somewhere safe.

### Restore

Use the JSON import/restore option from the app settings.

This restores categories, activities, logs, reflections, targets, and settings.

---

## Troubleshooting

### Problem: GitHub Pages link shows 404

Check:

```text
Settings → Pages → Source: Deploy from a branch
Branch: main
Folder: /root
```

Also check that `index.html` is in the root of the repository.

### Problem: App opens but looks broken

Check that these files are present:

```text
index.html
app.js
styles.css
manifest.json
service-worker.js
```

### Problem: Install does nothing on phone

Check:

```text
manifest.json loads
service-worker.js loads
icon-192.png loads
icon-512.png loads
```

Then clear Chrome cache and try again directly from Chrome.

### Problem: Icons show 404

Upload the `assets` folder again.

Required:

```text
assets/icon-192.png
assets/icon-512.png
```

### Problem: Old version keeps showing

Clear cache or update service worker cache name.

### Problem: Data disappeared

Possible causes:

- Browser storage was cleared.
- App was opened in a different browser.
- App was opened on another device.
- Site data was deleted.

Use JSON backup to prevent this.

---

## Phase 1 Non-Goals

The app intentionally does not include:

- Login
- User accounts
- Cloud sync
- Server database
- Admin dashboard
- PDF export
- Google Drive sync
- Email integration
- Automatic accountability submission
- Native Android app
- Mood tracking
- Energy tracking
- Auto-tracking Pomodoro as activity logs

---

## Acceptance Checklist

The build is complete when:

- User can install the app on Android home screen.
- User can create custom categories.
- User can mark categories as counting or not counting toward study time.
- User can create custom activity presets.
- User can log activities using custom time slots.
- User can edit and delete activity logs.
- User can rate each log from 1 to 5.
- User can add notes to activity logs.
- User can write daily reflections.
- Today screen shows a summary report card.
- Today screen shows visual timeline.
- App detects missing/unlogged time.
- App calculates total logged time.
- App calculates total study time.
- App calculates average productivity.
- User can set daily, weekly, and monthly category targets.
- Reports show target progress.
- App shows visual streak.
- App shows category comparison chart for day-over-day, week-over-week, and month-over-month.
- Category comparison allows at most 3 selected categories.
- Category chart can show target markers.
- App shows radar/spider focus chart.
- App shows activity line chart.
- Activity line chart allows at most 3 selected activities.
- Pomodoro timer works but does not auto-log activity.
- App has notification settings and reminder message list.
- App can export image report.
- App can export CSV data.
- App can export and import JSON backup.
- App works offline after first load.
- App uses local storage only.
- No backend is required.

---

## License

Private/personal project unless you choose to add an open-source license.

---

## Notes for Future Development

Possible Phase 2 additions:

- Optional cloud sync
- Account system
- Multi-device sync
- Advanced analytics
- Calendar integration
- Accountability partner auto-sharing
- Better notification scheduling
- Native Android wrapper
- More advanced backup options

Keep Phase 1 simple, local, and stable before adding these.
