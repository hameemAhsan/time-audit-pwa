# Time Audit & Productivity Tracker PWA

A mobile-first, Android-focused Progressive Web App for manually tracking a full 24-hour day through time slots, activities, categories, productivity ratings, reflections, targets, reports, Pomodoro focus support, and exports.

This is a Phase 1 local-first build. There is no backend, no login, no server database, and no cloud sync. Data is stored in the browser using `localStorage`.

---

## 1. What is included

### Core screens

- Today
- Add Activity
- Pomodoro Timer
- Reports
- Settings

### Core features

- Manual activity logging with custom start/end time
- Overlap warning
- Impossible time prevention
- Edit/delete logs
- Missing time/gap detection
- Tappable missing time cards
- Custom categories
- Category color/icon
- Counts-as-study-time toggle
- Daily/weekly/monthly category targets
- Custom activity presets
- Activity default category auto-selection
- Productivity rating from 1 to 5
- Daily reflection fields
- Today summary report card
- Timeline visual
- Current/best streak
- Last 7 days and last 30 days streak visual
- Reports for today, yesterday, week, month, and custom range
- Clustered and stacked category comparison charts
- DoD, WoW, and MoM comparison
- Target markers on category comparison chart
- Radar/spider focus chart
- Activity line chart
- Pomodoro timer without auto-logging
- Notification permission and local reminder structure
- Image report export
- CSV export
- JSON backup export/import
- PWA manifest
- Service worker
- Offline shell caching
- Android install support

---

## 2. Important Phase 1 limitations

This version is intentionally local-only.

- No accounts
- No cloud sync
- No server push notifications
- No admin dashboard
- No PDF export
- No email integration
- No automatic accountability submission
- No native Android app

Notifications work only while the PWA/browser is allowed to run the local reminder checker. Without a backend push server, Phase 1 cannot guarantee server-style scheduled notifications if the app is fully closed for a long time.

---

## 3. File structure

```text
time-audit-pwa/
├── index.html
├── styles.css
├── app.js
├── manifest.json
├── service-worker.js
├── offline.html
├── README.md
└── assets/
    ├── icon-192.png
    └── icon-512.png
```

---

## 4. How to test locally on your computer

### Option A: easiest test

1. Unzip the project.
2. Open the folder.
3. Double-click `index.html`.
4. The app will open in your browser.

This is enough for quick UI testing, but PWA install/offline testing may not fully work from a direct file open.

### Option B: proper local PWA test

1. Install VS Code.
2. Open VS Code.
3. Install the extension called **Live Server**.
4. Open the `time-audit-pwa` folder in VS Code.
5. Right-click `index.html`.
6. Click **Open with Live Server**.
7. The app should open at a local address like:

```text
http://127.0.0.1:5500/index.html
```

### Option C: Python local server

If Python is installed:

1. Open terminal/command prompt in the project folder.
2. Run:

```bash
python -m http.server 8080
```

3. Open:

```text
http://localhost:8080
```

---

## 5. How to deploy on GitHub Pages

This is the most beginner-friendly free deployment method.

### Step 1: Create a GitHub account

Go to GitHub and create an account if you do not already have one.

### Step 2: Create a new repository

1. Click the **+** button at the top right.
2. Click **New repository**.
3. Repository name example:

```text
time-audit-pwa
```

4. Keep it **Public** if you want free GitHub Pages.
5. Click **Create repository**.

### Step 3: Upload files

1. Open the repository.
2. Click **Add file**.
3. Click **Upload files**.
4. Drag and drop all files from inside the `time-audit-pwa` folder.
5. Make sure `index.html`, `app.js`, `styles.css`, `manifest.json`, and `service-worker.js` are in the root of the repository, not inside an extra nested folder.
6. Click **Commit changes**.

Correct GitHub file layout:

```text
repository root/
├── index.html
├── app.js
├── styles.css
├── manifest.json
├── service-worker.js
├── offline.html
└── assets/
```

Wrong layout:

```text
repository root/
└── time-audit-pwa/
    ├── index.html
    ├── app.js
```

### Step 4: Enable GitHub Pages

1. Go to the repository.
2. Click **Settings**.
3. Go to **Pages**.
4. Under **Build and deployment**, choose:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

5. Click **Save**.

### Step 5: Open your live app

GitHub will show a link like:

```text
https://yourusername.github.io/time-audit-pwa/
```

Open it on Chrome.

### Step 6: Install on Android

1. Open the deployed link in Chrome on Android.
2. Tap the three-dot menu.
3. Tap **Add to Home screen** or **Install app**.
4. Confirm install.
5. Open it from your phone home screen.

---

## 6. How to deploy on Netlify

### Drag-and-drop method

1. Go to Netlify.
2. Create an account.
3. Go to **Sites**.
4. Drag the full `time-audit-pwa` folder into Netlify’s deploy area.
5. Netlify will publish the site.
6. Open the Netlify URL.
7. Test the app.
8. Install it on Android from Chrome.

No build command is needed.

---

## 7. How to deploy on Vercel

1. Go to Vercel.
2. Create an account.
3. Create a new project.
4. Import the GitHub repository or upload the folder.
5. Framework preset: **Other**.
6. Build command: leave empty.
7. Output directory: leave empty or use root.
8. Deploy.

---

## 8. How to use the app

### Add a log

1. Open the app.
2. Tap **Add**.
3. Select date.
4. Select start time and end time.
5. Select activity.
6. Category auto-selects from the activity preset.
7. Change category if needed.
8. Select productivity rating.
9. Add optional note.
10. Tap **Save Activity**.

### Fill missing time

1. Go to **Today**.
2. Look at the timeline.
3. Missing time appears as a dotted card.
4. Tap the missing card.
5. Fill activity details.
6. Save.

### Write reflection

1. Go to **Today**.
2. Scroll to **Daily Reflection**.
3. Fill the reflection fields.
4. Save.

### Export image report

1. Go to **Today** or **Reports**.
2. Tap **Export Today** or **Export Image**.
3. Select privacy options.
4. Download image.
5. Share manually through WhatsApp, Messenger, Telegram, etc.

### Export CSV

1. Go to **Reports**.
2. Select the date/range.
3. Tap **Export CSV**.

### Backup all app data

1. Go to **Settings**.
2. Tap **Export JSON Backup**.
3. Save the file somewhere safe.

### Restore backup

1. Go to **Settings**.
2. Tap **Import JSON**.
3. Select the backup file.
4. Confirm import.

---

## 9. Testing checklist

After deployment, test these one by one:

- Add one activity log.
- Add another log with a gap between them.
- Confirm the missing time card appears.
- Tap the missing time card and fill it.
- Try end time before start time and confirm save is blocked.
- Try overlapping time and confirm warning appears.
- Edit a saved log.
- Delete a saved log.
- Create a new category.
- Mark a category as study time.
- Add a target to a category.
- Create a new activity preset.
- Confirm selecting an activity auto-selects its default category.
- Write a daily reflection.
- Check Today summary updates.
- Check Reports summary updates.
- Select up to 3 categories in comparison chart.
- Try selecting more than 3 and confirm it is blocked.
- Select 3–8 categories in radar chart.
- Select up to 3 activities in line chart.
- Start/pause/reset Pomodoro.
- Confirm Pomodoro does not auto-save logs.
- Export image report.
- Export CSV.
- Export JSON backup.
- Import JSON backup.
- Turn on notifications and test notification.
- Disconnect internet and reload after first successful load.
- Install on Android home screen.

---

## 10. Troubleshooting

### The app does not install on Android

Check these:

- The app is served through HTTPS. GitHub Pages, Netlify, and Vercel provide HTTPS.
- `manifest.json` is reachable.
- `service-worker.js` is in the root folder.
- Icons exist in `assets/`.
- You opened the site in Chrome on Android.

### Changes do not show after updating files

The service worker caches files. Try:

1. Open Chrome DevTools.
2. Go to Application.
3. Go to Service Workers.
4. Click **Update** or **Unregister**.
5. Reload the page.

On Android:

1. Chrome settings.
2. Site settings.
3. Storage.
4. Clear site data for your app URL.
5. Open again.

### Data disappeared

Data is stored in the browser. It can disappear if:

- Browser storage is cleared.
- Site data is cleared.
- You use another browser or another phone.
- You use incognito/private mode.

Use JSON backup regularly.

---

## 11. Developer notes

- The app uses only static files.
- No build step is required.
- No package manager is required.
- No server is required.
- Charts are drawn with native Canvas.
- Image report export is drawn with native Canvas.
- CSV export uses JavaScript Blob download.
- PWA offline shell uses a service worker cache.

