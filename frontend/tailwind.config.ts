import type { Config } from "tailwindcss";

// Charter tokens hold plain hex (`--mf-green: #2BB673`), which Tailwind cannot
// give an alpha channel the usual way — that needs `<alpha-value>` inside the
// value, i.e. channel triples. With a bare `var()` Tailwind silently DROPS every
// modifier form: `bg-mf-night/85` produced no rule at all. The function form
// below keeps the hex tokens (raw `var(--mf-*)` is used all over index.css and
// in inline SVG props) while making `/NN` resolve through `color-mix`. That
// color-mix is reserved for real `/NN` modifiers: for the bare utility Tailwind
// hands us `var(--tw-bg-opacity, 1)`, and wrapping every single surface in a
// color-mix would raise the browser floor app-wide to buy nothing.
const mfToken =
  (name: string) =>
  ({ opacityValue }: { opacityValue?: string | number }) => {
    // Tailwind passes a number for the bare utility and a string for `/NN`.
    const alpha = opacityValue === undefined ? undefined : String(opacityValue);
    return alpha === undefined || alpha === "1" || alpha.includes("var(")
      ? `var(--${name})`
      : `color-mix(in srgb, var(--${name}) calc(${alpha} * 100%), transparent)`;
  };

// Fresh charter palette bridged to Tailwind. Use `bg-mf-green`,
// `text-mf-danger`, `border-mf-night-line`, etc. instead of raw `green-600` /
// `red-500` / `rose-*` / `emerald-*` / `lime-*` so that drift between
// look-alike-but-not-identical Tailwind families disappears. Names `night/*`
// are kept as surface aliases (now resolve to Fresh cream tones) so existing
// components keep working. Each entry maps 1:1 onto `--mf-<name>` in index.css.
const MF_TOKENS = [
	"night", "night-surface", "night-elevated", "night-line", "night-line-soft", "page-bg",
	"text", "text-soft", "text-mute",
	"green", "green-deep", "green-leaf", "green-soft", "green-ring",
	"danger", "danger-soft", "info", "info-soft", "warning", "warning-soft",
	"yellow", "yellow-soft", "orange", "orange-soft", "red", "red-soft",
	"blue", "blue-soft", "pink", "pink-soft", "pink-deep",
	"purple", "purple-soft", "purple-deep", "brown", "brown-soft",
] as const;

const mfPalette = Object.fromEntries(
	MF_TOKENS.map((name) => [name, mfToken(`mf-${name}`)]),
);

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
				mf: mfPalette
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
