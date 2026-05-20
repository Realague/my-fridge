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
				// Fresh charter — DM Sans display, Inter body
				display: ['"DM Sans"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
				sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
				// Fresh charter palette bridged to Tailwind. Use `bg-mf-green`,
				// `text-mf-danger`, `border-mf-night-line`, etc. instead of raw
				// `green-600` / `red-500` / `rose-*` / `emerald-*` / `lime-*` so that
				// drift between look-alike-but-not-identical Tailwind families
				// disappears. Names `night/*` are kept as surface aliases (now
				// resolve to Fresh cream tones) so existing components keep working.
				mf: {
					night: 'var(--mf-night)',
					'night-surface': 'var(--mf-night-surface)',
					'night-elevated': 'var(--mf-night-elevated)',
					'night-line': 'var(--mf-night-line)',
					'night-line-soft': 'var(--mf-night-line-soft)',
					'page-bg': 'var(--mf-page-bg)',
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
					yellow: 'var(--mf-yellow)',
					'yellow-soft': 'var(--mf-yellow-soft)',
					orange: 'var(--mf-orange)',
					'orange-soft': 'var(--mf-orange-soft)',
					red: 'var(--mf-red)',
					'red-soft': 'var(--mf-red-soft)',
					blue: 'var(--mf-blue)',
					'blue-soft': 'var(--mf-blue-soft)',
					pink: 'var(--mf-pink)',
					'pink-soft': 'var(--mf-pink-soft)',
					'pink-deep': 'var(--mf-pink-deep)',
					purple: 'var(--mf-purple)',
					'purple-soft': 'var(--mf-purple-soft)',
					'purple-deep': 'var(--mf-purple-deep)',
				}
			},
			// Bridge directly to Fresh charter tokens so every `rounded-*` Tailwind
			// utility resolves to a charter step. Fresh scale: 10/14/18/24 + pill.
			borderRadius: {
				xs: 'var(--mf-radius-xs)',  //  8 px — micro chips
				sm: 'var(--mf-radius-sm)',  // 10 px — tags / small inputs
				md: 'var(--mf-radius-md)',  // 14 px — items list, integrated icons, controls
				lg: 'var(--mf-radius-lg)',  // 18 px — cards mobiles / secondaires
				xl: 'var(--mf-radius-xl)',  // 24 px — cards desktop / hero
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
