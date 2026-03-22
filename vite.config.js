import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages project sites live at https://<user>.github.io/<repo>/
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const base =
  process.env.GITHUB_ACTIONS === 'true' && repo ? `/${repo}/` : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
