# /temp/* Routes — WebView Wrapper Audit Report

> **Purpose:** This report documents every detail of the `/temp/*` routes needed to build a React Native (Expo) WebView wrapper app.

---

## 1. Routes

| Route | File | Type | Description |
|---|---|---|---|
| `/temp/login` | `src/app/temp/login/page.tsx` | Public | Login form — email/username + password. Entry point after app opens (if not logged in). |
| `/temp/signup` | `src/app/temp/signup/page.tsx` | Public | Signup form — name, username, email, password. Calls `supabase.auth.signUp()`. Redirects to `/temp/login` on success. |
| `/temp/dashboard` | `src/app/temp/dashboard/page.tsx` | Protected (SSR) | **Main screen after login.** Shows greeting, subscription status, 7-day calendar strip, horizontal-scroll course cards, quiz cards. Server component — fetches profile + courses + quizzes via admin client. |
| `/temp/dashboard/courses` | `src/app/temp/dashboard/courses/page.tsx` | Protected (SSR) | Course list. Shows lock banner if unsubscribed, otherwise lists courses with level color swatches. |
| `/temp/dashboard/courses/[id]` | `src/app/temp/dashboard/courses/[id]/page.tsx` | Protected (SSR) | Course detail — shows image, text, video (YouTube/Vimeo/native), audio. Has "Mark as Complete" button. Lists linked quizzes. Redirects to `/temp/dashboard` if no subscription. |
| `/temp/dashboard/quizzes` | `src/app/temp/dashboard/quizzes/page.tsx` | Protected (SSR) | Quiz list. Shows lock banner if unsubscribed, otherwise lists quizzes with course name + pass score. |
| `/temp/dashboard/quizzes/[id]` | `src/app/temp/dashboard/quizzes/[id]/page.tsx` | Protected (SSR + client) | Quiz detail + take quiz. Loads questions/answers server-side, renders `QuizForm` client component. |
| `/temp/dashboard/profile` | `src/app/temp/dashboard/profile/page.tsx` | Protected (SSR) | Profile page — avatar, subscription status, French level, stats (courses done, quizzes taken, best score), account details, edit form. |

**Entry point:** `/temp/login` (if unauthenticated) → `/temp/dashboard` (after login).

**Layout:** `/temp/dashboard/layout.tsx` wraps all dashboard routes with `BottomNav` and `pb-16` padding for the nav.

**Bottom nav tabs:** Home (`/temp/dashboard`), Courses (`/temp/dashboard/courses`), Quizzes (`/temp/dashboard/quizzes`), Profile (`/temp/dashboard/profile`).

---

## 2. Auth & Session

- **Auth implementation:** Hybrid — SSR with cookies (`@supabase/ssr`) for server components + client-side (`createBrowserClient`) for client components.
  - Server components call `createClient()` from `src/lib/supabase/server.ts` which uses `cookies()` from `next/headers`.
  - Client components call `createClient()` from `src/lib/supabase/client.ts` which uses `createBrowserClient`.
  - Login/signup pages use the **client-side** supabase client (`signInWithPassword`, `signUp`).
  - Dashboard pages (courses, quizzes, profile) use **server-side** `getUser()` for auth checks.
  - Middleware (`src/middleware.ts`) runs on every request, refreshes the session cookie, and redirects unauthenticated users from `/temp/dashboard/*` to `/temp/login`.

- **Session token storage:** Cookies managed by `@supabase/ssr`. Supabase default cookie names:
  - `sb-<project-ref>-auth-token` (access token, httpOnly, secure, SameSite=Lax)
  - `sb-<project-ref>-auth-token-refresh` (refresh token)
  - Not accessible via `document.cookie` (httpOnly).

- **Session refresh:** Middleware calls `supabase.auth.getUser()` on every request, which triggers a token refresh if the access token is expired. Supabase default access token TTL: **1 hour**. Refresh token TTL: **30 days** (sliding window — refreshed on each use).

- **Logout flow:** `LogoutButton` component calls `supabase.auth.signOut()`, then `router.push("/temp/login")` + `router.refresh()`. Clears all Supabase cookies.

- **Remember me / persistent login:** No explicit "remember me" option. Session persists via refresh token cookie (30-day sliding window). If the user doesn't open the app for 30 days, they'll need to re-login.

---

## 3. Navigation & Links

- **Internal links (all within /temp/*):**
  - Login → `/temp/signup` (footer link)
  - Signup → `/temp/login` (footer link)
  - Dashboard → course cards link to `/temp/dashboard/courses/[id]`
  - Dashboard → quiz cards link to `/temp/dashboard/quizzes/[id]`
  - Bottom nav: `/temp/dashboard`, `/temp/dashboard/courses`, `/temp/dashboard/quizzes`, `/temp/dashboard/profile`
  - Course detail back button → `/temp/dashboard`
  - Quiz detail back button → `/temp/dashboard/courses/[quiz.course_id]` or `/temp/dashboard`
  - Quiz result "Back to Course" → `/temp/dashboard/courses/[quiz.course_id]`

- **Links OUTSIDE /temp/*:** None. All links stay within `/temp/*`.

- **External links:** None found. No WhatsApp, email, phone, PDF, or third-party payment iframe links.

- **YouTube/Vimeo iframes:** Course detail page (`/temp/dashboard/courses/[id]`) embeds YouTube or Vimeo iframes if `content_video_url` matches those patterns. These are embedded `<iframe>` elements, not navigation links.

- **Client-side routing:** All navigation uses Next.js `<Link>` (client-side navigation, no full page load). The `LogoutButton` uses `router.push()` + `router.refresh()`. Course/quiz list pages use `<Link>` with `no-underline`.

- **target="_blank":** None found.

---

## 4. Design System

- **Primary background:** `#F5F5F7` (warm light gray) — used on every page's `<body>` equivalent div.
- **Brand/accent colors:**
  - `#7C3AED` — primary CTA buttons, links, active radio inputs (vibrant purple)
  - `#A78BFA` — brand mark icon, hero banners, secondary accent (light purple)
  - `#6D28D9` — hover state for primary buttons (darker purple)
  - `#C4B5FD` — disabled/loading button state
- **Text colors:**
  - `#111111` — primary text (headings, body)
  - `#555555` / `#666666` — secondary text
  - `#999999` — tertiary/muted text (dates, subtitles)
  - `#333333` / `#444444` — body text on hero banners
- **Top-of-page color (for status bar):** `#F5F5F7` — all pages start with this background. The header area has no distinct top bar; content flows directly.
- **Dark mode:** NOT supported in `/temp/*` pages. All colors are hardcoded light values. (The root `globals.css` has dark mode CSS variables but `/temp/*` pages don't use them.)
- **Font family:** `Geist` (loaded via `next/font/google` in root layout as `--font-geist-sans`), but `globals.css` sets `font-family: Arial, Helvetica, sans-serif` on `<body>`. The `/temp/*` pages use inline Tailwind font sizes/weights, so the rendered font depends on which loads first — likely Geist if available, Arial fallback.
- **App icon/logo:** No image file. The logo is a purple square with rounded corners (`rounded-3xl`) containing a white "F" character — rendered as HTML/CSS in `BottomNav.tsx` and login/signup pages. Path: inline SVG/HTML only, no asset file.

---

## 5. Layout & Responsiveness

- **Mobile-first:** Yes. All `/temp/*` pages are designed for narrow viewports.
  - Auth pages (login/signup): `max-w-[390px]` — explicitly iPhone-width.
  - Dashboard: Full-width with `px-5` padding.
  - Course/quiz lists: Horizontal scroll (`overflow-x-auto`) on dashboard course cards; vertical lists on dedicated pages.
  - Bottom nav: Fixed bottom, `rounded-[40px]` pill shape.

- **Desktop breakpoints:** Some responsive utilities exist (`sm:grid-cols-2` in profile stats), but no desktop-specific layouts. Pages would render fine in wider WebViews but are optimized for ~390px.

- **Viewport meta tag:** Not explicitly configured in `/temp/*` pages. The root layout (`src/app/layout.tsx`) doesn't set a viewport meta tag — Next.js defaults apply. **No `<meta name="viewport">` override found.** You should set this in the WebView config: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` (or handle safe areas).

- **Pinch-zoom:** Not explicitly disabled in HTML. The input fields use `text-[15px]` which prevents iOS auto-zoom on focus (iOS zooms if font < 16px). **15px is slightly below the 16px threshold — iOS may auto-zoom when focusing inputs.** Consider bumping to 16px.

- **Hover states:** Yes, several:
  - Course list items: `hover:bg-[#F5F5F7]` and `group-hover:text-[#7C3AED]`
  - Quiz list items: same pattern
  - Bottom nav: `transition-colors` on active state
  - Login/signup buttons: `hover:bg-[#6D28D9]`
  - **These won't fire on mobile touch** — the visual feedback comes from `active:scale-[0.98]` / `active:scale-95` which does work on touch.

---

## 6. Features Requiring Native APIs

- **Camera/file upload:** N/A
- **Geolocation:** N/A
- **Push notifications:** N/A (server-side notifications via `notifications` table, not push)
- **Clipboard:** N/A
- **Biometrics:** N/A
- **File upload/download:** N/A
- **Iframe embeds:** YouTube and Vimeo iframes in course detail page. These require WebView configuration:
  - Enable JavaScript
  - Enable iframes
  - May need `allowsInlineMediaPlayback` (iOS) for YouTube
  - May need `mediaPlaybackRequiresUserAction: false` for autoplay
- **Audio playback:** `<audio controls>` element in course detail. Works in WebView natively.
- **Video playback:** `<video controls>` element (non-YouTube/Vimeo URLs). Works in WebView natively. May need `allowsInlineMediaPlayback` on iOS.
- **Server actions:** `updateProfile()` in `src/app/temp/dashboard/actions.ts` uses `"use server"` directive — calls Supabase admin client server-side. Works via fetch from client.

---

## 7. Environment

- **Production domain:** Not configured. No Vercel deployment found. The app runs locally at `http://localhost:3000`.
- **Staging domain:** Same — `localhost:3000`.
- **Environment variables:** Single `.env.local` file (no staging/prod split):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://lwtqsdjqipqfmubhuunk.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (configured)
  - `SUPABASE_SERVICE_ROLE_KEY` = (configured)
  - `CLOUDINARY_*` = (configured)
- **Staging vs prod:** No separate builds or env vars. Same Supabase instance used everywhere. For production, you'll need to set these as environment variables in your hosting platform (Vercel, etc.).

---

## 8. Known Issues / Edge Cases

- **iOS auto-zoom on input focus:** Input fields use `text-[15px]` (15px). iOS Safari auto-zoomes on inputs with font-size < 16px. This will be annoying in a WebView. **Fix:** Change all input `text-[15px]` to `text-[16px]` or set viewport `maximum-scale=1`.

- **`100svh` usage:** Dashboard layout uses `min-h-[100svh]`. The `svh` unit (small viewport height) accounts for mobile browser chrome. Expo WebView may not support `svh` — test on real devices. Fallback to `100vh` if needed.

- **YouTube iframe in WebView:** Requires `allowsInlineMediaPlayback` on iOS and `mediaPlaybackRequiresUserAction: false` for smooth playback. On Android, YouTube iframes may open in an external browser unless the WebView client overrides `shouldOverrideUrlLoading`.

- **No `<meta name="viewport">` tag:** The root layout doesn't set a viewport meta tag. Next.js injects a default, but for a WebView app you should explicitly control this to prevent zoom and ensure proper scaling.

- **`hover:` states:** Multiple interactive elements use `hover:` Tailwind classes. These won't provide visual feedback on touch devices, but `active:scale-95` / `active:scale-[0.98]` transitions do work and provide tactile feedback.

- **Cookie-based auth in WebView:** Supabase SSR uses httpOnly cookies. These work in standard WebViews but may have issues in some WebView configurations that block third-party cookies. Ensure the WebView:
  - Accepts cookies from the same domain
  - Doesn't block third-party storage
  - Shares cookie storage with the app (not isolated per WebView instance)

- **`router.refresh()` after logout:** The `LogoutButton` calls `router.refresh()` after `router.push()`. In a WebView, if the push triggers a full page reload, the refresh may be redundant. If using client-side routing, it ensures the server component re-renders with no session.

- **No error boundary:** If a server component throws (e.g., Supabase connection fails), the page will show a Next.js error overlay in development. In production, it'll show a generic error page. Consider wrapping the WebView content in a React Native error boundary.

- **`no-scrollbar` CSS class:** Used on the horizontal course card scroll. This hides the scrollbar entirely — users may not realize they can scroll. The `snap-x snap-center` CSS helps, but consider if this is the desired UX.

---

## Appendix A: Route Map

```
/temp/login                          (public)
/temp/signup                         (public)
/temp/dashboard                      (protected — SSR)
/temp/dashboard/courses              (protected — SSR)
/temp/dashboard/courses/[id]         (protected — SSR)
/temp/dashboard/quizzes              (protected — SSR)
/temp/dashboard/quizzes/[id]         (protected — SSR + client)
/temp/dashboard/profile              (protected — SSR)
```

---

## Appendix B: API Endpoints Called by /temp/* Pages

| Endpoint | Method | Called By | Auth |
|---|---|---|---|
| `/api/auth/lookup-email?username=...` | GET | Login page | None |
| `/api/auth/notify-login` | POST | Login page | Cookie |
| `/api/mobile/courses/[id]/complete` | POST | Course detail (CompleteButton) | Cookie |
| `/api/mobile/quizzes/[id]/submit` | POST | Quiz form (QuizForm) | Cookie |

All other data fetching is done server-side via Supabase admin client (no client API calls).

---

## Appendix C: Color Palette Reference

| Token | Hex | Usage |
|---|---|---|
| Background | `#F5F5F7` | Page background, input backgrounds |
| Primary | `#7C3AED` | CTA buttons, links, radio accent |
| Primary light | `#A78BFA` | Brand mark, hero banners, secondary accent |
| Primary dark | `#6D28D9` | Button hover state |
| Primary muted | `#C4B5FD` | Disabled/loading button |
| Text primary | `#111111` | Headings, body text |
| Text secondary | `#555555` / `#666666` | Labels, descriptions |
| Text muted | `#999999` | Dates, subtitles, placeholders |
| Border | `#E5E5E5` | Input borders, card borders, dividers |
| Success | `#10B981` / `#059669` | Completed state, correct answers |
| Success bg | `#DCFCE7` | Passed quiz result |
| Error | `#FF4B4B` / `#EF4444` | Error text, failed quiz result |
| Error bg | `#FEE2E2` | Failed quiz result |
| Level A1 | `#FBBF24` | Course level badge |
| Level A2 | `#93C5FD` | Course level badge |
| Level B1 | `#F9A8D4` | Course level badge |
| Level B2 | `#A78BFA` | Course level badge |
| Level C1 | `#6EE7B7` | Course level badge |
| Level C2 | `#FCA5A5` | Course level badge |
