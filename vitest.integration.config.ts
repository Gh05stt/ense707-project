import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { OPT_IN_PHRASE, OPT_IN_VARIABLES } from './integration/optIn.ts'

const optedIn = process.env.LIVE_INTEGRATION_CONFIRM === OPT_IN_PHRASE

function envFileValues(mode: string) {
  const values = loadEnv(mode, process.cwd(), '')
  for (const name of OPT_IN_VARIABLES) delete values[name]
  return values
}

export default defineConfig(({ mode }) => ({
  test: {
    include: ['integration/**/*.live.ts'],
    environment: 'node',
    env: {
      ...envFileValues(mode),
      LIVE_INTEGRATION_CONFIRM: optedIn ? OPT_IN_PHRASE : '',
      LIVE_INTEGRATION_OPTED_IN: optedIn ? 'yes' : 'no',
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
}))
