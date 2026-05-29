# Project Plans

This directory contains all planning and architectural documentation for **Emperium Forgeworks**.

## Authoritative Spec (AI Development)
- **cursor-roadmap.md**  
  This is the *single source of truth* for AI-driven development.  
  Cursor should follow this file for:
  - Architecture rules  
  - Milestone definitions  
  - File placement  
  - Allowed refactors  
  - API and data model expectations  

All feature work should reference this roadmap first.

---

## Reference Documentation (Human + AI Context)
These documents provide architectural, technical, and design context.  
Cursor may read these for understanding, but **must not treat them as directives**.

- `reference/architecture-overview.md`
- `reference/tech-stack.md`
- `reference/data-models.md`
- `reference/api-reference.md`
- `reference/authentication-and-authorization.md`
- `reference/frontend-structure.md`
- `reference/design-system.md`
- `reference/integrations.md`
- `reference/deployment-and-environments.md`

These files describe how the system works today.

---

## Archive (Historical Plans — Cursor Should Ignore)
These documents represent earlier planning phases and are preserved for historical context only.

Cursor should **not** use these for implementation guidance.

- `archive/milestones.md`
- `archive/progress.md`
- `archive/project-context.md`
- `archive/completed.md`
- Any other legacy planning docs

---

## Workflow Summary

1. **cursor-roadmap.md** defines what to build.  
2. **reference/** explains how the system works.  
3. **archive/** preserves history but is not used for development.

This structure ensures:
- Deterministic AI behavior  
- Clean architecture evolution  
- Zero confusion between old and new plans  
