---
name: sparkfluence-brainstorm
description: "Brainstorm features and UI for Sparkfluence. Auto-invokes design skills (frontend-design + ui-ux-pro-max) when the task involves UI/frontend work. Project tokens are in CLAUDE.md (always loaded)."
---

# Sparkfluence Brainstorm — Design-Aware Creative Process

Wraps the brainstorming process with automatic design skill orchestration for Sparkfluence.

## When This Skill Activates

Use this skill when brainstorming ANY Sparkfluence feature that involves UI, components, pages, layouts, or visual work.

## Process

### Phase 1: Understand (from superpowers:brainstorming)

1. Check current project state (files, docs, recent commits)
2. Ask questions ONE at a time to refine the idea
3. Prefer multiple choice questions
4. Focus on: purpose, constraints, success criteria
5. Propose 2-3 approaches with trade-offs

### Phase 2: Design Intelligence (AUTO-TRIGGERED for UI work)

Once the idea is understood and involves UI/frontend, automatically run these steps:

**Step 2a — Run ui-ux-pro-max search** to get data-driven recommendations:

```bash
cd .claude/skills/ui-ux-pro-max/scripts && python search.py "<context keywords>" --design-system -p "Sparkfluence"
```

Extract: recommended style, typography, color palette, effects, anti-patterns to avoid.

**Step 2b — Apply frontend-design philosophy** (Anthropic official):
- What makes this component UNFORGETTABLE?
- What's the bold aesthetic direction? (Not generic, not "AI slop")
- Distinctive typography choice (NEVER default to Inter/Roboto)
- Intentional spatial composition (asymmetry, overlap, grid-breaking elements)
- Atmospheric backgrounds (gradient meshes, noise textures, grain overlays)

**Step 2c — Constrain with Sparkfluence Design System (from CLAUDE.md, always loaded):**
- All project tokens (colors, borders, layout, animation) are in CLAUDE.md
- Verify the design respects: emerald accent, dark-only, glassmorphism rules, 9:16 ratio
- If ui-ux-pro-max suggests colors/fonts that conflict with CLAUDE.md tokens, CLAUDE.md wins

### Phase 3: Present Design

- Break into 200-300 word sections
- Validate after each section
- Include: architecture, components, data flow, visual direction
- Show the ui-ux-pro-max search results that informed the design
- Highlight where the design diverges from generic AI output

### Phase 4: Document

- Write validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Include the design system recommendations from Phase 2
- Ask if ready for implementation

## Detection Rules

Auto-invoke Phase 2 (design skills) when the brainstorm involves ANY of:
- New page, screen, or route
- New component or UI element
- Visual redesign or styling changes
- Layout changes
- Dashboard, workspace, or panel work
- Animation or motion design
- Theme or color system changes

Skip Phase 2 (design skills) when the brainstorm is purely:
- Backend/API logic
- Database schema
- Edge Function behavior
- Business logic without UI impact

## Key Principles

- **One question at a time** — Don't overwhelm
- **YAGNI ruthlessly** — Remove unnecessary features
- **Data-driven aesthetics** — Use ui-ux-pro-max search, not gut feeling
- **Anti-generic** — Apply frontend-design philosophy to every visual decision
- **Project-constrained** — All output must respect CLAUDE.md design tokens
