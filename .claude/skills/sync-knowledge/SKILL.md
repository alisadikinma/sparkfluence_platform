---
name: sync-knowledge
description: Sync frontend knowledge mirrors with backend source files
disable-model-invocation: true
---

# Sync Knowledge Files

Synchronize frontend knowledge mirrors (`src/lib/knowledge/`) with their backend source files (`supabase/functions/_shared/knowledge/`).

## Usage

```
/sync-knowledge
```

## Context

The Sparkfluence project maintains **frontend mirrors** of backend knowledge files for client-side use:

| Backend Source | Frontend Mirror |
|---------------|-----------------|
| `supabase/functions/_shared/knowledge/12-scoring-engine.ts` | `src/lib/knowledge/12-scoring-engine.ts` |
| `supabase/functions/_shared/knowledge/13-emotion-lexicon.ts` | `src/lib/knowledge/13-emotion-lexicon.ts` |

These must stay in sync. When the backend source is updated, the frontend mirror must be updated to match.

## Workflow

1. **Diff each pair**: Compare backend source vs frontend mirror for each knowledge file listed above
2. **Report differences**: Show a summary of what changed (added/removed/modified exports, line count changes)
3. **If identical**: Report "All mirrors are in sync" and stop
4. **If different**: Show the diff for each changed file and ask:
   - "Copy backend → frontend?" (default, most common)
   - "Copy frontend → backend?" (if frontend was edited directly)
   - "Skip this file"
5. **Apply changes**: Copy the chosen source to the destination
6. **Verify**: Read both files and confirm they match

## Rules

- NEVER modify the backend source files without explicit user confirmation
- The frontend mirrors may have minor import path adjustments — preserve those if present
- If a new knowledge file exists in backend but has no frontend mirror, ask if one should be created
- After sync, remind the user to test the frontend to ensure no import errors

## Adding New Mirror Pairs

If new knowledge files are added to `supabase/functions/_shared/knowledge/` that need client-side use, add them to the table above and to `src/lib/knowledge/`.
