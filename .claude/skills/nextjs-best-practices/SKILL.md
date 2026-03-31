---
name: nextjs-best-practices
description: "Use when building with Next.js — routing, data fetching, caching, server/client components, and performance. Enhances Nyx on Next.js projects."
risk: safe
source: adapted from Antigravity nextjs skill
date_added: 2026-03-31
persona: nyx
---

# Next.js Best Practices

> Server vs Client components, data fetching patterns, caching, file conventions.
> Activated automatically when Nyx boots on Next.js projects.

---

## 1. Server vs Client Components

### Decision Tree
```
Does it need browser APIs (window, localStorage, IntersectionObserver)?  → 'use client'
Does it need event handlers (onClick, onChange, onSubmit)?              → 'use client'
Does it need React hooks (useState, useEffect, useRef)?                → 'use client'
Does it need real-time updates (WebSocket, SSE)?                       → 'use client'
Everything else?                                                        → Server Component (default)
```

### Rules
- **Default to Server Components.** Only add `'use client'` when you must.
- Push `'use client'` as far down the tree as possible. Wrap only the interactive part, not the whole page.
- Server Components can import Client Components. Client Components **cannot** import Server Components (but can accept them as `children` props).
- **Never** put `'use client'` on a layout unless the entire layout needs interactivity.

### Data Passing
- Server → Client: pass data as props (serializable only — no functions, no classes)
- Client → Server: use Server Actions (`'use server'`) or API routes
- **Never** fetch data in Client Components if a Server Component parent could fetch and pass it down

---

## 2. Data Fetching

### Patterns
| Pattern | When | How |
|---------|------|-----|
| **Static** | Content that rarely changes | `fetch()` in Server Component (cached by default) |
| **ISR** | Content that changes periodically | `fetch(url, { next: { revalidate: 3600 } })` |
| **Dynamic** | User-specific or real-time data | `fetch(url, { cache: 'no-store' })` or `export const dynamic = 'force-dynamic'` |
| **Server Action** | Mutations (form submits, writes) | `'use server'` async function |

### Rules
- **Fetch in Server Components**, not Client Components. Fetch at the layout/page level and pass down.
- Use `Promise.all()` for parallel fetches that don't depend on each other.
- Handle errors with `error.tsx` boundaries, not try/catch in every component.
- Use `loading.tsx` for streaming/suspense boundaries.

### Server Actions
- Mark with `'use server'` at the top of the function or file
- Always validate input (never trust client data)
- Use `revalidatePath()` or `revalidateTag()` after mutations
- Return structured results, not redirect — let the client handle navigation

---

## 3. Routing & File Conventions

### App Router Files
| File | Purpose |
|------|---------|
| `page.tsx` | Route UI (required to make a route accessible) |
| `layout.tsx` | Shared layout (wraps children, persists across navigations) |
| `loading.tsx` | Loading UI (Suspense boundary) |
| `error.tsx` | Error UI (Error boundary — must be `'use client'`) |
| `not-found.tsx` | 404 UI |
| `template.tsx` | Like layout but re-mounts on navigation (rare) |
| `route.ts` | API endpoint (GET, POST, PUT, DELETE handlers) |

### Route Groups & Parallel Routes
- Use `(group)` folders to organize without affecting URL: `(marketing)/about/page.tsx` → `/about`
- Use `@slot` for parallel routes (dashboards with independent loading states)
- Use `[param]` for dynamic segments, `[...slug]` for catch-all
- Use `(.)` intercepting routes for modals that are also pages

### Middleware
- Use `middleware.ts` at the project root for auth checks, redirects, locale detection
- Keep middleware fast — it runs on every request
- Use `matcher` config to limit which routes trigger middleware
- **Never** do heavy computation or database queries in middleware

---

## 4. Caching Strategy

### Cache Layers
| Layer | What | Default | Override |
|-------|------|---------|----------|
| **Request memoization** | Same `fetch()` URL in one render | Automatic | Can't disable |
| **Data cache** | `fetch()` results across requests | Cached | `{ cache: 'no-store' }` or `revalidate: N` |
| **Full Route Cache** | Pre-rendered HTML + RSC payload | Static routes cached | `dynamic = 'force-dynamic'` |
| **Router Cache** | Client-side cache of visited routes | 30s (dynamic), 5min (static) | `router.refresh()` |

### Rules
- **Understand what's cached by default.** `fetch()` in Server Components caches by default.
- Use `revalidateTag()` for targeted revalidation (tag fetches, invalidate by tag)
- For authenticated pages, opt out of Full Route Cache: `export const dynamic = 'force-dynamic'`
- **Never** cache user-specific data in the shared cache (data leaks between users)
- Use `unstable_cache()` for caching non-fetch operations (database queries, computations)

---

## 5. Performance

### Image Optimization
- **Always** use `next/image` instead of `<img>` — automatic optimization, lazy loading, blur placeholder
- Set `width` and `height` (or `fill`) to prevent layout shift
- Use `priority` on above-the-fold images (LCP optimization)
- Use `sizes` prop for responsive images

### Font Optimization
- Use `next/font` for automatic font optimization (self-hosted, no CLS)
- Load fonts at the layout level, not per-component
- Use `display: 'swap'` for visible text during font load

### Bundle Size
- Use dynamic imports for heavy components: `const Chart = dynamic(() => import('./Chart'))`
- Use `React.lazy` + `Suspense` for client-side code splitting
- Analyze bundle: `ANALYZE=true next build` with `@next/bundle-analyzer`
- Move large dependencies to Server Components where possible (not shipped to client)

### Core Web Vitals
- **LCP**: Prioritize hero image, preload critical resources, use streaming
- **FID/INP**: Minimize JavaScript on initial load, use Server Components
- **CLS**: Set dimensions on images/videos, use `next/font`, avoid dynamic content above fold

---

## 6. Anti-Patterns

| Don't | Do Instead | Why |
|-------|-----------|-----|
| `'use client'` on every component | Default to Server Components | Ships less JS, faster page loads |
| Fetch in Client Components | Fetch in Server Components, pass as props | Avoids waterfalls, leverages caching |
| `useEffect` for data fetching | Server Component fetch or React Query | No loading flash, better SEO |
| Inline styles for layout | Tailwind utility classes or CSS modules | Consistent, cacheable, maintainable |
| `getServerSideProps` (Pages Router) | App Router with `dynamic = 'force-dynamic'` | Pages Router is legacy |
| Manual API routes for mutations | Server Actions | Type-safe, progressive enhancement |
| `fetch('/api/...')` from Server Components | Direct database/service calls | Server Components can access backends directly |
| Large `layout.tsx` with `'use client'` | Split interactive parts into Client Components | Layouts should be Server Components |

---

## 7. Deployment

### Environment Variables
- `NEXT_PUBLIC_*` — exposed to browser (use for public API URLs, feature flags)
- All others — server-only (use for secrets, database URLs)
- **Never** put secrets in `NEXT_PUBLIC_*` variables
- Use `.env.local` for development, environment variables in deployment platform for production

### Build Optimization
- Use `output: 'standalone'` for Docker deployments (minimal output)
- Enable `experimental.optimizePackageImports` for large icon/utility libraries
- Configure `images.remotePatterns` for external image sources
- Use ISR for pages that can be pre-rendered with periodic updates

---

## When This Skill Activates

- Nyx boots on a project with Next.js in the stack
- Any agent creates or modifies files in a Next.js app directory
- Build Triad reviews a Next.js surface
- Scaffold generates Next.js page/layout/component boilerplate
