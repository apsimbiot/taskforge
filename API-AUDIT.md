# API Audit Results

**Date:** 2026-03-01
**App:** TaskForge (Next.js 15)
**Base URL:** http://localhost:3000

---

## Working ✅

| Endpoint | Status | Response |
|----------|--------|----------|
| `GET /api/health` | 200 OK | `{"status":"ok","timestamp":"2026-03-01T02:38:58.256Z","version":"0.1.0"}` |
| `POST /api/auth/register` | 201 Created | Creates new user + workspace successfully |

---

## Blocked by Auth (Expected) 🔒

These endpoints require authentication and correctly return 401 Unauthorized:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/workspaces` | 401 | NextAuth JWT session required |
| `GET /api/workspaces/[id]` | 401 | NextAuth JWT session required |
| `GET /api/workspaces/[id]/dashboard` | 401 | NextAuth JWT session required |
| `POST /api/spaces` | 401 | NextAuth JWT session required |
| `GET /api/spaces/[id]` | 401 | NextAuth JWT session required |
| `GET /api/lists` | 401 | NextAuth JWT session required |
| `GET /api/lists/[id]` | 401 | NextAuth JWT session required |
| `GET /api/tasks` | 401 | NextAuth JWT session required |
| `GET /api/tasks/[id]` | 401 | NextAuth JWT session required |
| `GET /api/tasks/[id]/comments` | 401 | NextAuth JWT session required |
| `GET /api/tasks/[id]/assignees` | 401 | NextAuth JWT session required |
| `GET /api/tasks/[id]/labels` | 401 | NextAuth JWT session required |
| `GET /api/tasks/[id]/time-entries` | 401 | NextAuth JWT session required |
| `GET /api/search?q=test` | 401 | NextAuth JWT session required |
| `GET /api/sprints` | 401 | NextAuth JWT session required |
| `GET /api/forms` | 401 | NextAuth JWT session required |
| `GET /api/documents` | 401 | NextAuth JWT session required |
| `GET /api/notifications` | 401 | NextAuth JWT session required |

---

## Issues Found ❌

### 1. Login Flow Broken (Critical)
- **Issue:** Cannot authenticate via API using NextAuth credentials provider
- **Root Cause:** CSRF token mismatch when using `/api/auth/signin/credentials` endpoint
- **Error:** Redirects to `/login?error=MissingCSRF` when attempting POST
- **Test user:** testorg@example.com (already exists)
- **New user created:** newuser@test.com (via register API)

### 2. Test Data Assumptions
- Cannot verify CRUD operations without working auth session
- Would need working login to test:
  - List/Task creation, updates, deletion
  - Dashboard data
  - Comments, assignees, labels, time-entries

---

## Endpoints Verified to Exist 📁

All expected API routes exist in `src/app/api/`:

- `health/route.ts`
- `auth/register/route.ts`
- `workspaces/route.ts`, `workspaces/[id]/route.ts`, `workspaces/[id]/dashboard/route.ts`
- `spaces/[id]/route.ts`
- `lists/[id]/route.ts`
- `tasks/[id]/route.ts`, `tasks/[id]/comments/route.ts`, `tasks/[id]/assignees/route.ts`, `tasks/[id]/labels/route.ts`, `tasks/[id]/time-entries/route.ts`, `tasks/[id]/subtasks/route.ts`, `tasks/[id]/attachments/route.ts`, `tasks/[id]/dependencies/route.ts`
- `search/route.ts`
- `sprints/route.ts`, `sprints/[id]/route.ts`, `sprints/[sprintId]/route.ts`
- `forms/[slug]/route.ts`
- `documents/[id]/route.ts`
- `notifications/route.ts`
- `upload/route.ts`
- `sse/route.ts`

---

## Summary

- **Health check:** Working ✅
- **Registration:** Working ✅
- **All protected endpoints:** Require auth (correct behavior) 🔒
- **Auth flow:** Broken - cannot obtain session via API ❌
- **Recommendation:** Fix NextAuth credentials provider CSRF handling for API-based authentication
