# Site design & architecture documentation

Technical reference for **Emperium Forgeworks Store** — how the storefront, admin portal, and AWS backend fit together.

**Last updated:** 2026-05-28

---

## Documents

| Document | Contents |
|----------|----------|
| [architecture-overview.md](./architecture-overview.md) | System context, component diagram, request flows |
| [tech-stack.md](./tech-stack.md) | Languages, frameworks, AWS services, tooling |
| [data-models.md](./data-models.md) | DynamoDB models (Amplify Data), fields, authorization |
| [api-reference.md](./api-reference.md) | AppSync GraphQL, custom queries, frontend routes, service layer |
| [authentication-and-authorization.md](./authentication-and-authorization.md) | Cognito groups, auth modes, vault access |
| [frontend-structure.md](./frontend-structure.md) | Repo layout, pages, contexts, conventions |
| [deployment-and-environments.md](./deployment-and-environments.md) | CI/CD, env vars, URLs, backend deploy |
| [design-system.md](./design-system.md) | Obsidian Forge UI tokens and patterns |
| [integrations.md](./integrations.md) | GA4, payments, S3, planned work |

---

## Related docs

| Path | Topic |
|------|--------|
| [cursor-roadmap.md](../cursor-roadmap.md) | **Authoritative** — what to build, current status, milestone specs |
| [archive/](../archive/) | Historical plans (not used for development) |
| [docs/deploy-option-b.md](../../docs/deploy-option-b.md) | Fullstack Amplify deploy |
| [docs/storage-auth.md](../../docs/storage-auth.md) | S3 / IAM for product images |
| [docs/ga4-admin-dashboard.md](../../docs/ga4-admin-dashboard.md) | GA4 service account setup |

---

## Quick facts

| Item | Value |
|------|--------|
| Production | https://emperiumforgeworks.com |
| Stack | React 19 + Vite 6 + Amplify Gen 2 |
| API style | GraphQL (AppSync) via Amplify Data; no separate REST API |
| Default data auth | Cognito **identity pool** (IAM) for guests; **user pool** for signed-in users |
| Payments (today) | Mock checkout → `Order` in DynamoDB |
| Payments (planned) | Stripe + Google Pay (M3b) |
