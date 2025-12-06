# 🚀 Propel Migration Guide: Base44 → Supabase

## Overview

This guide will help you complete the migration from Base44 SDK to Supabase. The foundation has been laid—now we need to:

1. Configure your Supabase credentials
2. Migrate existing components to use new hooks
3. Remove Base44 dependency entirely

---

## ✅ Phase 1: Setup (COMPLETED)

- [x] Created Supabase client (`src/lib/supabase.ts`)
- [x] Created TaskRepository with all CRUD methods
- [x] Created React Query hooks (`src/hooks/useTasks.ts`)
- [x] Added QueryClientProvider to `main.jsx`
- [x] Created backward-compatible wrapper in `base44Client.js`

---

## 🔧 Phase 2: Configure Supabase (DO THIS NOW)

### Step 1: Get Your Supabase Credentials

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project (or create one if you haven't)
3. Go to **Settings → API**
4. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### Step 2: Update `.env` File

Edit `/Users/altrax/Desktop/Propel-Updated-version-2025-12-03/.env`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ CRITICAL: Never commit `.env` to git!** It's already in `.gitignore`.

### Step 3: Set Up Database Schema

If you **haven't already** created your database tables, go to **Supabase Dashboard → SQL Editor** and run the schema I provided earlier in this conversation (the big SQL block with `CREATE TABLE` statements).

If you **already have tables**, make sure they match the TypeScript types in `src/lib/supabase.ts`.

### Step 4: Test the Connection

```bash
cd /Users/altrax/Desktop/Propel-Updated-version-2025-12-03
npm run dev
```

Open your browser console. You should see deprecation warnings like:
```
DEPRECATED: Use TaskRepository.list() instead
```

This means the backward-compatible wrapper is working!

---

## 📝 Phase 3: Migrate Components

### Migration Pattern

**OLD (Base44):**
```jsx
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';

const { data: tasks } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => base44.entities.Task.list('-created_date', 100),
});

const createMutation = useMutation({
  mutationFn: (data) => base44.entities.Task.create(data),
});
```

**NEW (Supabase):**
```jsx
import { useTasks, useCreateTask } from '@/hooks/useTasks';

const { data: tasks, isLoading, error } = useTasks('created_at', 100);
const createTask = useCreateTask();

// Usage
createTask.mutate({ title: 'New task', status: 'todo' });
```

### Components to Migrate (Priority Order)

1. **Dashboard.jsx** (highest impact)
   - Replace `useQuery(['tasks'], () => base44.entities.Task.list(...))`
   - With: `useTasks()`

2. **Tasks.jsx**
   - Same as Dashboard

3. **Calendar.jsx**
   - Migrate task fetching

4. **useTaskMutations.jsx** (hook file)
   - This is already duplicating logic—replace entirely with `useTasks.ts`

### Example: Migrate Dashboard.jsx

**Find this code (around line 73-76):**
```jsx
const { data: tasks = [], isLoading } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => base44.entities.Task.list('-created_date', 100),
});
```

**Replace with:**
```jsx
import { useTasks } from '@/hooks/useTasks';

const { data: tasks = [], isLoading } = useTasks('created_at', 100);
```

**And for mutations (around line 200+):**
```jsx
// OLD
const createMutation = useMutation({
  mutationFn: (data) => base44.entities.Task.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['tasks']);
  },
});

// NEW
import { useCreateTask } from '@/hooks/useTasks';
const createTask = useCreateTask(); // Handles invalidation automatically
```

---

## 🧹 Phase 4: Clean Up

After migrating all components:

### Step 1: Remove Base44 Dependency

```bash
npm uninstall @base44/sdk
```

### Step 2: Delete Compatibility Wrapper

```bash
rm src/api/base44Client.js
rm -rf src/api/  # If this was the only file
```

### Step 3: Find Remaining References

```bash
grep -r "base44" src/
```

Should return **0 results** after migration is complete.

---

## 🔐 Phase 5: Add Supabase Authentication

Replace your current auth with Supabase Auth (much better than Base44):

### Step 1: Create Auth Context

Create `src/contexts/AuthContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### Step 2: Wrap App with AuthProvider

Update `src/App.jsx`:

```jsx
import { AuthProvider } from '@/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Pages />
      <Toaster />
    </AuthProvider>
  );
}
```

### Step 3: Create Login Page

Create `src/pages/Login.jsx`:

```jsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6">Login to Propel</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

### Step 4: Add Protected Route Wrapper

Create `src/components/auth/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Use a proper loading skeleton
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

### Step 5: Update Routes

In `src/pages/index.jsx`:

```jsx
import Login from './Login';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

<Routes>
  <Route path="/login" element={<Login />} />

  {/* Wrap all authenticated routes */}
  <Route path="*" element={
    <ProtectedRoute>
      <Layout currentPageName={currentPage}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* ...rest of your routes */}
        </Routes>
      </Layout>
    </ProtectedRoute>
  } />
</Routes>
```

---

## 🎯 Quick Reference: Common Queries

### Fetch Tasks
```jsx
import { useTasks } from '@/hooks/useTasks';
const { data: tasks, isLoading } = useTasks();
```

### Create Task
```jsx
import { useCreateTask } from '@/hooks/useTasks';
const createTask = useCreateTask();
createTask.mutate({ title: 'New task', status: 'todo' });
```

### Update Task
```jsx
import { useUpdateTask } from '@/hooks/useTasks';
const updateTask = useUpdateTask();
updateTask.mutate({ id: '123', updates: { status: 'done' } });
```

### Delete Task
```jsx
import { useDeleteTask } from '@/hooks/useTasks';
const deleteTask = useDeleteTask();
deleteTask.mutate('task-id-here');
```

### Search Tasks
```jsx
import { useSearchTasks } from '@/hooks/useTasks';
const { data: results } = useSearchTasks('search query');
```

---

## 🚨 Common Issues & Solutions

### Issue: "Missing Supabase environment variables"
**Solution:** Make sure `.env` file exists and has correct values.

### Issue: "relation 'public.tasks' does not exist"
**Solution:** You haven't run the SQL schema. Go to Supabase SQL Editor and run the schema.

### Issue: "Row Level Security policy violation"
**Solution:** Make sure you're logged in. RLS policies block unauthorized access.

### Issue: Tasks not showing after login
**Solution:** Check that `user_id` in tasks table matches `auth.uid()` from Supabase Auth.

---

## 📊 Progress Tracker

- [ ] Configure `.env` with Supabase credentials
- [ ] Run database schema in Supabase SQL Editor
- [ ] Test connection (run `npm run dev` and check console)
- [ ] Migrate Dashboard.jsx
- [ ] Migrate Tasks.jsx
- [ ] Migrate Calendar.jsx
- [ ] Add AuthProvider to App.jsx
- [ ] Create Login page
- [ ] Add ProtectedRoute wrapper
- [ ] Update routes in index.jsx
- [ ] Remove Base44 dependency (`npm uninstall @base44/sdk`)
- [ ] Delete `src/api/base44Client.js`
- [ ] Verify no references to `base44` remain (`grep -r "base44" src/`)

---

## 🎓 Next Steps After Migration

1. **Add more repositories** (Projects, Comments, UserStats)
2. **Enable real-time subscriptions** (for live collaboration)
3. **Add file upload** using Supabase Storage
4. **Migrate to Next.js** for SSR and better performance
5. **Add comprehensive testing** (Vitest + Playwright)

---

## 🆘 Need Help?

If you get stuck:
1. Check Supabase docs: https://supabase.com/docs
2. Check browser console for errors
3. Test direct queries in Supabase SQL Editor
4. Ask me to help debug specific components

**You've got this! The hard part (architecture) is done. Now it's just systematic migration.**
