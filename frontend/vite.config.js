import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'
import { mkdirSync, writeFileSync } from 'node:fs'

const staticSitesWorker = () => ({
  name: 'medistore-static-sites-worker',
  closeBundle() {
    mkdirSync(new URL('./dist/server/', import.meta.url), { recursive: true })
    writeFileSync(
      new URL('./dist/server/index.js', import.meta.url),
      `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET') return response
    const url = new URL(request.url)
    if (url.pathname.includes('.')) return response
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request))
  },
}\n`,
    )
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sites(), staticSitesWorker()],
})
