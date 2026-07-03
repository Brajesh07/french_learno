# Issues Report — 2026-07-03

> **Date:** 2026-07-03
> **Scope:** Code quality, accessibility, security, and mobile WebView readiness issues across `/temp/*` routes and related components.

---

## Issues Summary

| # | File | Severity | Category |
|---|---|---|---|
| 1 | `src/app/temp/dashboard/quizzes/[id]/QuizForm.tsx` | Low | Code quality — duplicate type declarations |
| 2 | `src/app/temp/dashboard/profile/ProfileEditForm.tsx` | Low | Code quality — duplicate interface declaration |
| 3 | `src/app/temp/signup/page.tsx` | Medium | Mobile UX — iOS auto-zoom on input focus |
| 4 | `src/app/temp/login/page.tsx` | Medium | Mobile UX — iOS auto-zoom on input focus |
| 5 | `src/app/temp/dashboard/BottomNav.tsx` | Medium | Accessibility — missing aria-labels on nav items |
| 6 | `src/components/layout/Header.tsx` | Low | Code quality — stale channel cleanup pattern |
| 7 | `src/app/temp/dashboard/quizzes/page.tsx` | Medium | Security — unnecessary admin client for public reads |
| 8 | `src/app/temp/dashboard/profile/page.tsx` | Medium | Security — unnecessary admin client for own-data reads |

---

## Issue Details & Cross-Verification

---

### Issue 1: Duplicate type declarations in QuizForm.tsx

**File:** `src/app/temp/dashboard/quizzes/[id]/QuizForm.tsx`

**Problem:** Interfaces `Answer`, `Question`, `Quiz`, and `Result` are declared twice — once at lines 6-40 (top) and again at lines 269-303 (bottom). Both declarations are identical.

**Cross-verification:** Confirmed. The file has 303 lines. Lines 6-40 declare the four interfaces. Lines 269-303 re-declare the exact same four interfaces with identical shapes. TypeScript may not error (interfaces merge), but this is a maintenance hazard — if one is changed and the other isn't, they silently diverge.

**Fix:** Delete lines 269-303 (the duplicate declarations at the bottom).

**Risk:** None. Identical shapes, no runtime impact.

---

### Issue 2: Duplicate interface in ProfileEditForm.tsx

**File:** `src/app/temp/dashboard/profile/ProfileEditForm.tsx`

**Problem:** The `Profile` interface is declared at lines 7-14 (top) and again at lines 139-146 (bottom). Both are identical.

**Cross-verification:** Confirmed. Lines 7-14: `interface Profile { id, name, username, email, phone, class }`. Lines 139-146: identical declaration. The second one is after the `Field` function and before the end of the file.

**Fix:** Delete lines 139-146 (the duplicate declaration at the bottom).

**Risk:** None. Identical shapes, no runtime impact.

---

### Issue 3: iOS auto-zoom on input focus (signup page)

**File:** `src/app/temp/signup/page.tsx`

**Problem:** The `inputCls` variable at line 55 sets `text-[15px]` on all input fields. iOS Safari/WebKit auto-zoomes on inputs with font-size < 16px. This causes a disruptive zoom when the user taps an input field.

**Cross-verification:** Confirmed. Line 55: `"w-full px-4 py-[14px] rounded-[14px] border border-[#E5E5E5] text-[15px] text-[#111111] bg-[#F5F5F7] outline-none box-border"`. All four inputs (name, username, email, password) use this class. 15px < 16px threshold.

**Fix:** Change `text-[15px]` to `text-[16px]` in the `inputCls` variable on line 55.

**Risk:** Very low. 1px font size increase is visually negligible.

---

### Issue 4: iOS auto-zoom on input focus (login page)

**File:** `src/app/temp/login/page.tsx`

**Problem:** Both input fields (email/username and password) use `text-[15px]` inline (lines 106 and 124). Same iOS auto-zoom issue as Issue 3.

**Cross-verification:** Confirmed. Line 106: `text-[15px]` on email input. Line 124: `text-[15px]` on password input. Both below 16px threshold.

**Fix:** Change `text-[15px]` to `text-[16px]` on both input elements (lines 106 and 124).

**Risk:** Very low. 1px font size increase is visually negligible.

---

### Issue 5: Missing aria-labels on BottomNav items

**File:** `src/app/temp/dashboard/BottomNav.tsx`

**Problem:** The `NavItem` component (lines 35-53) renders icon-only links with no accessible name. Screen readers cannot announce what each tab does. The `<Link>` element has no `aria-label` or `title` attribute.

**Cross-verification:** Confirmed. The `NavItem` function accepts `href`, `icon`, and `active` props — no `label` or `aria-label`. Each `<Link>` only contains an SVG icon with no text content or `aria-label`. The four nav items (Home, Courses, Quizzes, Profile) are all icon-only.

**Fix:** Add a `label` prop to `NavItem` and apply it as `aria-label` on the `<Link>` element. Also add visually hidden text (`<span className="sr-only">`) for screen readers. Update the four call sites in `BottomNav` to pass labels: "Home", "Courses", "Quizzes", "Profile".

**Risk:** None. Purely additive accessibility improvement.

---

### Issue 6: Stale channel cleanup in Header.tsx

**File:** `src/components/layout/Header.tsx`

**Problem:** The `NotificationBell` component (line 96) calls `channel.unsubscribe()` in its cleanup function. The Supabase docs recommend `supabase.removeChannel(channel)` which fully removes the channel from the client, preventing stale channel accumulation on remounts (e.g., hot reload, layout changes).

**Cross-verification:** Confirmed. Line 96: `channel.unsubscribe()`. This only unsubscribes but doesn't remove the channel from Supabase's internal channel list. Over multiple mount/unmount cycles, stale channels can accumulate.

**Fix:** Change `channel.unsubscribe()` to `supabase.removeChannel(channel)` on line 96.

**Risk:** Very low. `removeChannel` is the recommended pattern and does the same thing plus cleanup.

---

### Issue 7: Unnecessary admin client for public reads in quizzes page

**File:** `src/app/temp/dashboard/quizzes/page.tsx`

**Problem:** The page uses `createAdminClient()` (service role) to fetch published quizzes and courses (lines 21-37). Since RLS policies already allow reading published courses/quizzes, the normal `createClient()` would work. Using the admin client bypasses RLS unnecessarily, which could accidentally leak unpublished/private data if filters change.

**Cross-verification:** Confirmed. Line 6: imports both `createClient` and `createAdminClient`. Line 21: `const admin = await createAdminClient()`. Lines 22-37: queries `quizzes` and `courses` tables via admin client with `.eq("is_published", true)` filter. The RLS policy on `courses` is: `create policy "Anyone can read published courses" on public.courses for select using (is_published = true)`. Same for quizzes. So the normal client would work.

**Fix:** Replace `createAdminClient()` with `createClient()` on line 21. Remove the `createAdminClient` import if no longer needed.

**Risk:** Low. The normal client respects RLS, and the queries already filter by `is_published = true`. However, verify that the RLS policies are actually applied in Supabase before deploying — if RLS is disabled on these tables, the normal client would fail.

---

### Issue 8: Unnecessary admin client for own-data reads in profile page

**File:** `src/app/temp/dashboard/profile/page.tsx`

**Problem:** The page uses `createAdminClient()` (service role) to fetch user-specific stats: completed courses count, quiz attempts count, and best score (lines 42-75). Since RLS policies already allow users to read their own `user_progress` and `quiz_attempts`, the normal `createClient()` would work.

**Cross-verification:** Confirmed. Line 42: `const admin = await createAdminClient()`. Lines 54-75: queries `user_progress` and `quiz_attempts` via admin client, filtering by `user_id = user.id`. The RLS policies are:
- `user_progress`: `"Users can read and write own progress" on public.user_progress for all using (auth.uid() = user_id)`
- `quiz_attempts`: `"Users can read own quiz attempts" on public.quiz_attempts for select using (auth.uid() = user_id)`

So the normal client would work for these reads.

**Fix:** Replace `createAdminClient()` with `createClient()` on line 42. Remove the `createAdminClient` import if no longer needed.

**Risk:** Low. Same caveat as Issue 7 — verify RLS is actually enabled. Also note that `quiz_attempts` RLS only allows `select` (not `all`), which is fine since we're only reading.

---

## Recommended Fix Order

1. **Issues 1 & 2** (duplicate types) — Trivial, zero risk, do first
2. **Issues 3 & 4** (iOS auto-zoom) — Simple 1px change, high UX impact on mobile
3. **Issue 5** (aria-labels) — Accessibility improvement, no visual change
4. **Issue 6** (removeChannel) — One-line change, better cleanup
5. **Issues 7 & 8** (admin client removal) — Security improvement, verify RLS first

---

## Awaiting Approval

Please confirm which fixes you'd like me to apply. I can do all 8, or a subset — just let me know.
