// design-sync: wraps the app's tailwind config, adds the previews dir to the
// content scan and safelists every `mf-*` charter class so none are purged —
// the synced DS must expose the full charter vocabulary to the design agent.
import base from './tailwind.config';

export default {
  ...base,
  content: [
    ...(base.content as string[]),
    '../.design-sync/previews/**/*.{ts,tsx}',
  ],
  safelist: [{ pattern: /^mf-/ }],
} as typeof base;
