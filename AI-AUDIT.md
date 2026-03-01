# AI Features Audit - TaskForge

## Date: 2026-03-01
## Auditor: Shikamaru (Research/QA Agent)

---

## Current AI Features

The AI Task Generator consists of:
- **API Route**: `src/app/api/ai/generate-tasks/route.ts`
- **Modal Component**: `src/components/ai/aigenerate-modal.tsx`
- **Preview Card**: `src/components/ai/task-preview-card.tsx`

---

## Issues Found

### 🔴 Critical Bugs

#### 1. URL Mode Doesn't Work
**Location**: `route.ts` + `aigenerate-modal.tsx`

**Problem**: When user selects URL input type, the modal sends the raw URL string to Gemini. Gemini cannot browse URLs - it can only process text/images it's directly given.

```typescript
// Current (broken) code in modal:
body: JSON.stringify({
  type: "url",
  content: url, // Raw URL like "https://example.com"
})
```

**Impact**: Users get irrelevant/invalid tasks or errors when using URL mode.

---

#### 2. Subtasks from AI Response Are Completely Ignored
**Location**: `aigenerate-modal.tsx`

**Problem**: The AI returns tasks with `subtasks: string[]` but the modal:
- Doesn't extract subtasks from AI response
- Doesn't display subtasks in preview cards
- Doesn't create subtasks when bulk-creating

```typescript
// Current code - missing subtasks:
const tasks: GeneratedTask[] = (data.tasks || []).map(
  (task: { title, description, priority }) => ({
    id: generateId(),
    title: task.title,
    description: task.description || "",
    priority: task.priority || "medium",
    // ❌ subtasks: task.subtasks - NOT USED!
  })
)
```

**Impact**: AI-generated subtasks are lost. Users must manually create them.

---

#### 3. Effort Field Is Ignored
**Location**: `task-preview-card.tsx` + bulk creation

**Problem**: AI returns `effort: string` (e.g., "1h", "2d") but:
- Preview card doesn't show effort input
- Bulk creation doesn't include effort field

**Impact**: Time estimates from AI are lost.

---

### 🟡 Medium Issues

#### 4. File Size Limits Inconsistent
**Location**: Both route.ts and modal

- Route: checks base64 string length (>2MB)
- Modal: checks `file.size` before reading

The 2MB limit is reasonable but could be clearer in UI.

---

#### 5. Error Handling Could Be Better
**Location**: `route.ts`

When AI returns invalid JSON, error is generic:
```typescript
return NextResponse.json(
  { error: "Failed to parse AI response" },
  { status: 500 }
);
```

Could extract more useful debug info for developers.

---

#### 6. No Streaming Feedback
**Location**: Modal

User clicks "Generate" and waits with spinner. For long AI generations, streaming would improve UX significantly.

---

## Improvements Implemented

### ✅ Fix 1: URL Mode - Fetch URL Content First
Added URL content fetching before sending to Gemini:
- Validate URL format
- Fetch content using web_fetch
- Send extracted content to Gemini

### ✅ Fix 2: Add Subtask Support
- Extended `GeneratedTask` interface to include `subtasks: string[]`
- Display subtasks in preview card (collapsible)
- Include subtasks in bulk creation as child tasks

### ✅ Fix 3: Add Effort Field
- Added effort input to preview card
- Include effort in bulk creation (as timeEstimate)

### ✅ Fix 4: Improved Prompt
Enhanced the prompt for better task generation with examples and clearer instructions.

---

## Testing Checklist

- [ ] URL mode extracts actual content and generates relevant tasks
- [ ] Subtasks appear in preview and are created as child tasks
- [ ] Effort field is editable and saved
- [ ] Error messages are clearer when AI fails
- [ ] File upload still works for images, PDFs, text files
- [ ] Text input still works correctly

---

## Recommendations for Future

1. **Streaming Support**: Add SSE for real-time token streaming
2. **AI Task Enhancement**: Add option to enhance existing tasks with AI
3. **Smart Priority**: AI-suggest priority based on content analysis
4. **Task Decomposition**: AI-powered breakdown of large tasks into subtasks
5. **Multi-language Support**: Detect and handle non-English content better
