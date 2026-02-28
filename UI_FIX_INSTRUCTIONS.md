# EvalEase — UI Fix Instructions
### For Claude Opus 4.6 (VSCode Agent) & Agentic IDE Agent

---

## READ THIS BEFORE WRITING A SINGLE LINE OF CODE

You have already audited this codebase and produced a detailed report of aesthetic issues. This document is your implementation guide. It tells you **what to fix, in what order, and — critically — how to think about the fixes**.

The core mistake that created these problems was **component-by-component thinking**. Components were built one at a time, each making locally reasonable decisions, with no governing system to ensure they compose into a unified whole. The fix must be the opposite: **system-first, then components**.

This means:
1. You establish the design system rules first (tokens, scales, semantic definitions)
2. Every component fix then follows from those rules — not from what "looks good" in isolation

Do not skip ahead to fixing individual components before completing the system layers. A component fixed before the system is re-established will just create new inconsistencies.

**Take your time. Read the relevant files before touching them. Understand before changing.**

---

## ABSOLUTE CONSTRAINTS — NEVER VIOLATE THESE

- ✅ Light theme only. No dark mode changes.
- ✅ shadcn/ui stays. Do not replace or remove any shadcn component.
- ✅ Color palette stays. Do not change the HSL values of the existing color tokens.
- ✅ Font choices stay (Plus Jakarta Sans, Space Grotesk, Lora).
- ✅ All changes must flow from CSS variables / design tokens — no new hardcoded Tailwind color utilities.
- ✅ After each phase, the app must still build and run without errors.
- ✅ Do not refactor working business logic or data-fetching code. UI only.

---

## HOW TO USE THIS DOCUMENT

This document is split into **6 phases**. Each phase must be completed fully before starting the next.

- **Phases 1–3** are pure system work (CSS variables, tokens, type scale). No component files are touched yet.
- **Phases 4–6** are component work, but every decision references the system you built in Phases 1–3.

Each phase has:
- **What you're doing** — the goal
- **Why it matters** — the visual reasoning
- **Exact files to change**
- **Specific instructions**
- **Verification check** — how to confirm the phase is done correctly

---

## PHASE 1: Rebuild the Shadow System

### What you're doing
Replacing the current non-functional shadow scale with a perceptible, tiered depth system tuned for the warm cream background (`hsl(30 20% 97%)`).

### Why it matters
The audit confirmed that `--shadow-2xs` and `--shadow-xs` are literally identical values, and `--shadow-sm` through `--shadow-md` are visually indistinguishable at 6% opacity on a light warm background. Since you removed card borders and replaced them with shadows as the depth mechanism — the entire visual hierarchy depends on working shadows. Right now, everything looks flat because the shadows don't exist perceptibly.

### File to change
`app/globals.css` — shadow variable section only

### Instructions

Replace the shadow scale with a system that has **four semantically meaningful tiers**:

```css
/* SHADOW SYSTEM — Tuned for hsl(30 20% 97%) warm cream background */
/* Each tier must be perceptibly different from the previous */

/* Tier 1: Subtle lift — for cards that rest on the surface */
--shadow-sm: 0px 1px 2px 0px hsl(220 15% 20% / 0.06),
             0px 1px 4px 0px hsl(220 15% 20% / 0.04);

/* Tier 2: Standard card elevation — default for most cards */
--shadow:    0px 2px 4px 0px hsl(220 15% 20% / 0.07),
             0px 4px 12px 0px hsl(220 15% 20% / 0.06);

/* Tier 3: Raised — for cards that need visual prominence */
--shadow-md: 0px 4px 8px 0px hsl(220 15% 20% / 0.08),
             0px 8px 24px 0px hsl(220 15% 20% / 0.07);

/* Tier 4: Floating — for modals, dropdowns, popovers */
--shadow-lg: 0px 8px 16px 0px hsl(220 15% 20% / 0.10),
             0px 16px 40px 0px hsl(220 15% 20% / 0.09);

/* Tier 5: Overlay — for dialogs that sit above everything */
--shadow-xl: 0px 12px 24px 0px hsl(220 15% 20% / 0.12),
             0px 24px 60px 0px hsl(220 15% 20% / 0.10);

/* Keep these for edge cases */
--shadow-2xs: 0px 1px 2px 0px hsl(220 15% 20% / 0.04);
--shadow-xs:  0px 1px 3px 0px hsl(220 15% 20% / 0.05),
              0px 1px 2px 0px hsl(220 15% 20% / 0.04);
--shadow-2xl: 0px 24px 48px 0px hsl(220 15% 20% / 0.14),
              0px 48px 80px 0px hsl(220 15% 20% / 0.12);
```

**Key change from current system:**
- Use the primary color's hue (`hsl(220 15% 20%/...)`) instead of pure black (`hsl(0 0% 0%/...)`) for shadows. Colored shadows feel warmer and more premium on warm backgrounds.
- Dramatically increase the blur radius and y-offset spread between tiers so they are perceptibly different.
- The opacity range goes from 0.04 to 0.14 — much wider than the current 0.03–0.06 range.

### Update card-premium utility
In the same `globals.css`, update the `.card-premium` utility:

```css
.card-premium {
  box-shadow: var(--shadow);           /* Tier 2 at rest */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card-premium:hover {
  box-shadow: var(--shadow-md);        /* Tier 3 on hover — now actually visible */
}
```

### Define semantic shadow roles (add as comments in globals.css)
```css
/* SHADOW USAGE GUIDE — follow this across all components:
   --shadow-sm  → Stat cards, inline info blocks (low hierarchy)
   --shadow     → Standard content cards (default elevation)
   --shadow-md  → Primary action cards, hovered cards
   --shadow-lg  → Dropdowns, popovers, floating panels
   --shadow-xl  → Dialogs, modals
*/
```

### Verification check
After this change, if you look at a page with cards, the cards should visibly appear to float above the background. The shadow should be noticeable without being dramatic. On hover, the elevation change should be clearly perceptible.

### ✅ PHASE 1 — COMPLETED (2025-02-28)

**Issue:** The shadow scale in `globals.css` was non-functional. `--shadow-2xs` and `--shadow-xs` were identical values. `--shadow-sm` through `--shadow-md` were visually indistinguishable (all using `hsl(0 0% 0% / 0.06)` with near-identical blur/spread). The `card-premium` utility went from `--shadow-sm` to `--shadow-md` on hover — a change invisible to the human eye on the warm cream background.

**What was done:**
1. **`:root` shadow scale replaced** — All 8 shadow tiers (`--shadow-2xs` through `--shadow-2xl`) rewritten with:
   - Warm-tinted shadows using `hsl(220 15% 20% / ...)` (primary hue) instead of pure black `hsl(0 0% 0% / ...)`
   - Opacity range widened from 0.03–0.06 → 0.04–0.14
   - Blur radii now vary dramatically between tiers (2px → 4px → 12px → 24px → 40px → 60px → 80px) instead of the old uniform 2–5px
   - Y-offsets increase meaningfully per tier (1px → 2px → 4px → 8px → 12px → 24px)
2. **`.dark` shadow scale replaced** — Same tier structure with higher opacities (0.08–0.28) tuned for dark backgrounds, using `hsl(220 15% 10% / ...)`
3. **`card-premium` utility updated** — Rest state now uses `--shadow` (Tier 2, visible float) instead of `--shadow-sm`. Hover uses `--shadow-md` (Tier 3, perceptible lift). Transition narrowed from `all 0.2s` to `box-shadow 0.2s ease, transform 0.2s ease`
4. **Shadow usage guide added** as comments in `:root` documenting semantic roles for each tier
5. **Removed legacy helper variables** (`--shadow-x`, `--shadow-y`, `--shadow-blur`, `--shadow-spread`, `--shadow-opacity`, `--shadow-color`) that were unused artifacts

**Files changed:** `src/app/globals.css`  
**Build status:** ✅ Compiles successfully (`bun run build` — TypeScript passes, all routes build)  
**Status:** FIXED

---

## PHASE 2: Establish the Typography System

### What you're doing
Creating a real, usable typographic scale with clear semantic tiers and ensuring the heading font actually reaches heading elements.

### Why it matters
The audit found that `text-xs text-muted-foreground` is applied to card descriptions, dates, stat labels, captions, and form hints — they all look identical. The heading font (Space Grotesk) is not reaching `CardTitle` elements because they render as `<div>`, not `<h2>`. The `font-heading` Tailwind utility exists but is never used.

### File to change
`app/globals.css` — typography section and `@layer base`

### Instructions

**Step 1: Fix the heading font application in @layer base**

The current rule applies letter-spacing to h1-h6 but doesn't set the font family. Fix it:

```css
@layer base {
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    letter-spacing: -0.025em;
    font-weight: 600;
  }
}
```

**Step 2: Define semantic text utility classes**

Add these to `@layer utilities` in `globals.css`. These become your system-wide type scale:

```css
@layer utilities {
  /* PAGE LEVEL — main page titles */
  .text-page-title {
    font-family: var(--font-heading);
    font-size: 1.5rem;       /* 24px */
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: hsl(var(--foreground));
  }

  /* SECTION LEVEL — section headings within a page */
  .text-section-title {
    font-family: var(--font-heading);
    font-size: 1.125rem;     /* 18px */
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.3;
    color: hsl(var(--foreground));
  }

  /* CARD LEVEL — card headings */
  .text-card-title {
    font-family: var(--font-heading);
    font-size: 0.9375rem;    /* 15px */
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.4;
    color: hsl(var(--foreground));
  }

  /* BODY — standard body text */
  .text-body {
    font-size: 0.875rem;     /* 14px */
    font-weight: 400;
    line-height: 1.6;
    color: hsl(var(--foreground));
  }

  /* LABEL — field labels, stat labels */
  .text-label {
    font-size: 0.8125rem;    /* 13px */
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1.4;
    color: hsl(var(--muted-foreground));
  }

  /* CAPTION — dates, secondary info, helper text */
  .text-caption {
    font-size: 0.75rem;      /* 12px */
    font-weight: 400;
    line-height: 1.4;
    color: hsl(var(--muted-foreground));
  }

  /* METADATA — timestamps, counts, tiny labels */
  .text-meta {
    font-size: 0.6875rem;    /* 11px */
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1.3;
    color: hsl(var(--muted-foreground) / 0.8);
  }
}
```

**Step 3: Remove all inline `style={{ fontFamily: 'var(--font-heading)' }}`**

Search the entire codebase for `style={{ fontFamily:` and replace each instance with the appropriate utility class from the scale above. The heading font should be applied via class, not inline style.

**Step 4: Apply the scale to CardTitle**

In `components/ui/card.tsx`, update `CardTitle`:

```tsx
// Before
<div className={cn("font-semibold leading-none tracking-tight", className)} ...>

// After  
<div className={cn("text-card-title", className)} ...>
```

### Verification check
After this phase, a page should show clearly distinct visual weight between: page title → section heading → card title → body text → labels → captions → metadata. You should be able to distinguish all six tiers at a glance. Space Grotesk should be visible on all card titles and section headings.

### What was done
1. **Heading base rule fixed** — Added `font-weight: 600;` to the `h1–h6` rule in `@layer base` so all native headings get the correct weight
2. **Semantic typography scale added** — 7 utility classes (`.text-page-title`, `.text-section-title`, `.text-card-title`, `.text-body`, `.text-label`, `.text-caption`, `.text-meta`) added to `@layer utilities` in `globals.css`. Note: Used `var(--foreground)` directly instead of `hsl(var(--foreground))` since Tailwind v4 CSS variables store the full `hsl(...)` value. Used `color-mix(in srgb, var(--muted-foreground) 80%, transparent)` for `.text-meta` opacity
3. **All 26 inline `style={{ fontFamily: 'var(--font-heading)' }}` instances removed** across 24 files:
   - 21 page headings (`<h2>`) across teacher/student/admin portals → replaced `text-2xl font-semibold tracking-tight` + inline style with single `text-page-title` class
   - 3 sidebar brand names (`app-sidebar-teacher/student/admin.tsx`) → removed inline style, added `font-heading` utility class (available via `@theme { --font-family-heading }`)
   - 2 login page instances (`login-content.tsx`) → replaced with `text-page-title`
4. **CardTitle updated** in `components/ui/card.tsx` — Changed from `cn("font-semibold leading-none tracking-tight", className)` to `cn("text-card-title", className)` so all card titles use the heading font at 15px/600 weight

**Files changed:** `src/app/globals.css`, `src/components/ui/card.tsx`, `src/app/login/components/login-content.tsx`, `src/components/app-sidebar-teacher.tsx`, `src/components/app-sidebar-student.tsx`, `src/components/app-sidebar-admin.tsx`, `src/app/teacher/error.tsx`, `src/app/teacher/not-found.tsx`, `src/app/teacher/analytics/page.tsx`, `src/app/teacher/notifications/page.tsx`, `src/app/teacher/settings/page.tsx`, `src/app/student/error.tsx`, `src/app/student/notifications/page.tsx`, `src/app/student/settings/page.tsx`, `src/app/admin/error.tsx`, `src/app/admin/analytics/page.tsx`, `src/app/admin/notifications/page.tsx`, `src/app/admin/settings/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/users/all/page.tsx`, `src/app/admin/users/add/page.tsx`, `src/app/admin/users/teachers/page.tsx`, `src/app/admin/users/students/page.tsx`, `src/app/admin/system/page.tsx`, `src/app/admin/system/overview/page.tsx`, `src/app/admin/system/logs/page.tsx`, `src/app/admin/system/backups/page.tsx`  
**Build status:** ✅ Compiles successfully (`bun run build` — TypeScript passes, all routes build)  
**Status:** FIXED

---

## PHASE 3: Complete the Design Token System (Semantic Color Tokens)

### What you're doing
Adding semantic color tokens for success, warning, info, and danger states — then replacing every hardcoded raw Tailwind color in the codebase with these tokens.

### Why it matters
The student test modal, submit modal, and evaluations cards use raw Tailwind colors (`slate-50`, `blue-50`, `green-600`, `yellow-100`, `red-500`, `emerald-50`, `indigo-50`). These cool-toned colors fight directly against the app's warm stone palette. The fix is not to change these colors manually one by one — it's to define semantic tokens that harmonize with the warm palette, then replace every hardcoded instance.

### File to change
`app/globals.css` — CSS variables section

### Instructions

**Step 1: Add semantic state tokens to `:root`**

These are warm-tinted versions of the semantic colors, harmonizing with `hsl(30 20% 97%)`:

```css
:root {
  /* ... existing tokens ... */

  /* SUCCESS — warm green, not pure Tailwind green */
  --success:            142 45% 38%;
  --success-foreground: 0 0% 100%;
  --success-subtle:     142 35% 94%;
  --success-border:     142 35% 75%;
  --success-text:       142 45% 30%;

  /* WARNING — warm amber, harmonizes with the cream palette */
  --warning:            38 85% 48%;
  --warning-foreground: 0 0% 100%;
  --warning-subtle:     38 80% 94%;
  --warning-border:     38 70% 72%;
  --warning-text:       38 75% 32%;

  /* INFO — warm blue, less cold than default Tailwind blue */
  --info:               215 60% 45%;
  --info-foreground:    0 0% 100%;
  --info-subtle:        215 50% 94%;
  --info-border:        215 45% 72%;
  --info-text:          215 60% 35%;

  /* DANGER — uses existing destructive, adding subtle variants */
  --danger-subtle:      0 70% 94%;
  --danger-border:      0 60% 75%;
  --danger-text:        0 70% 38%;
}
```

**Step 2: Add semantic utility classes**

```css
@layer utilities {
  /* SUCCESS states */
  .bg-success-subtle    { background-color: hsl(var(--success-subtle)); }
  .border-success       { border-color: hsl(var(--success-border)); }
  .text-success         { color: hsl(var(--success-text)); }
  .bg-success           { background-color: hsl(var(--success)); }
  .text-success-fg      { color: hsl(var(--success-foreground)); }

  /* WARNING states */
  .bg-warning-subtle    { background-color: hsl(var(--warning-subtle)); }
  .border-warning       { border-color: hsl(var(--warning-border)); }
  .text-warning         { color: hsl(var(--warning-text)); }
  .bg-warning           { background-color: hsl(var(--warning)); }
  .text-warning-fg      { color: hsl(var(--warning-foreground)); }

  /* INFO states */
  .bg-info-subtle       { background-color: hsl(var(--info-subtle)); }
  .border-info          { border-color: hsl(var(--info-border)); }
  .text-info            { color: hsl(var(--info-text)); }
  .bg-info              { background-color: hsl(var(--info)); }
  .text-info-fg         { color: hsl(var(--info-foreground)); }

  /* DANGER states (extending existing destructive) */
  .bg-danger-subtle     { background-color: hsl(var(--danger-subtle)); }
  .border-danger        { border-color: hsl(var(--danger-border)); }
  .text-danger          { color: hsl(var(--danger-text)); }
}
```

**Step 3: Systematic replacement of hardcoded colors**

Search the entire codebase for each pattern and replace:

| Find (hardcoded) | Replace with |
|---|---|
| `bg-slate-50`, `bg-slate-100` | `bg-muted/50` or `bg-muted` |
| `text-slate-600`, `text-slate-700` | `text-muted-foreground` |
| `text-slate-800`, `text-slate-900` | `text-foreground` |
| `bg-blue-50`, `bg-blue-100` | `bg-info-subtle` |
| `border-blue-200` | `border-info` |
| `text-blue-600`, `text-blue-700` | `text-info` |
| `bg-green-50`, `bg-green-100` | `bg-success-subtle` |
| `border-green-200`, `border-green-300` | `border-success` |
| `text-green-600`, `text-green-700` | `text-success` |
| `bg-green-600`, `hover:bg-green-700` | `bg-success hover:bg-success/90` |
| `bg-yellow-50`, `bg-yellow-100` | `bg-warning-subtle` |
| `border-yellow-200`, `border-yellow-300` | `border-warning` |
| `text-yellow-600`, `text-yellow-700` | `text-warning` |
| `bg-red-50`, `bg-red-100` | `bg-danger-subtle` |
| `border-red-200` | `border-danger` |
| `text-red-600`, `text-red-700`, `text-red-800` | `text-danger` |
| `bg-red-500`, `bg-red-600` | `bg-destructive` |
| `bg-emerald-50` | `bg-success-subtle` |
| `border-emerald-200` | `border-success` |
| `bg-indigo-50` | `bg-info-subtle` |
| `from-blue-50 to-indigo-50` | `from-info-subtle to-info-subtle/60` |

### Verification check
After this phase, grep for `bg-slate`, `bg-blue`, `bg-green`, `bg-yellow`, `bg-red`, `bg-emerald`, `bg-indigo`, `text-slate`, `text-blue`, `text-green`, `text-yellow`, `text-red` in all component files. There should be zero results. Every semantic color usage now goes through the token system and will harmonize with the warm cream palette.

**Status:** FIXED

### Implementation notes
- CSS variables store full `hsl()` values (e.g., `--success: hsl(142 45% 38%);`) matching existing codebase convention
- Colors registered in `@theme inline` as `--color-success: var(--success)` for full Tailwind v4 modifier support (`bg-success/90`, `from-info-subtle`, gradient stops, opacity)
- Custom `@layer utilities` overrides auto-generated `text-*` and `border-*` with darker readable text shades and medium border shades
- 11 component files updated (46 total replacements): admin-dashboard-content, login-content, batch-marks-report-modal, tasks-list-modal, student-submit-modal, evaluations-content, student/assignments/pending/page, student/assignments/page, student-test-modal, lab-attainment-report, ise-mse-report
- Only light-mode classes replaced; all `dark:` variant classes preserved unchanged
- Report table files (lab-attainment-report, ise-mse-report) use `bg-primary/40` for structural table headers replacing `bg-slate-400`
- Build verified: ✔ Compiled successfully

---

## PHASE 4: Fix the Icon System and Global Interaction Rules

### What you're doing
Standardizing on a single icon library (Tabler, as declared in `components.json`) and fixing overreaching global interaction styles.

### Why it matters
Two icon libraries with different stroke weights create subliminal visual inconsistency. The global `:active` scale-down on ALL buttons and anchor tags causes breadcrumbs, sidebar items, and text links to shrink on click — which feels fidgety and cheap.

### Files to change
- All component files importing from `lucide-react`
- `app/globals.css` — active state and transition rules

### Instructions

**Step 1: Create an icon mapping and replace Lucide with Tabler everywhere**

First, read every file that imports from `lucide-react` and build a full list of icons used. Then replace with Tabler equivalents. Common mappings:

| Lucide | Tabler Equivalent |
|---|---|
| `LayoutDashboard` | `IconLayoutDashboard` |
| `BookOpen` | `IconBook` |
| `ClipboardList` | `IconClipboardList` |
| `Users` | `IconUsers` |
| `Settings` | `IconSettings` |
| `Bell` | `IconBell` |
| `ChevronRight` | `IconChevronRight` |
| `ChevronDown` | `IconChevronDown` |
| `ChevronsUpDown` | `IconChevronsUpDown` |
| `LogOut` | `IconLogout` |
| `Loader2` | `IconLoader2` |
| `Trash2` | `IconTrash` |
| `Plus` | `IconPlus` |
| `LayoutGrid` | `IconLayoutGrid` |
| `BarChart3` | `IconChartBar` |
| `MoreVertical` | `IconDotsVertical` |
| `AlertTriangle` | `IconAlertTriangle` |
| `CheckCircle` | `IconCircleCheck` |
| `XCircle` | `IconCircleX` |
| `Info` | `IconInfoCircle` |
| `GraduationCap` | `IconSchool` |
| `Construction` | `IconTool` |
| `Home` | `IconHome` |
| `Search` | `IconSearch` |
| `Filter` | `IconFilter` |
| `Download` | `IconDownload` |
| `Upload` | `IconUpload` |
| `Eye` | `IconEye` |
| `EyeOff` | `IconEyeOff` |
| `Clock` | `IconClock` |
| `Calendar` | `IconCalendar` |
| `ArrowLeft` | `IconArrowLeft` |
| `ArrowRight` | `IconArrowRight` |

For any Lucide icon not in this list, find the closest Tabler equivalent by name. All Tabler icons are prefixed with `Icon`.

**Step 2: Set a consistent icon size convention**

After migration, apply these size rules everywhere:
- Sidebar navigation icons: `size={18}` 
- Card header icons: `size={16}`
- Button icons (with text): `size={16}`
- Icon-only buttons: `size={18}`
- Stat card accent icons: `size={20}`
- Empty state / coming soon icons: `size={40}`
- Error page icons: `size={48}`

Do NOT use Tailwind `h-4 w-4`, `h-5 w-5` etc. for Tabler icons — use the `size` prop directly for consistency.

**Step 3: Fix the overreaching active state in globals.css**

```css
/* BEFORE — applies to everything including breadcrumbs, text links */
button:active, a:active, [role="button"]:active {
  transform: scale(0.98);
}

/* AFTER — restrict to intentional interactive elements only */
button:not(.no-press):active,
[role="button"]:not(.no-press):active {
  transform: scale(0.98);
}

/* Explicitly exclude navigation and text links */
a:active {
  transform: none;
}
```

**Step 4: Add `.no-press` utility class**

```css
@layer utilities {
  .no-press:active {
    transform: none !important;
  }
}
```

Apply `.no-press` to: SidebarTrigger, sidebar nav items, breadcrumb links, dropdown menu triggers.

### Verification check
After this phase: grep for `from 'lucide-react'` across the codebase — zero results. All icons should be Tabler. Clicking a breadcrumb link should not cause any visible scale animation. Clicking a primary button should still show the press effect.

---

## PHASE 5: Fix Headers, Hover States, and Remove Dead Space

### What you're doing
Making the app shell consistent (one header style per portal), fixing inverted hover affordances, and removing the `min-h-[100vh]` dead space placeholders.

### Why it matters
The student portal jumps between `h-14` with border and `h-16` without border between pages — an 8px shift that breaks the illusion of a continuous shell. Stat cards with `hover-lift` falsely signal interactivity when they do nothing on click. The `min-h-[100vh]` empty placeholders make dashboards look unfinished.

### Files to change
- `student/assignments/layout.tsx` — standardize header
- `teacher/components/teacher-dashboard-content.tsx` — remove hover-lift from stat cards, fix placeholder
- `admin/components/admin-dashboard-content.tsx` — same
- `student/components/stat-card.tsx` — remove hover-lift if not interactive
- Any other file using `hover-lift` on non-interactive elements

### Instructions

**Step 1: Standardize headers**

Pick the **teacher/admin header style** (`h-16`, clean, no border) as the universal standard. Apply it to all student portal pages too. The cleaner, borderless header is more premium.

In `student/page.tsx` and all student sub-layouts, change:
```tsx
// Remove these from the header className:
// border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
// Change h-14 → h-16
```

**Step 2: Remove hover-lift from non-interactive stat cards**

In teacher, admin, and evaluations stat cards — remove `hover-lift` from the Card `className`. Stat cards that display information only should not simulate interactivity. Replace with no hover effect, or a very subtle background shift:

```tsx
// Before
<Card className="card-premium hover-lift">

// After (for non-interactive stat cards)
<Card className="card-premium">
```

Reserve `hover-lift` exclusively for cards that are genuinely clickable/navigable.

**Step 3: Replace min-h-[100vh] placeholder zones**

In `teacher-dashboard-content.tsx` and `admin-dashboard-content.tsx`, replace the massive viewport-height placeholder with a compact, dignified placeholder:

```tsx
// Replace the min-h-[100vh] div with:
<div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-8 text-center">
  <p className="text-label">More features coming soon</p>
  <p className="text-caption mt-1">This area will show recent activity and quick actions</p>
</div>
```

This is honest about the placeholder state without consuming the entire viewport.

**Step 4: Remove .toUpperCase() from assignment card titles**

In `student/assignments/page.tsx`, `pending/page.tsx`, and `submitted/page.tsx`:
```tsx
// Remove .toUpperCase() from title rendering
// Let natural casing stand — the typography does the emphasis work now
```

**Step 5: Fix the duplicate grid breakpoint**

In `allotted-subjects-list.tsx`, fix:
```tsx
// Before (broken — md overrides md)
className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-3"

// After
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
```

### Verification check
Navigate between all student portal pages — the header should be the same height and style on every page. Hovering over a stat card on the teacher dashboard should produce no lift effect. The dashboard pages should not have a massive empty scroll area below the stat cards.

---

## PHASE 6: Differentiate the Coming Soon Pages and Final Polish

### What you're doing
Breaking the identical template repetition across all placeholder/coming soon pages, standardizing breadcrumbs, fixing skeleton mismatches, and removing boilerplate.

### Why it matters
17+ pages with the exact same icon-in-circle + heading + paragraph layout is the single most visible AI artifact in the codebase. Error pages look identical to coming soon pages. This phase gives each placeholder page minimal but distinct character.

### Files to change
- All coming soon `page.tsx` files
- `error.tsx` and `not-found.tsx` across portals
- `skeletons.tsx`
- `nav-user.tsx` (avatar fallback)
- `app/globals.css` (scrollbar, breadcrumb)

### Instructions

**Step 1: Create three distinct coming soon layouts (not 17 identical ones)**

Create a `components/ui/coming-soon.tsx` component with three visual variants:

**Variant A — "Under Construction" (for feature pages like Analytics, Reports)**
Layout: Left-aligned, icon on left of text, horizontal layout. Feels like a roadmap item.
```tsx
// Horizontal layout: icon left, heading + description right
// Icon: outlined, no circle container
// Heading: text-section-title
// No centered everything — left-aligned feels more intentional
```

**Variant B — "Settings/Config" (for settings, notifications pages)**
Layout: Centered, minimal. Just a heading and a one-line description. No icon. Clean.
```tsx
// Just: heading + short description + optional back button
// No icon needed — settings pages don't need decoration
```

**Variant C — "Admin/System" (for admin portal pages)**
Layout: Compact card with a dashed border. Looks like a placeholder slot in a real admin panel.
```tsx
// Dashed border card, subdued background
// Label-sized text: "Admin feature — in development"
// Feels like a deliberate empty state, not a generated placeholder
```

Map the 17 pages to these variants based on context:
- Analytics, Reports, complex features → Variant A
- Settings, Notifications, Profile → Variant B  
- All Admin portal pages → Variant C

**Step 2: Differentiate error pages from coming soon pages**

`error.tsx` and `not-found.tsx` should feel like errors, not features-in-progress. Use:
- Stronger visual weight (larger icon, more prominent heading)
- A clear action button ("Go back", "Return to dashboard")
- No hammer/construction icon — use an appropriate error icon (IconAlertTriangle or IconCircleX for errors, IconSearch with a line through it for 404)

**Step 3: Fix avatar fallback**

In `nav-user.tsx`, replace the hardcoded `"CN"`:
```tsx
// Before
<AvatarFallback>CN</AvatarFallback>

// After — derive initials from user name
<AvatarFallback>
  {user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'}
</AvatarFallback>
```

**Step 4: Fix skeleton grid mismatches**

In `skeletons.tsx`, align skeleton column counts with actual content layouts:
- `StatsSkeleton`: If teacher/admin use 4 columns, render 4. If student uses 5 (including welcome card), match that — or render the welcome card shape + 3 stat card shapes.
- `CardsGridSkeleton`: Accept a `cols` prop and render accordingly instead of always 3 columns.

**Step 5: Standardize scrollbar**

In `globals.css`, replace the universal `!important` scrollbar with a scoped, non-intrusive version:
```css
/* Only apply to the sidebar scroll area, not globally */
.sidebar-scroll::-webkit-scrollbar { width: 4px; }
.sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
.sidebar-scroll::-webkit-scrollbar-thumb { 
  background: hsl(var(--border));
  border-radius: 4px;
}
/* Remove the universal * selector with !important */
```

**Step 6: Clean up boilerplate**

- Delete or archive `app-sidebar.tsx` if it's not actively used by any portal (verify first)
- Delete `nav-projects.tsx` and `team-switcher.tsx` if only used by boilerplate sidebar
- Remove boilerplate SVGs from `/public`: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`
- Fix `dashboard/page.tsx` — remove the "Building Your Application" breadcrumb and template placeholder rectangles

### Verification check
Navigate through all admin portal pages — each should have a visually distinct coming soon layout, not the same template. The error page should look obviously like an error, not a coming soon. The user avatar dropdown should show real initials, not "CN".

---

## AFTER ALL PHASES: Final Cross-Check

Once all 6 phases are complete, do a full pass through the app and verify:

1. **Shadow depth** — cards visibly float above the background. Hover state produces a perceptible elevation change.
2. **Typography** — you can distinguish page title / section title / card title / body / label / caption / metadata at a glance on any page.
3. **Color consistency** — the test modal, submit modal, and evaluations cards all feel like they're in the same app as the dashboards.
4. **Icons** — all icons are Tabler, consistent stroke, consistent sizing.
5. **Headers** — same height and style on every page across every portal.
6. **No false affordances** — hover over a non-interactive stat card. It should not lift.
7. **Placeholders** — no `min-h-[100vh]` empty zones. Dashboard pages end naturally.
8. **Coming soon variety** — navigate through 5 different coming soon pages. Each should look meaningfully different.
9. **Error pages** — they look like errors, not coming soon pages.
10. **Build** — `npm run build` passes with no errors or type warnings related to your changes.

---

## WHICH AGENT DOES WHAT

**Use the VSCode Agent (23-issue report) for:**
- Phases 1, 2, 3 — it had deeper visibility into `globals.css` and the token system
- Phase 5 — it specifically caught the `min-h-[100vh]` and the hover-lift issue with exact file references
- Phase 6 skeleton fixes — it identified the exact mismatch (4-col skeleton vs 5-col content)

**Use the Agentic IDE Agent (14-issue report) for:**
- Phase 4 icon migration — it identified the pattern of which files use which library very precisely
- Phase 6 boilerplate cleanup — it caught the leftover shadcn sample data and hardcoded "CN" avatar
- The Coming Soon page differentiation — it framed the root cause most clearly ("components built in isolation without a governing document")

Both agents already understand the codebase deeply. Pass them their respective phases with this document as context. They do not need to re-read the audit reports — they wrote them.

---

*This document is the governing design specification. Every change must trace back to a rule defined here. If a decision isn't covered by these phases, the rule is: does it serve the system, or is it a local judgment call? Local judgment calls are what created the original problem. When in doubt, do less.*

*After a fix is completed make sure to update this file such that the system as well as other developers understand what was the issue and what all things were done to fix it and that whether the issue was fixed or not*