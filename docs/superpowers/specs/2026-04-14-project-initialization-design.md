# Design: Project Initialization with bun + vite + react + typescript + tailwind css + shadcn/ui

**Date**: 2026-04-14
**Project**: mtzy-mbti
**Author**: OpenCode

## Overview

Initialize a new React frontend project in the current directory with the specified tech stack. This is just the base scaffold with no additional features.

## Requirements

- Package Manager: bun
- Build Tool: Vite
- Framework: React + TypeScript
- CSS Framework: Tailwind CSS
- Component Library: shadcn/ui
- Scope: Basic scaffold only, no additional features or pages

## Approach Chosen

Approach 1: Vite CLI scaffolding followed by manual Tailwind CSS and shadcn/ui integration. This uses the official Vite template which is well-maintained and follows standard conventions.

## Architecture / Structure

```
mtzy-mbti/
├── node_modules/
├── public/             # static assets
├── src/
│   ├── assets/         # project assets (images, etc)
│   ├── components/     # components (including shadcn/ui)
│   ├── App.tsx         # root component
│   ├── index.css       # global styles (including Tailwind directives)
│   └── main.tsx        # entry point
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── README.md
```

## Configuration Plan

1. **Vite + React + TypeScript**: Initialize using `bun create vite@latest . -- --template react-ts`
2. **Install dependencies**: Install all required packages with bun
3. **Tailwind CSS**: Install and configure Tailwind with PostCSS
4. **shadcn/ui**: Initialize shadcn/ui with default configuration
5. **Verify**: Install one basic component (button) to confirm everything works

## Dependencies

### Core Dependencies
- react
- react-dom
- typescript
- vite
- @vitejs/plugin-react

### Tailwind CSS Dependencies
- tailwindcss
- postcss
- autoprefixer

### shadcn/ui Dependencies
- @types/node
- tailwindcss-animate
- class-variance-authority
- clsx
- lucide-react
- tailwind-merge

## Success Criteria

- `bun install` completes successfully
- `bun run dev` starts the dev server without errors
- Vite, React, TypeScript, Tailwind, and shadcn/ui are all properly configured
- A basic shadcn component renders correctly

## Risk Assessment

- Low risk: All tools are stable and well-documented
- Configuration follows official guides, so minimal chance of compatibility issues
- Using bun as package manager is fully supported by all tools

## Next Steps

After design approval, create detailed implementation plan using `writing-plans` skill.
