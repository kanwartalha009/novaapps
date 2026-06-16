# App: web (Next.js · Vercel · :3000)

Marketing + public catalog + agency signup funnel.

## Routes
```
/                 landing
/apps             public app catalog (published apps, no credentials)
/apps/[slug]      app detail
/for-agencies     agency program pitch + commission explainer
/signup           agency signup → POST /v1/agencies/signup → "pending approval" state
/login            redirects to agency/admin login by audience
```

- Mostly static (SSG/ISR); catalog revalidates from `GET /v1/catalog/apps`.
- No authenticated areas. No direct DB access (I-2).
