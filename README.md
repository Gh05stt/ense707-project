# React + TypeScript + Vite

React + TypeScript app built with Vite, Tailwind CSS, and React Router.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [pnpm](https://pnpm.io/installation) 9 or later

Install pnpm if you do not already have it:

```bash
npm install -g pnpm
```

## Setup

1. Clone the repository and open the project folder:

```bash
git clone https://github.com/Gh05stt/ense707-project.git
cd ense707-project
```

2. Install dependencies:

```bash
pnpm install
```

## Run locally

Start the development server:

```bash
pnpm dev
```

Vite will print a local URL (typically `http://localhost:5173`). Open it in your browser.

The staff dashboard is at `/staff/dashboard`.

## Other commands

| Command | Description |
| --- | --- |
| `pnpm build` | Type-check and create a production build |
| `pnpm preview` | Serve the production build locally |
| `pnpm lint` | Run Oxlint |
| `pnpm test` | Run the automated Vitest test suite once |
| `pnpm test:watch` | Run Vitest in watch mode while developing |
| `pnpm test:ui` | Run Vitest with the interactive UI |

## Testing

Automated component/unit tests use **Vitest**, **React Testing Library**,
`@testing-library/jest-dom`, and `@testing-library/user-event`. They live
next to the code they test as `*.test.tsx` / `*.test.ts` files (e.g.
`src/pages/user/CreateTicket.test.tsx`), plus shared helpers in `src/test/`.

Run the whole suite:

```bash
pnpm test
```

Run a single file:

```bash
pnpm test -- src/pages/user/CreateTicket.test.tsx
```

External dependencies (Supabase-backed services in `src/services/ticketService.ts`
and the `useAuth` hook) are mocked with `vi.mock` so tests are deterministic and
don't hit the network. Component logic is never mocked.
 