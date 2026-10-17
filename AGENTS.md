# FindYourJob — AI Agent Guidelines

This document outlines instructions and architectural boundaries for AI assistants working on the FindYourJob repository.

## Core Principles
- **Clean Architecture & HTML5 Semantics:** Always use standard HTML5 landmark elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`). Ensure accessible forms with associated `<label>` tags and fieldsets.
- **Modern CSS & No Heavy Frameworks:** Use standard CSS custom properties, Flexbox, CSS Grid, and cascade layers (`@layer`). Keep styles clean and modular.
- **Vite Ecosystem Compatibility:** Maintain full compatibility with Vite tooling, multi-page entry points, and relative base paths (`./`).
- **Progressive Enhancement:** Implement code step-by-step according to project prompts without introducing prematurely complex tools.