# ⚙️ FrenchLearno — Supabase Setup Guide

---

## 1. 📌 Overview

This guide explains how to:

- Create Supabase projects
- Configure authentication
- Set up database schema
- Manage staging and production environments

---

## 2. 🏗️ Create Supabase Projects

You need **two projects**:

### 2.1 Staging (Development)

- Used for testing
- Safe to experiment

### 2.2 Production

- Used for live users
- Must remain stable

---

### ✅ Steps

1. Go to: https://supabase.com
2. Click **New Project**
3. Fill:
   - Name: `frenchlearno-staging`
   - Database Password: (save it safely)

4. Create project

👉 Repeat for:

- `frenchlearno-production`

---

## 3. 🔑 Get API Keys

For each project:

Go to:
**Settings → API**

Copy:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 4. ⚙️ Environment Setup (Next.js)

### `.env.local` (Staging)

```env
NEXT_PUBLIC_SUPABASE_URL=your_staging_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_key
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_key
```

---

### Production (Vercel / Hosting)

Set same keys using **production project values**

---

## ⚠️ Important

- NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in frontend
- Use it only in server/API

---

## 5. 🔐 Setup Authentication

Go to:
**Authentication → Providers**

### Enable:

- ✅ Email/Password

---

### Optional (later)

- Google login
- OTP login

---

## 6. 🧾 Create Database Tables

Go to:
**SQL Editor → New Query**

---

### ⚠️ Best Practice

👉 Run scripts **step-by-step**, not all at once

---

### Step 1: Create `profiles` table

Paste:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  name text not null,
  username text unique not null,
  email text unique not null,

  phone text,
  class text,

  role text not null default 'student' check (role in ('student', 'admin')),

  created_at timestamptz default now()
);
```

Click **Run**

---

### Step 2: Create other tables

Run one-by-one:

- courses
- quizzes
- quiz_questions
- quiz_answers
- quiz_attempts
- user_progress
- subscriptions
- showcase_content

---

## 7. 🔐 Enable Row Level Security (RLS)

For each table:

Go to:
**Table → Enable RLS**

---

### Example Policy (Basic)

Allow authenticated users:

```sql
create policy "Allow logged in users"
on public.profiles
for select
using (auth.uid() = id);
```

---

### Admin-only example:

```sql
create policy "Admins only"
on public.courses
for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
```

---

## 8. 🔄 Staging → Production Workflow

### Step 1

Work in **staging project**

---

### Step 2

Test everything:

- signup
- login
- quiz flow

---

### Step 3

Apply same schema to production:

- copy SQL
- OR use migrations (recommended later)

---

### Step 4

Switch environment variables

---

## 9. 🧪 Testing Checklist

Before production:

- [ ] User signup works
- [ ] Username uniqueness works
- [ ] Admin login works
- [ ] Quiz creation works
- [ ] Quiz attempt works
- [ ] CMS content loads

---

## 10. 🚨 Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] Service role key not exposed
- [ ] RLS enabled
- [ ] Admin routes protected

---

## 11. 🚀 Optional (Advanced — Later)

- Supabase CLI (for migrations)
- Storage buckets
- Edge functions

---

## ✅ Summary

Supabase setup includes:

- Project creation (staging + production)
- Auth configuration
- Database schema setup
- RLS security
- Environment management

---

## 🧠 Final Thought

> Build in staging → test → move to production
> Never experiment directly in production

---
