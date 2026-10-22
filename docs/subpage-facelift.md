# Random Info Pages / subpage facelift

Scope: 19 active project entry points, 13 Toolbox utility screens, and 2 nested data views. Archived VCT Scout, Tideborne wiki, Fishing System 2.0 and their nested pages are excluded.

Architecture:
- `design-system/rip.css`: isolated global project rail, accessible searchable project switcher and skip-free navigation.
- `design-system/rip.js`: progressive, local navigation; no alterations to project state or project-specific event handlers.
- `design-system/project-polish.css`: active-project-specific typography, layout and interaction improvements. All selectors are scoped under `body[data-rip-page]`.
- Existing page stylesheets, scripts and localStorage keys remain in place.
- Avoid `Ctrl+K` interception because some existing applications use it.
- Never render the cross-project rail inside previews/iframes.
- Preserve former routes exactly and keep the classic page unchanged.
- Design language: Swiss-aligned labels/typography, minimalist controls, isolated visual accents, and a deliberately small number of animations.

Review checklist:
- Desktop and mobile widths: 360, 768, 1280, and 1600 px.
- All archived directories remain unchanged.
- Full 19-project navigation remains searchable across apps.
- Existing projects still start and retain saved data.
- Basic keyboard traversal, focus rings, reduced-motion preference, image/canvas interactions.
