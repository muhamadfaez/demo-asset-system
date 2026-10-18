# Search, app icon, and PWA settings

## Search

Use the header search box and press Enter. On a phone, tap the search icon to open the search page. Enter at least two characters.

Results include asset names, tags, serial numbers and models; matching application pages; your own notifications; and, for Superadmins, people by name, email or staff number. Asset results use the same role/department/assignment scope as the asset register. Results are limited per category, with a link to the filtered asset register.

## Change the app icon

1. Sign in as an active Superadmin and open **Settings → Identity**.
2. Choose a PNG, JPG, or WebP image up to 2 MB. Use a square image at least 512 × 512 for best quality; the minimum accepted dimensions are 192 × 192.
3. Check the preview and click **Save settings**.
4. The sidebar, login page, browser tab, Apple touch icon, and PWA manifest use the saved icon.

The browser creates 192, 512, and 180 pixel PNG versions. They are stored in the existing D1 `SystemSetting` table, so no R2 setup or schema migration is needed. Choose **Restore default icon**, then save, to reset it. Already installed apps may refresh branding later; reinstall if the OS continues to show an older icon.

## PWA configuration

Open **Settings → Progressive web app** to configure installation, installed app name, short home screen name, description, theme colour, launch background colour, display mode, and orientation. Click **Save settings** to apply changes. Browser and OS support determines the actual display/orientation used.

The manifest is at `/manifest.webmanifest`. Its fixed start URL is `/dashboard`; signed-out users pass through the normal Google login. Scope and app ID are `/`. The manifest includes 192/512 PNG icons, maskable icons, and shortcuts to Dashboard, Assets, and Search. Apple touch metadata uses a 180 pixel icon. The default icon is included in the repository.

The download button in the header opens the installation prompt when supported. On iPhone/iPad, use Safari → Share → Add to Home Screen. On supported desktop/Android browsers, use Install app or Add to Home screen from the browser menu. The install button is hidden when the browser reports standalone mode.

The service worker caches public JavaScript/CSS and the generic offline page. It never caches authenticated HTML, API/authentication responses, or asset records. Offline navigation displays a reconnect page, and open pages show a connection warning. Changes are not queued offline; reconnect and submit them online.

Navigation links do not prefetch entire pages in the background. This reduces unnecessary server rendering and D1 queries when users open a page with many navigation links. The borrowing queue uses pages of 20 requests.

When a new worker is waiting, an update message lets users save their work before **Update and reload**. Turning installation off removes the manifest link and unregisters this app's service worker on the next online page load. It cannot remove an installed app from the user's device.

This implementation provides installability, branding, offline fallback, and update handling. Web push subscriptions, background sync, and offline record editing are not part of this release.

## Deployment and checks

Run `npm test` and `npm run build`, then deploy through the connected Cloudflare build as usual. The existing D1 binding and secrets are unchanged. No SQL migration is needed because new settings have defaults and are upserted into `SystemSetting`.

After deployment:

1. Search for a known asset tag and open the result. Try a staff email as Superadmin.
2. Check a regular user's search only returns assets within their access and their own notifications; the people directory must not appear.
3. Upload an icon, save, reload, and check `/app-icon/192`, `/app-icon/512`, and `/app-icon/180`.
4. Open `/manifest.webmanifest` and confirm the configured name, colours, and PNG icon URLs.
5. In browser developer tools, open **Application → Manifest** and **Service Workers**. Check the manifest and registration, then install in a supported browser.
6. After loading once online, go offline and navigate to another page. A generic offline page should appear. Restore the connection and choose Try again.
7. Inspect Cache Storage: only public app files should be present; no account/asset API responses or authenticated HTML.

References: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
