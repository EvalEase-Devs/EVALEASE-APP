# EVALEASE: Frontend Architecture & AI Agent Guidelines

## 🤖 AI AGENT DIRECTIVE
**Read this section carefully before modifying any code.**
This document outlines the frontend architecture, UX standards, and ongoing optimization roadmap for the Evalease application. 
* **DO NOT** deviate from the established tech stack.
* **DO NOT** rewrite working features from scratch unless specifically instructed.
* **DO NOT** apply global styling changes that conflict with the established enterprise UI.
* **ALWAYS** make atomic, step-by-step changes. Verify functionality before moving to the next task.
* **CONTINUOUS UPDATE:** If you implement a new architectural pattern or complete a task from the Roadmap below, update this document to reflect the new state of the codebase.

---

## 🏗️ 1. Current Tech Stack & Enterprise Standards
Evalease is built on a bleeding-edge, tier-one enterprise foundation. Future code generation must strictly adhere to these libraries:
* **Framework:** Next.js 16 (App Router)
* **Core React:** React 19
* **Styling:** Tailwind CSS v4 + shadcn/ui
* **Animations:** `framer-motion` (utilizing custom wrappers like `fade-in.tsx` and `scale-in.tsx`)
* **State & Data:** TanStack Query v5 (React Query) — all data fetching via `useQuery`/`useMutation` in `use-api.ts`
* **Export Engine:** `exceljs` (Client-side Blob generation)

### 🎨 UI/UX Non-Negotiables (Do Not Alter)
* **Typography:** The app uses a specific, premium font stack: *Plus Jakarta Sans* (UI), *Space Grotesk* (Headings), and *Lora* (Serifs/Reports). Do not change these font variables.
* **Accessibility:** Always use `shadcn/ui` Radix primitives (`Dialog`, `Sheet`, `Popover`). Do not build custom floating UIs from scratch that lack ARIA attributes or keyboard navigation.
* **Colors:** Stick strictly to light, print-friendly pastels for data tables and standard UI backgrounds. Avoid dark, saturated colors for teacher-facing components.

---

## 🚀 2. Active Optimization Roadmap
The following architectural bottlenecks have been identified. AI Agents are authorized to refactor the codebase to resolve these issues, adhering strictly to the "Enterprise Fix" patterns.

### ✅ Bottleneck 5: Route Transition Freezes — RESOLVED
~~Navigation between major routes (e.g., clicking sidebar links to go from Dashboard to Analytics) causes a 2-3 second UI freeze where the sidebar highlight refuses to update.~~

* **Status: COMPLETE** (2026-02-25)
* **What was done:**
  * **Added `loading.tsx` boundaries** in 6 route folders: `teacher/`, `teacher/assignments/`, `teacher/evaluations/`, `student/`, `admin/`, `dashboard/`. Each file renders purpose-built skeleton layouts using the centralised `StatsSkeleton`, `CardsGridSkeleton`, `TableSkeleton`, and `ContentSkeleton` components from `src/components/skeletons.tsx`. Next.js now instantly transitions the URL and streams the skeleton while server components resolve.
  * **Migrated all `<a href>` to `<Link href>`** across 5 navigation components: `nav-main.tsx` (2 instances — top-level items and sub-items), `app-sidebar-teacher.tsx`, `app-sidebar-student.tsx`, `app-sidebar-admin.tsx`, `nav-projects.tsx`. This enables Next.js client-side navigation with background pre-fetching, eliminating full-page reloads.
  * **Verified "dumb" Server Components:** All `page.tsx` files in `teacher/`, `teacher/evaluations/`, `teacher/assignments/create/`, `student/`, and `admin/` are confirmed lightweight — they only run `await auth()` / `await cookies()` and immediately render client content components. No heavy data fetching blocks the server render.

### ✅ Bottleneck 1: The `"use client"` Anti-Pattern in Pages — RESOLVED
~~Currently, top-level page components have `"use client"` at the top of the file. This forces the entire layout, sidebar, and breadcrumbs to render on the client, bloating the JavaScript bundle.~~

* **Status: COMPLETE** (2026-02-24)
* **What was done:**
  * Removed `"use client"` from **7 page files** and **1 layout file**: `teacher/page.tsx`, `teacher/assignments/create/page.tsx`, `teacher/evaluations/page.tsx`, `student/page.tsx`, `student/assignments/layout.tsx`, `admin/page.tsx`, `login/page.tsx`.
  * Converted all page shells (sidebar, header, breadcrumbs) into **Server Components** using `await auth()` for server-side session fetching.
  * Pushed `"use client"` down to dedicated content components: `TeacherDashboardContent`, `EvaluationsContent`, `StudentDashboardContent`, `AdminDashboardContent`, `LoginContent`, and the pre-existing `CreateAssignmentContent`.
  * The 3 student assignment child pages (`page.tsx`, `pending/page.tsx`, `submitted/page.tsx`) correctly retain `"use client"` since they are pure interactive content rendered inside the server-side `student/assignments/layout.tsx`.
  * Removed the `mounted` state/`useEffect` hack from `student/assignments/layout.tsx` — no longer needed since the layout is now a proper Server Component.

### ✅ Bottleneck 2: Raw `useEffect` Fetching in `use-api.ts` — RESOLVED
~~The custom hooks currently rely on raw `useState` and `useEffect` with native `fetch()`. This causes redundant network requests (no caching), UI loading spinners on every navigation, and waterfall rendering.~~

* **Status: COMPLETE** (2026-02-24)
* **What was done:**
  * Installed `@tanstack/react-query` v5 and created `QueryProvider` at `src/components/providers/query-provider.tsx` (SSR-safe singleton pattern from TanStack docs).
  * Wired `QueryProvider` into the root `app/layout.tsx` wrapping `AuthProvider`.
  * Rewrote **all 12 hooks** in `src/hooks/use-api.ts` using `useQuery` / `useMutation` / `useQueryClient`:
    * `useAllotments`, `useTasks`, `useStudents`, `useMarks`, `useStudentTasks`, `useStudentTask`, `useExperiments`, `useExperimentLOs`, `useStudentAssignments`, `useSubmitAssignmentMarks`, `useBatchMarksReport`.
  * Created a centralised `queryKeys` factory for predictable cache invalidation.
  * Added **optimistic updates** to `useMarks.saveMarks` — marks are reflected in the UI instantly and rolled back on server error.
  * Mutations in `useSubmitAssignmentMarks` and `useStudentTask.submitMCQ` automatically invalidate `student-assignments` queries, keeping lists fresh without manual `refetch()`.
  * All TypeScript interfaces (`Allotment`, `Task`, `Student`, `MarksEntry`, `StudentAssignment`, etc.) are **unchanged** — zero breaking type changes.
  * All 12 consumer components required **zero code changes** — the hook return signatures (`{ data, loading, error, refetch, ... }`) are backward-compatible.
  * Default `staleTime: 60s` means navigating between Dashboard ↔ Assignments ↔ Evaluations uses cached data instantly (no spinners).
  * Default `gcTime: 5min` keeps unused cache warm for quick back-navigation.

### ✅ Bottleneck 3: UI Thread Blocking on Excel Generation (RESOLVED)
The `exceljs` generation scripts (`generate-ise-mse-excel.ts` and `generate-lab-excel.ts`) now run in a **Web Worker**, keeping the main UI thread at 60 fps.

* **What changed:**
  * Both generators (`generateISEMSEExcelBuffer`, `generateLabAttainmentExcelBuffer`) now return `ArrayBuffer` instead of triggering a DOM download — making them worker-safe (no `document` dependency).
  * `excel-worker.ts` — Web Worker entry point. Receives `{ type, reportData, logoBase64 }`, calls the appropriate generator, and transfers the finished buffer back via `postMessage` (zero-copy `Transferable`).
  * `excel-worker-client.ts` — Main-thread helper. Pre-fetches the logo as base64 (cached), spins up the worker, posts the payload, receives the buffer, and triggers the browser download. Gracefully falls back to main-thread generation if `Worker` is unavailable.
  * Consumer components (`ise-mse-report.tsx`, `lab-attainment-report.tsx`) now call `exportISEMSEViaWorker()` / `exportLabViaWorker()` instead of the direct generators.
  * Removed stale `import * as XLSX from 'xlsx'` in `lab-attainment-report.tsx`.
  * Removed unused `import { SUBJECT_TARGETS }` from `generate-ise-mse-excel.ts`.

### ✅ Bottleneck 4: Missing Micro-Interactions & Form Lag — RESOLVED
Large assignment creation forms managed by raw React state can cause input lag. Additionally, API triggers lack consistent feedback.

* **The Enterprise Fix:**
  * **Forms:** Ensure all complex forms are wrapped in `react-hook-form` + `@hookform/resolvers/zod` + shadcn `<Form>`. Do not rely on top-level `useState` for massive forms.
  * **Buttons:** Any button triggering an asynchronous action MUST have a visual loading state (spinner) and be `disabled` during execution.
  * **Toasts:** Refactor `sonner` usage to `toast.promise()` for long-running actions (like saving marks or generating PDFs) so users see a persistent "Loading..." toast that resolves to a "Success" checkmark.

* **Changes Made:**
  * **Forms:** Migrated `task-modal.tsx` from 15 `useState` calls + manual `validateForm()` to `react-hook-form` + `zod` (`taskModalSchema` in `task-schema.ts`). Uses `useForm`, `register()`, `setValue()`, `watch()`, `reset()`, and `formState.errors` for zero-lag input handling and declarative validation.
  * **Buttons:** Added `disabled` + loading text to async buttons: `addingTask` on "Add Task" button, `deletingTaskId` on task delete button (prop-drilled to `TasksListModal`), `removingId` on un-allot button (prop-drilled from `create-assignment-content.tsx` to `AllottedSubjectsList`).
  * **Toasts:** Migrated all 9 toast patterns across 8 files to `toast.promise()`: `allotted-subjects-list.tsx` (add task, delete task), `create-assignment-content.tsx` (add/remove allotment), `tasks-list-modal.tsx` (save marks), `batch-marks-report-modal.tsx` (save marks), `ise-mse-report.tsx` (export Excel), `lab-attainment-report.tsx` (export Excel), `student-test-modal.tsx` (submit test), `student/assignments/pending/page.tsx` (submit marks), `student/assignments/page.tsx` (submit marks).
  * Installed `react-hook-form@7.71.2` and `@hookform/resolvers@5.2.2`.

### ✅ Bottleneck 6: Ungraceful 404 & Empty States — RESOLVED
~~Hitting a route that doesn't exist (or isn't built yet, like `/teacher/analytics` or `/teacher/notifications`) currently drops the user into the raw Next.js 404 page, destroying the app shell and breaking immersion.~~

* **Status: COMPLETE** (2026-02-25)
* **What was done:**
  * **Full sidebar URL audit** across `app-sidebar-teacher.tsx`, `app-sidebar-student.tsx`, `app-sidebar-admin.tsx`, and `nav-user.tsx`. Identified **15 dead links** (routes referenced in the UI with no corresponding `page.tsx`).
  * **Scaffolded 15 "Coming Soon" pages** — each preserves the full sidebar/header shell with breadcrumbs, a feature-specific icon with a hammer badge, and a contextual description:
    * **Teacher (2):** `notifications/`, `settings/` — fragment pattern (renders inside shared `teacher/layout.tsx`).
    * **Student (2):** `notifications/`, `settings/` — full shell pattern (`SidebarProvider` + `AppSidebarStudent` + `SidebarInset`).
    * **Admin (11):** `users/`, `users/all/`, `users/teachers/`, `users/students/`, `users/add/`, `system/`, `system/overview/`, `system/logs/`, `system/backups/`, `analytics/`, `notifications/`, `settings/` — full shell pattern.
  * **Portal-aware 404:** `src/app/teacher/not-found.tsx` catches invalid URLs within `/teacher/*` while preserving the sidebar and providing a "Back to Dashboard" button.
  * **Zero dead links remain** — every sidebar URL now resolves to a valid page.

### ✅ Bottleneck 7: Missing Shared Layouts (DOM Thrashing) — RESOLVED
~~When global navigation elements (like `SidebarProvider` and `AppSidebar`) are hardcoded into individual `page.tsx` files, Next.js destroys and re-renders the entire DOM tree on every route change, causing severe performance degradation and loss of UI state.~~

* **Status: COMPLETE** (2026-02-25)
* **What was done:**
  * **Created `src/app/student/layout.tsx`** — shared layout for all student pages. Uses `cookies()` + `auth()`, wraps children in `SidebarProvider > AppSidebarStudent > SidebarInset`. Modelled after the existing `teacher/layout.tsx`.
  * **Created `src/app/admin/layout.tsx`** — shared layout for all admin pages. Same pattern with `AppSidebarAdmin`.
  * **Stripped 4 student files** of duplicate sidebar shell:
    * `student/page.tsx` — now a lightweight server component with `auth()` only for `firstName` derivation, renders fragment with header + `StudentDashboardContent`.
    * `student/assignments/layout.tsx` — removed `SidebarProvider`/`AppSidebarStudent`/`SidebarInset`, now renders fragment with header + content wrapper.
    * `student/notifications/page.tsx` — stripped to stateless fragment.
    * `student/settings/page.tsx` — stripped to stateless fragment.
  * **Stripped 12 admin files** of duplicate sidebar shell:
    * `admin/page.tsx` — now renders fragment with header + `AdminDashboardContent`.
    * 11 Coming Soon pages (`analytics/`, `notifications/`, `settings/`, `users/`, `users/all/`, `users/teachers/`, `users/students/`, `users/add/`, `system/`, `system/overview/`, `system/logs/`, `system/backups/`) — all stripped to stateless fragments.
  * **All 3 portals now follow the same pattern:** `layout.tsx` owns `SidebarProvider` + sidebar + `SidebarInset`; child `page.tsx` files render only headers and content as fragments.
  * **Zero compile errors** confirmed after all changes.
---

## 🛠️ 3. Execution Workflow for AI Agents
When tasked with fixing one of the bottlenecks above, follow this strict protocol:

1. **Analyze:** Read the specific file and its direct dependencies.
2. **Isolate:** Do not attempt to fix all bottlenecks at once. If asked to fix `"use client"` pushdown, DO NOT simultaneously rewrite the data fetching. 
3. **Refactor & Retain:** When migrating to a new pattern (e.g., React Query), ensure the exact same TypeScript interfaces (like `Allotment`, `Task`, `StudentData`) are strictly retained.
4. **Clean up:** Remove unused imports or old `xlsx` dependencies once they are safely replaced.