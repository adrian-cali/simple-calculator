# Calc — a modern calculator

A clean, keyboard-friendly calculator with chained calculations, percentages,
and session history — built with plain HTML, CSS, and JavaScript (no
frameworks, no build step).

## Files

```
index.html    Markup and structure
styles.css    Visual design (colors, layout, animations, responsive rules)
script.js     Calculator logic, state, and UI wiring
```

Keep all three files together in the same folder — `index.html` links to the
other two by relative path.

## Running it

No install or server required. Just open `index.html` in a browser
(double-click it, or drag it into a browser window).

## Features

- Basic operations: `+ − × ÷ %`, decimals, sign toggle (`±`)
- Correct order of operations (× and ÷ evaluated before + and −)
- Chained calculations, and you can keep calculating right after `=`
- Division by zero and other invalid states show a friendly error
- Large numbers are formatted with commas; floating-point rounding
  artifacts (like `0.1 + 0.2`) are cleaned up
- Full keyboard support:

  | Key | Action |
  |---|---|
  | `0`–`9` | digits |
  | `.` | decimal point |
  | `+` `-` `*` `/` | operators |
  | `%` | percent |
  | `Enter` / `=` | calculate |
  | `Backspace` | delete last digit |
  | `Escape` | clear (`AC`) |

- Calculation history: tap any past result to reuse it, or clear the list.
  History is kept **in memory for the current page session only** — it
  resets on reload (no `localStorage` is used). Wire up real persistence if
  you deploy this somewhere with browser storage available.
- Responsive layout: side history panel on desktop, slide-in drawer on
  mobile.
- Accessible: semantic buttons, ARIA labels, visible focus states, no
  color-only signaling.

## Code structure

`script.js` is organized into three independent pieces:

1. **`Engine`** — pure calculation logic and state (no DOM code). Uses a
   hand-written two-pass evaluator for `× ÷` then `+ −`; never uses `eval()`.
2. **`History`** — the in-memory list of past calculations.
3. **UI wiring** — DOM rendering and event listeners (click, keyboard,
   history drawer) that read from `Engine` and `History`.

This separation makes it straightforward to swap in a different UI, add
persistence, or extend the math (e.g. parentheses, memory buttons) without
touching the rest.

## Customizing

- Colors, fonts, spacing, and animation timing are all defined near the top
  of `styles.css` as CSS custom properties (`:root { --bg: ...; }`) — change
  values there rather than hunting through individual rules.
- Fonts are loaded from Google Fonts (`IBM Plex Mono` + `Inter`) with system
  font fallbacks, so the app still looks reasonable offline.
