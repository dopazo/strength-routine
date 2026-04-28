import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Cloudflare Pages sirve en raíz: dejar `base` por defecto.
// GitHub Pages bajo sub-path: descomentar y poner el nombre del repo.
// base: '/rutina_fuerza_elastico/',
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
