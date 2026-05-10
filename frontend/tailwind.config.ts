import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				display: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
				sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
				mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Charter palette bridged to Tailwind. Use `bg-mf-green`, `text-mf-danger`,
				// `border-mf-night-line`, etc. instead of raw `green-600` / `red-500` /
				// `rose-*` / `emerald-*` / `lime-*` so that drift between
				// look-alike-but-not-identical Tailwind families disappears.
				mf: {
					night: 'var(--mf-night)',
					'night-surface': 'var(--mf-night-surface)',
					'night-elevated': 'var(--mf-night-elevated)',
					'night-line': 'var(--mf-night-line)',
					'night-line-soft': 'var(--mf-night-line-soft)',
					text: 'var(--mf-text)',
					'text-soft': 'var(--mf-text-soft)',
					'text-mute': 'var(--mf-text-mute)',
					green: 'var(--mf-green)',
					'green-deep': 'var(--mf-green-deep)',
					'green-leaf': 'var(--mf-green-leaf)',
					'green-soft': 'var(--mf-green-soft)',
					'green-ring': 'var(--mf-green-ring)',
					danger: 'var(--mf-danger)',
					'danger-soft': 'var(--mf-danger-soft)',
					info: 'var(--mf-info)',
					'info-soft': 'var(--mf-info-soft)',
					warning: 'var(--mf-warning)',
					'warning-soft': 'var(--mf-warning-soft)',
				}
			},
			// Bridge directly to charter tokens so every `rounded-*` Tailwind
			// utility resolves to a charter step. Drops the previous
			// `var(--radius) ± 2px` heuristic that under-rendered controls
			// (10 → 6 px) and cards (14 → 8 px).
			borderRadius: {
				xs: 'var(--mf-radius-xs)',  // 4 px — micro chips
				sm: 'var(--mf-radius-sm)',  // 6 px — tags / small inputs
				md: 'var(--mf-radius-md)',  // 10 px — controls (buttons, inputs)
				lg: 'var(--mf-radius-lg)',  // 14 px — cards (charter heading)
				xl: 'var(--mf-radius-xl)',  // 20 px — identities (hero tiles, modals)
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
