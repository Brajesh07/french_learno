# Tier 1 Skeleton Plan (Cross-Check Only)

Scope:

- `/src/app/temp/dashboard/page.tsx`
- `/src/app/temp/dashboard/courses/page.tsx`
- `/src/app/temp/dashboard/quizzes/page.tsx`
- `/src/app/temp/dashboard/profile/page.tsx`
- `/src/app/temp/dashboard/courses/[id]/page.tsx`
- `/src/app/temp/dashboard/quizzes/[id]/page.tsx`

Constraint respected: planning/report only. No skeleton implementation code added.

---

## Existing Skeleton/Shimmer Reuse Check

### Is there a shared skeleton/shimmer component in `src/components/ui/`?

Result: **No dedicated shared skeleton component** in `src/components/ui/`.

Files present in `src/components/ui/`:

- `Button.tsx`
- `Input.tsx`
- `Textarea.tsx`
- `SimpleRichTextEditor.tsx`
- `ThemeProvider.tsx`

Only reusable skeleton helper found in project is local to analytics page:

- `SkeletonBox` in `/src/app/dashboard/analytics/page.tsx` (not exported/shared).

### Existing shimmer classes/patterns used in project

Common classes currently used by admin skeletons:

- `animate-pulse`
- `bg-gray-200`
- `dark:bg-gray-700`
- `rounded`, `rounded-lg`, `rounded-full`
- Placeholder sizing via utilities like `h-8 w-64`, `h-16`, `h-32`, `h-64`

Representative style pattern in existing code:

- wrapper: `animate-pulse`
- blocks: `bg-gray-200 dark:bg-gray-700 rounded`

Note for `/temp/*`: pages are light-theme branded with custom hex colors and do not currently use dark variants. Skeletons should match temp style while preserving the same animation convention (`animate-pulse`).

### Confirmed `/temp/*` visual palette to match

From audited temp pages/layout:

- Screen background: `#F5F5F7` (`/src/app/temp/dashboard/layout.tsx`)
- Primary accent purple family: `#A78BFA`, `#7C3AED`, hover `#6D28D9`
- Primary text: `#111111`
- Secondary text: `#333333`, `#444444`, `#555555`, muted `#999999`
- Card/background white: `#FFFFFF`
- Border neutral: `#E5E5E5`
- Supporting palette: `#FBBF24`, `#93C5FD`, `#F9A8D4`, `#6EE7B7`, `#FCA5A5`

Skeleton styling match recommendation for temp routes:

- Keep `animate-pulse`
- Prefer light blocks like `bg-white`, `bg-[#E5E5E5]`, `bg-[#F0F0F0]` over dark-mode placeholders
- Preserve rounded language used by temp pages (`rounded-[14px]`, `rounded-[20px]`, `rounded-[24px]`)

---

## Page-by-Page Plan

## 1) `/src/app/temp/dashboard/page.tsx`

### 1. UI sections present

1. Top header: avatar circle, greeting + date text, logout button region
2. Hero banner card: plan pill, headline, subtext
3. Week calendar strip: 7 day cells
4. Courses section:
   - section title + count pill
   - horizontally scrollable card rail (course cards)
   - or locked-state card / empty card
5. Quizzes section:
   - section title + count pill
   - horizontally scrollable card rail (quiz cards)
   - or locked-state card / empty card

### 2. Exact skeleton shapes

1. Header skeleton:
   - 1 circular avatar placeholder (42x42)
   - 2 text bars (greeting + date)
   - 1 circular button placeholder for logout
2. Hero skeleton:
   - 1 large rounded banner block (`min-h` matching hero)
   - inside: 1 pill placeholder + 2 headline bars + 1 subtitle bar
3. Week strip skeleton:
   - 7 equal rounded tiles, each with 3 mini bars/dot placeholders
4. Courses skeleton:
   - heading row: 1 title bar + 1 small pill placeholder
   - card rail: 3 horizontal cards (each with badge chip, title bar, meta bar, CTA bar)
5. Quizzes skeleton:
   - heading row: 1 title bar + 1 small pill placeholder
   - card rail: 3 horizontal cards (same shape as courses)

### 3. Skeleton location

- **Separate route segment file**: `src/app/temp/dashboard/loading.tsx`
- Rationale: route is server-rendered; this gives transition-level feedback automatically.

### 4. Existing skeleton/shimmer utilities/components used by this page

- No page-local skeleton utility exists.
- Project pattern to match: `animate-pulse` block placeholders (from admin pages).

---

## 2) `/src/app/temp/dashboard/courses/page.tsx`

### 1. UI sections present

1. Sticky header: page title + optional count pill
2. Main content stack:
   - upgrade banner card when unsubscribed
   - empty state card when no courses
   - or list of course rows (swatch, title/meta, chevron)

### 2. Exact skeleton shapes

1. Header skeleton:
   - 1 title bar
   - 1 count pill placeholder aligned right
2. Top banner skeleton:
   - 1 rounded hero-like card with 2 text bars
3. List skeleton:
   - 5 vertical row cards
   - each row: square/swatch block + 2 text bars + circular chevron placeholder

### 3. Skeleton location

- **Separate route segment file**: `src/app/temp/dashboard/courses/loading.tsx`

### 4. Existing skeleton/shimmer utilities/components used by this page

- None in-file.
- Reuse project class pattern: `animate-pulse` + rounded block placeholders.

---

## 3) `/src/app/temp/dashboard/quizzes/page.tsx`

### 1. UI sections present

1. Sticky header: page title + optional count pill
2. Main content stack:
   - upgrade banner card when unsubscribed
   - empty state card when no quizzes
   - or list of quiz rows (icon swatch, title/meta, chevron)

### 2. Exact skeleton shapes

1. Header skeleton:
   - 1 title bar
   - 1 count pill placeholder
2. Top banner skeleton:
   - 1 rounded banner block + 2 text bars
3. List skeleton:
   - 5 vertical row cards
   - each row: icon square placeholder + 2 text bars + chevron circle placeholder

### 3. Skeleton location

- **Separate route segment file**: `src/app/temp/dashboard/quizzes/loading.tsx`

### 4. Existing skeleton/shimmer utilities/components used by this page

- None in-file.
- Use existing project skeleton class style (`animate-pulse`, simple block placeholders).

---

## 4) `/src/app/temp/dashboard/profile/page.tsx`

### 1. UI sections present

1. Header: title + logout control
2. Avatar/profile hero card
3. Subscription status card
4. French level progress card with level chips
5. 3-column stats cards
6. Account details card (multiple rows)
7. Edit profile form trigger/card (`ProfileEditForm` collapsed button by default)

### 2. Exact skeleton shapes

1. Header skeleton:
   - title bar + circular action placeholder
2. Avatar card skeleton:
   - circle avatar placeholder + 3 text bars
3. Subscription card skeleton:
   - icon circle + 2 text bars
4. Level progress card skeleton:
   - section label bar + 6 small rounded level chip placeholders + 1 caption bar
5. Stats skeleton:
   - 3 equal stat cards with value bar + label bar each
6. Account details skeleton:
   - card header bar + 4-5 row skeleton lines (label/value pairs)
7. Edit form trigger skeleton:
   - single rounded button-like row with left text bar + right icon placeholder

### 3. Skeleton location

- **Separate route segment file**: `src/app/temp/dashboard/profile/loading.tsx`

### 4. Existing skeleton/shimmer utilities/components used by this page

- None in-file.
- `ProfileEditForm` has submit loading but not initial page skeleton.

---

## 5) `/src/app/temp/dashboard/courses/[id]/page.tsx`

### 1. UI sections present

1. Sticky header: back button + title
2. Course hero/banner card with level chip and optional completion badge
3. Optional media/content sections (conditional):
   - image block
   - lesson text card
   - video card
   - audio card
4. Completion action panel (`CompleteButton`)
5. Optional quizzes list card

### 2. Exact skeleton shapes

1. Header skeleton:
   - circular back button placeholder + title bar
2. Hero skeleton:
   - large rounded banner, chip placeholder, 2 title bars, 1 subtitle bar
3. Content skeleton set (generic robust default):
   - 1 media rectangle (16:9)
   - 1 text content card (section label + 4-5 text bars)
   - 1 secondary media card block
4. Completion panel skeleton:
   - left: icon circle + 2 text bars
   - right: pill/button placeholder
5. Quizzes list skeleton:
   - section title bar + 3 list rows (title/meta + chevron)

### 3. Skeleton location

- **Separate dynamic segment file**: `src/app/temp/dashboard/courses/[id]/loading.tsx`

### 4. Existing skeleton/shimmer utilities/components used by this page

- No initial skeleton currently.
- `CompleteButton` has action-level spinner only.

---

## 6) `/src/app/temp/dashboard/quizzes/[id]/page.tsx`

### 1. UI sections present

1. Header: back button + quiz title
2. Quiz hero/banner card (question count, pass score, description)
3. Quiz body rendered by `QuizForm` component:
   - multiple question cards with answer options
   - submit action

### 2. Exact skeleton shapes

1. Header skeleton:
   - circular back placeholder + title bar
2. Hero skeleton:
   - rounded banner, pill placeholder, title bars, subtitle bar
3. Quiz form skeleton:
   - 3 question cards:
     - question title bar
     - 4 answer row placeholders each
   - submit button placeholder at bottom

### 3. Skeleton location

- **Separate dynamic segment file**: `src/app/temp/dashboard/quizzes/[id]/loading.tsx`

### 4. Existing skeleton/shimmer utilities/components used by this page

- No initial loading skeleton in page.
- `QuizForm` has submission pending UI but no data-load skeleton.

---

## Placement Strategy Decision (All 6 Pages)

For all six audited pages, preferred location is **route-level `loading.tsx`** rather than in-file conditional loading state.

Why:

- All six pages are async server components.
- Route-level loaders provide transition feedback before page payload resolves.
- Keeps page files focused on real content and avoids intermixing fetch state branches in server components.

Planned files (not yet created):

- `src/app/temp/dashboard/loading.tsx`
- `src/app/temp/dashboard/courses/loading.tsx`
- `src/app/temp/dashboard/quizzes/loading.tsx`
- `src/app/temp/dashboard/profile/loading.tsx`
- `src/app/temp/dashboard/courses/[id]/loading.tsx`
- `src/app/temp/dashboard/quizzes/[id]/loading.tsx`

---

## Style Matching Guardrails (for implementation phase)

When implementing later, match existing project style:

1. Animation: use `animate-pulse` (already standard in admin skeletons).
2. Base temp backdrop: keep `bg-[#F5F5F7]` and existing spacing rhythm (`px-5`, `pt-4`, `pb-5`, `gap-*`).
3. Placeholder tones for temp look:
   - card base: `bg-white`
   - placeholder bars: `bg-[#E5E5E5]` / `bg-[#F0F0F0]`
   - keep rounded radii aligned with temp cards (`rounded-[14px]`, `rounded-[20px]`, `rounded-[24px]`).
4. Do not introduce a new visual language (e.g., dark skeleton palette) in temp routes.
