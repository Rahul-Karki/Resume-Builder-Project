import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import path from 'path'
import fs from 'fs'
import zlib from 'zlib'

function getSource(bundle: Record<string, any>, fileName: string): string | null {
  for (const info of Object.values(bundle) as any[]) {
    if (info.fileName === fileName) {
      if (info.type === 'chunk') return info.code;
      if (info.type === 'asset') return typeof info.source === 'string' ? info.source : null;
    }
  }
  return null;
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteCompression({ algorithm: 'gzip', filter: /\.(js|mjs|css|html)$/i }),
    ...(process.env.BUILD_ANALYZE ? [visualizer({ open: true, gzipSize: true, brotliSize: true })] : []),
    {
      name: 'bundle-size-tracker',
      writeBundle(_options, bundle) {
        const distDir = _options.dir || 'dist';
        const statsPath = path.resolve(distDir, 'bundle-stats.json');
        const chunks: Record<string, { size: number; gzip: number }> = {};

        for (const [, info] of Object.entries(bundle) as Array<[string, any]>) {
          if (!info.fileName?.match(/\.(js|css)$/)) continue;
          const src = info.type === 'chunk' ? info.code
            : info.type === 'asset' ? (typeof info.source === 'string' ? info.source : null)
            : null;
          if (src == null) continue;
          const size = Buffer.byteLength(src, 'utf-8');
          const gzip = zlib.gzipSync(src).length;
          chunks[info.fileName] = { size, gzip };
        }

        const total = Object.values(chunks).reduce((s, c) => s + c.size, 0);
        const totalGzip = Object.values(chunks).reduce((s, c) => s + c.gzip, 0);

        const stats = {
          buildTime: new Date().toISOString(),
          totalSize: total,
          totalGzipSize: totalGzip,
          chunks,
        };

        try {
          fs.mkdirSync(distDir, { recursive: true });
          fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
          console.log(`\n  Bundle size: ${(total / 1024).toFixed(1)} KB (${(totalGzip / 1024).toFixed(1)} KB gzip)`);
          console.log(`  Bundle stats: ${statsPath}\n`);
        } catch {}
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/axios/') || id.includes('node_modules/zustand/')) {
            return 'vendor-libs';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
        },
      },
    },
  },
})