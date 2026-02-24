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

### 🔴 Bottleneck 4: Missing Micro-Interactions & Form Lag
Large assignment creation forms managed by raw React state can cause input lag. Additionally, API triggers lack consistent feedback.

* **The Enterprise Fix:**
  * **Forms:** Ensure all complex forms are wrapped in `react-hook-form` + `@hookform/resolvers/zod` + shadcn `<Form>`. Do not rely on top-level `useState` for massive forms.
  * **Buttons:** Any button triggering an asynchronous action MUST have a visual loading state (spinner) and be `disabled` during execution.
  * **Toasts:** Refactor `sonner` usage to `toast.promise()` for long-running actions (like saving marks or generating PDFs) so users see a persistent "Loading..." toast that resolves to a "Success" checkmark.

---

## 🛠️ 3. Execution Workflow for AI Agents
When tasked with fixing one of the bottlenecks above, follow this strict protocol:

1. **Analyze:** Read the specific file and its direct dependencies.
2. **Isolate:** Do not attempt to fix all bottlenecks at once. If asked to fix `"use client"` pushdown, DO NOT simultaneously rewrite the data fetching. 
3. **Refactor & Retain:** When migrating to a new pattern (e.g., React Query), ensure the exact same TypeScript interfaces (like `Allotment`, `Task`, `StudentData`) are strictly retained.
4. **Clean up:** Remove unused imports or old `xlsx` dependencies once they are safely replaced.

*End of Guidelines.*