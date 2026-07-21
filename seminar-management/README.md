# seminar-management (app)

Next.js application for the Seminar Management System. All project
documentation — setup, architecture, API reference, design decisions and
limitations — lives in the repository root [README](../README.md).

Useful scripts (run from this directory):

```bash
npm run dev         # dev server on :3000 (expects Postgres on :5433, see ../docker-compose.yml)
npm run db:migrate  # prisma migrate dev
npm run db:seed     # idempotent demo data
npm run lint        # eslint
npx tsc --noEmit    # typecheck
```
