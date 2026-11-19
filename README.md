# ShootBook

A free, local-first photography planner PWA.

## Run it on your Mac
1. Unzip the folder.
2. Open `index.html` in a browser to preview the basic app.
3. For installable/offline PWA testing, serve the folder over localhost:
   - If Python 3 is installed, open Terminal in this folder and run:
     `python3 -m http.server 8000`
   - Visit `http://localhost:8000` in your browser.
4. For installation on phones, publish the folder to a free HTTPS host such as GitHub Pages. Then open the HTTPS address on your phone and use the browser's Add to Home Screen option.

## Data and privacy
ShootBook stores shoot records in the browser's localStorage. Data does not sync between devices. Use Backup & settings to export a JSON backup regularly. Importing a backup replaces the current local records.

Weather lookup uses the free Open-Meteo geocoding and forecast endpoints and therefore needs an internet connection. It sends the location text you enter to that service. No weather API key is needed.

## Current starter version
Includes shoot creation/editing/deletion, client/contact fields, dates, locations, notes, status, manual payment tracking, shot lists, equipment checklists, inspiration URLs, a basic weather lookup, and JSON backup/restore.

Reference photos are currently saved as links rather than uploading image files. Payment tracking is a record only; it does not accept or process payments.
