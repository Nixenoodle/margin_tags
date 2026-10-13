import { build } from 'esbuild';
await build({
  entryPoints: ['src/main.ts'], bundle: true, outfile: 'main.js',
  platform: 'browser', format: 'cjs', target: 'es2020',
  external: ['obsidian', '@codemirror/state', '@codemirror/view', '@codemirror/language', '@lezer/common'],
  banner: { js: '/* Margin Tags v0.1.1 | MIT License | See src/ for editable source. */' }
});
