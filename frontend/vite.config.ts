import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The backend hardcodes port 3000 in three places: CORS_ORIGINS, CONSENT_UI_URL,
  // and every client's registered redirect_uri (stored in the database). On Vite's
  // default 5173 the browser is blocked by CORS and the OAuth redirect goes nowhere.
  // strictPort so a busy port fails loudly instead of silently picking another.
  server: { port: 3000, strictPort: true },
})
