import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import type { Plugin } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// `npm run dev` also starts the Python engine. app.py exits on its own if one is already running.
function startEngine(): Plugin {
  return {
    name: 'start-engine',
    apply: 'serve',
    configureServer() {
      const venvPy = [
        path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
        path.join(__dirname, '.venv', 'bin', 'python')
      ].find(existsSync)
      const engine = spawn(venvPy ?? 'python', [path.join(__dirname, 'backend', 'app.py')], {
        stdio: 'inherit',
        env: { ...process.env, MARKITDOWN_NO_BROWSER: '1' }
      })
      engine.on('error', (e) => console.error(`[engine] failed to start: ${e.message}. Run start.bat once to set up .venv.`))
      process.on('exit', () => engine.kill())
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), startEngine()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT || 7860}`,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
