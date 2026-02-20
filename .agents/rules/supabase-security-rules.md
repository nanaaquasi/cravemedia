---
trigger: always_on
---

---

description: Standards for Supabase data fetching and security
globs: src/\*_/_

---

# Supabase Security & Data Fetching

To prevent exposing database queries, schemas, and RLS policies to the client, all data fetching must be proxied through Next.js Server Components or Route Handlers.

## Rules

1. **No Client-Side Supabase Queries**
   - Do NOT use `supabase.from(...).select(...)` directly in Client Components (`"use client"`).
   - Client Components must fetch data via:
     - API Route Handlers (`/api/...`)
     - Server Actions
     - Passing data down from Server Components as props

2. **Server-Side Fetching**
   - Use `createClient` from `@/lib/supabase/server` in:
     - Server Components (`page.tsx`, `layout.tsx`)
     - Route Handlers (`route.ts`)
     - Server Actions (`actions.ts`)

3. **API Route Pattern**
   - Create dedicated endpoints for specific data needs (e.g., `/api/account/dashboard`).
   - Do not create generic "proxy" endpoints that accept arbitrary SQL/filters from the client.

## Example

### ❌ Bad (Client Component)

```tsx
"use client";
import { createClient } from "@/lib/supabase/client";

export function UserProfile() {
  const supabase = createClient();
  // Don't do this! Exposes query structure to client
  const { data } = await supabase.from("profiles").select("*");
}
```

### ✅ Good (API Route Proxy)

**src/app/api/profile/route.ts**

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*");
  return NextResponse.json(data);
}
```

**src/components/UserProfile.tsx**

```tsx
"use client";
export function UserProfile() {
  // Fetch from the API route instead
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetch("/api/profile").then((res) => res.json()),
  });
}
```
