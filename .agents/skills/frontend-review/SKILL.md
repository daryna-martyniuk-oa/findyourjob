---
name: frontend-review
description: Guidelines for auditing code quality across HTML, CSS, and JS/TS.
---

# Frontend Review Skill

## 1. HTML Markup Checklist
- Proper semantic landmark elements used (`header`, `nav`, `main`, `section`, `article`, `footer`).
- Exactly one `<h1>` header per page.
- Every form input is explicitly linked with a `<label>` or `aria-label`.
- Accessible interaction controls (`<button>`, `<a>`, `<fieldset>`, `<legend>`).

## 2. CSS & Styling Checklist
- Use CSS custom properties (variables) for spacing, colors, and typography.
- Standard system font stack preferred (`system-ui, -apple-system, Segoe UI, Roboto, sans-serif`).
- Responsive layouts built with mobile-first approach using Flexbox and Grid.
- WCAG 2.2 accessibility compliance (visible focus outlines, appropriate color contrast).