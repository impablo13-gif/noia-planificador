import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La base con subruta solo hace falta para el build de producción que se
// publica en GitHub Pages (sirve desde /noia-planificador/); en local
// (`npm run dev`) se mantiene en la raíz para no romper el enlace de
// siempre, http://localhost:5182.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/noia-planificador/' : '/',
  plugins: [react()],
}))
