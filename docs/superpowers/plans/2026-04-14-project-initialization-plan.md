# Project Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a new React frontend project with bun + vite + react + typescript + tailwind css + shadcn/ui in the current directory.

**Architecture:** Starting from empty directory, we'll use Vite CLI to scaffold the base React TypeScript project, then manually install and configure Tailwind CSS, followed by shadcn/ui initialization. This follows the official conventions for each tool.

**Tech Stack:** bun, Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui

---

## Task 1: Initialize Vite React TypeScript project

**Files:**
- Create: All base Vite + React + TypeScript project files in current directory

- [ ] **Step 1: Run Vite scaffolding command**

Run:
```bash
bun create vite@latest . -- --template react-ts
```
Expected: Scaffolding completes successfully, creates all base project files.

- [ ] **Step 2: Verify base project structure**

Check that these key files exist:
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`

- [ ] **Step 3: Install dependencies**

Run:
```bash
bun install
```
Expected: All dependencies install successfully.

- [ ] **Step 4: Test that dev server starts**

Run:
```bash
bun run dev -- --no-open
```
Expected: Dev server starts successfully without errors. Kill the server with Ctrl+C after verifying.

## Task 2: Install and configure Tailwind CSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Modify: `src/index.css`
- Modify: `package.json` (dependencies added via install)

- [ ] **Step 1: Install Tailwind CSS dependencies**

Run:
```bash
bun add -d tailwindcss postcss autoprefixer
```
Expected: Packages install successfully.

- [ ] **Step 2: Initialize Tailwind configuration**

Run:
```bash
bunx tailwindcss init -p
```
Expected: Creates `tailwind.config.js` and `postcss.config.js`.

- [ ] **Step 3: Configure tailwind.config.js**

Replace content with:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 4: Add Tailwind directives to src/index.css**

Replace contents of `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Verify build works**

Run:
```bash
bun run build
```
Expected: Build completes successfully without errors.

## Task 3: Initialize shadcn/ui

**Files:**
- Create: `components.json`
- Create: `tailwind.config.js` (update from previous)
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/` directory structure

- [ ] **Step 1: Install required dependencies for shadcn/ui**

Run:
```bash
bun add -d @types/node
bun add tailwindcss-animate class-variance-authority clsx lucide-react tailwind-merge
```
Expected: All dependencies install successfully.

- [ ] **Step 2: Update tailwind.config.js for shadcn/ui**

Replace content with:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

- [ ] **Step 3: Update vite.config.ts to resolve path aliases**

Update `vite.config.ts` to:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Update tsconfig.json for path aliases**

Add compilerOptions.paths:
```json
{
  "compilerOptions": {
    // ... (keep existing options)
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 5: Create utils.ts for class name merging**

Create `src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 6: Create directories**

Create:
```bash
mkdir -p src/lib src/components/ui
```

- [ ] **Step 7: Create components.json configuration**

Create `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib"
  }
}
```

- [ ] **Step 8: Update src/index.css with CSS variables**

Replace contents of `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Task 4: Add a test button component to verify setup

**Files:**
- Create: `src/components/ui/button.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add button component using shadcn CLI**

Run:
```bash
bunx shadcn-ui@latest add button
```
Expected: Creates `src/components/ui/button.tsx` successfully.

- [ ] **Step 2: Update App.tsx to use the button component**

Replace `src/App.tsx` with:
```tsx
import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-6">mtzy-mbti</h1>
      <Button>Click me</Button>
    </div>
  )
}

export default App
```

- [ ] **Step 3: Run TypeScript check**

Run:
```bash
bun run tsc
```
Expected: No TypeScript errors.

- [ ] **Step 4: Run build**

Run:
```bash
bun run build
```
Expected: Build completes successfully.

- [ ] **Step 5: Final verification - start dev server**

Run:
```bash
bun run dev -- --no-open
```
Expected: Dev server starts without errors. Kill after verifying.

## Self-Review

### Spec Coverage
- [x] Vite + React + TypeScript scaffolding - Task 1
- [x] Tailwind CSS installation and configuration - Task 2
- [x] shadcn/ui initialization - Task 3
- [x] Verify setup with working component - Task 4
- All requirements covered.

### Placeholder Scan
- No TBD/TODO, all steps have complete code and exact commands.

### Type Consistency
- All paths and imports are consistent across files.
- Path alias `@/*` configured correctly in both Vite and TypeScript.

Plan is complete.
