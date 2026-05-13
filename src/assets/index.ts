/**
 * Bundled static assets (Vite: content-hashed URLs in production).
 *
 * - `images/` — logos, illustrations, photos
 * - `icons/` — small UI glyphs (prefer SVG); import here when used as URLs
 *
 * Files in `public/` (e.g. `public/icons/favicon.png`) are served at site root;
 * reference them in index.html. `npm run build` runs `prebuild`, which copies
 * `images/brand/logo.png` → `public/icons/favicon.png` so the tab icon stays aligned.
 * During dev, run `npm run sync:favicon` after swapping the logo so the favicon updates.
 */
export { default as brandLogoUrl } from "./images/brand/logo.png";
