// Root Tailwind config — the app itself lives in frontend/ (see root
// vite.config.ts `root: "./frontend"`). Tailwind resolves its config from the
// process cwd, so `npm run dev` / `npm run build` launched from the repo root
// lands here while Docker (context: ./frontend) lands on the frontend config.
//
// This file therefore MUST NOT carry a theme of its own: a duplicated theme
// silently drifted and dropped the whole Fresh `mf-*` palette, rendering every
// `bg-mf-night-surface` / `border-mf-night-line` as nothing. Single source of
// truth is frontend/tailwind.config.ts — we only rewrite the content globs,
// which Tailwind resolves relative to the cwd, not to the config file.
import base from "./frontend/tailwind.config";

export default {
	...base,
	content: [
		"./frontend/pages/**/*.{ts,tsx}",
		"./frontend/components/**/*.{ts,tsx}",
		"./frontend/app/**/*.{ts,tsx}",
		"./frontend/src/**/*.{ts,tsx}",
	],
} as typeof base;
