# GeoStatsr Chrome/Edge Extension

## What is the GeoStatsr extension
GeoStatsr Extension is a browser extension that automatically sends your GeoGuessr stats to your own GeoStatsr server whenever your game ends. It helps you keep your stats up-to-date and enables advanced stat tracking and analysis outside of GeoGuessr.

## Features
- Automatically detects when a GeoGuessr game ends and sends your stats to your GeoStatsr server
- Lets you manually trigger stat collection or cookie sending
- Supports custom API endpoints and optional private keys
- Simple, privacy-friendly permissions (only accesses geoguessr.com cookies)

## How to Install (Chrome & Edge)

1. **Download the Extension ZIP**
   - [Download ZIP from GitHub](https://github.com/teamcoltra/geostatsr-extension/archive/refs/heads/main.zip)

2. **Extract the ZIP**
   - Unzip the file to a folder on your computer (e.g., `geostatsr-extension-main`).

3. **Open Chrome or Edge and go to the Extensions page**
   - Chrome: Go to `chrome://extensions/`
   - Edge: Go to `edge://extensions/`

4. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner.

5. **Load the Unpacked Extension**
   - Click "Load unpacked"
   - Select the folder you extracted (e.g., `geostatsr-extension-main/geostatsr`)

6. **The extension is now installed!**

## How to Use
1. Click the GeoStatsr icon in your browser toolbar to open the popup.
2. Enter your GeoStatsr server API root URL (Almost always `http://localhost:62826`). Optionally, enter your private key if your server requires one.
3. Click **Save**. The extension will check your server connection and let you know if it worked.
4. When you finish a GeoGuessr game, your stats will be sent automatically to your server.
5. You can also use the popup to manually send your `_ncfa` cookie or force a stat collection.

## Permissions
- Only requests access to cookies and storage for `geoguessr.com`.
- Custom API endpoints are supported for your own server, but no extra permissions are needed for those requests.

## Support & Source Code
- [Get the GeoStatsr Server](https://github.com/teamcoltra/geostatsr)
- For issues or questions, please open an issue on GitHub.
