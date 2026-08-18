# Pleak Design Guidelines

Design read (per `taste-skill-full.md` Section 0.B): Pleak is a mobile-first
personal product app (workout tracker) for a small trusted group, in a clean
confident-SaaS language per the Cal.com-inspired brand spec. It is **not** a
landing page or portfolio — per the taste-skill's own Section 13, its
hero/marquee/eyebrow/scroll-hijack rules are out of scope here. What follows
is the subset of that skill's discipline that applies to any UI, adapted for
a compact daily-use app rather than a marketing site.

## Locked systems (do not violate)

- **Color Consistency Lock**: one accent pair only — UCLA Blue `#2774AE` and
  UCLA Gold `#FFD100` — defined once in `src/index.css` `@theme`. No other
  saturated accent gets introduced anywhere in the app.
- **Shape Consistency Lock**: radius scale is `8px` (buttons/inputs),
  `12px` (cards), pill (nav pills/badges), full circle (avatars/icon
  buttons) — already encoded as `--radius-*` tokens. Never hand-pick a
  one-off radius value in a component.
- **Page Theme Lock**: light/dark is a whole-page toggle (`theme-context`),
  never a per-section flip. Both modes are designed and checked before a
  screen is considered done.
- **One icon family**: `@phosphor-icons/react`, `strokeWidth`/weight
  standardized. No hand-rolled SVG icon paths, no mixing in a second icon
  library.

## Interaction completeness (apply to every screen)

Every screen needs all four states before it's done, not just the happy path:
- **Loading** — skeleton shaped like the real content, not a generic spinner.
- **Empty** — composed intentionally, tells the user what to do next (e.g.
  History empty state says "Log your first workout" with the action visible,
  not a blank page).
- **Error** — inline for forms, contextual/toast for transient failures.
- **Populated** — the real content state.

## Accessibility / contrast (mandatory checks)

- Every button's text must pass WCAG AA (4.5:1) against its background —
  audit especially the black primary CTA on white/gold surfaces.
- Every form input, placeholder, focus ring, and label passes AA against its
  section background.
- Tactile feedback on `:active` (`scale-[0.98]` or `-translate-y-[1px]`)
  instead of hover-only states, since this is a touch-first app.

## Content tells to avoid

- No em dash (`—`) anywhere in UI copy — headings, buttons, empty states,
  captions. Use a period, comma, or hyphen instead.
- No filler verbs ("Elevate", "Unleash", "Seamless") in UI copy — plain,
  concrete labels only ("Log workout", not "Elevate your training").
- No fake-precise placeholder numbers in seed/demo data.

## Motion (restrained, not landing-page choreography)

This is a utility app opened multiple times a day — motion should confirm
state changes, not perform. Favor CSS transitions on `transform`/`opacity`
(150 to 200ms, ease-out) for nav transitions, button presses, and list item
entry. No scroll-hijacking, no parallax, no marquees — those are marketing-
site patterns and out of scope per the skill's own Section 13. Respect
`prefers-reduced-motion` for anything beyond simple hover/press feedback.

## Explicit brief overrides (documented per the skill's own override paths)

- **Inter as the type family** is a deliberate choice from the user-supplied
  brand spec (`Desing_mdcal_blueyellow.yaml`), not the AI-default fallback
  the skill warns against — kept as specified.
- **Landing-page rules skipped in full**: hero composition, eyebrow rationing,
  bento cell counts, marquees, GSAP scroll patterns. None apply to a 5-tab
  mobile app shell.

Full vendored skill text: [`taste-skill-full.md`](taste-skill-full.md).
