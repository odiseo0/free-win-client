# Free Win Visual Style

This guide records the approved visual direction for Free Win. Use it when the landing page moves into the Astro client and when new public pages need the same identity.

Free Win is a community tool for group purchases of Yu-Gi-Oh! cards in Venezuela. The design must feel direct, open, and useful. It must not look like a corporate store, a game interface, or a luxury brand.

## Core principles

1. Use large type and open space to create hierarchy.
2. Keep the page flat. Do not place each section inside a card.
3. Use only the approved two-color system unless a status needs another color.
4. Keep labels only when they add a useful fact.
5. Let the manga artwork carry the visual detail. Keep the interface simple around it.
6. Preserve clear reading order and keyboard access at every width.

## Color system

| Token | Value | Use |
| --- | --- | --- |
| Floral White | `#FFF8F0` | Page and footer background, reversed button text |
| Tekhelet | `#4C2A85` | Main text, actions, line artwork, focus indicators |
| Soft Tekhelet | `rgba(76, 42, 133, 0.72)` | Secondary notes and supporting text |

Tekhelet on Floral White has strong contrast. Use this pair for normal text. Reverse the colors for primary buttons.

Do not add another accent color only for decoration. A new color is valid only when it has a fixed meaning, such as an error or a confirmed state.

Do not use gradients, glossy effects, colored shadows, or several purple shades as decoration.

## Typography

Use three type roles:

- **Montserrat Semibold** for display headings and primary actions.
- **Roboto Regular or Medium** for paragraphs and answers.
- **Cascadia Mono**, with a system monospace fallback, for short codes and small factual labels.

Headings use tight line height, close to `0.94`. Body text uses a line height from `1.5` to `1.6`.

Use fluid type sizes with `clamp()`. Large section titles can be very large on wide screens, but they must not leave the viewport at 200% text size.

The approved title scale is one pixel smaller than the first prototype scale. Keep this small reduction when the styles move into the client.

Do not insert manual line breaks in headings. Let the layout control wrapping. Keep these titles on one line on wide screens when space permits:

- `Tres pasos. Sin vueltas.`
- `Lo que debes saber.`

Long titles can wrap on smaller screens.

## Page spacing

Use one shared horizontal page inset:

```css
--page-pad: clamp(1.25rem, 4vw, 4.5rem);
```

Use generous section spacing, but keep it about ten percent tighter than the first prototype:

```css
--section-space: clamp(7.2rem, 13.5vw, 13.5rem);
```

Do not add horizontal rules between sections. Use space, type size, and alignment to show where a new section starts.

Controls can have a small corner radius. Main content areas stay open and square.

## Header and navigation

Place the Free Win wordmark on the left and short navigation links on the right.

Desktop navigation can show text links. On small screens, replace the row with the three-dot menu.

The mobile menu must:

- expose an accessible name;
- update `aria-expanded`;
- close after a navigation choice;
- close with Escape; and
- return focus to the menu button after Escape.

Do not use a fixed header unless the page needs one for a tested task.

## Hero

Use a two-column layout on wide screens:

- copy and the main action on the left;
- the processed Yu-Gi-Oh! artwork on the right.

The hero should fill about one viewport height without hiding content below the fold.

The approved hero artwork is the transparent Yugi and Pharaoh composition with a Tekhelet screen-print treatment. It uses a portrait frame close to `4:5`.

Hero artwork rules:

- keep a genuine transparent background;
- use Tekhelet linework and halftone detail;
- keep the character outlines clean;
- show no checkerboard, white box, shadow, or frame;
- make the artwork large enough to carry the right side;
- center it within the right column;
- shift it slightly toward the page center on desktop;
- move it two pixels upward; and
- keep it clear of the navigation and page edge.

Do not show the old `ORIGEN / EXTERIOR → DESTINO / VENEZUELA` line below the hero image.

Use useful alternative text for the hero artwork. Do not repeat nearby heading text in the alternative text.

## Actions

Use one main action per view or section. A primary action uses:

- Tekhelet fill;
- Floral White text;
- Montserrat Semibold;
- a small corner radius; and
- a clear focus outline.

Write actions as direct user tasks, such as `Quiero unirme` or `Enviar mi lista`.

Do not use sales language, false urgency, emojis, or icon-only main actions.

Signup feedback must use a live status area so screen reader users receive the same result.

## Process section

The process section has two columns on wide screens.

The left column contains:

- `Tres pasos. Sin vueltas.`; and
- its short supporting paragraph.

The right column contains one ordered list. Steps must always read from top to bottom:

1. `01 PEDIR`
2. `02 COMPRAR`
3. `03 RECIBIR`

Each step places the large number and short code beside its heading and description.

Align the process list with the right-side content used by the FAQ section. Use the available width so short headings do not wrap on wide screens.

Keep `PEDIR`, `COMPRAR`, and `RECIBIR`. These labels add useful sequence and action information.

Below `58rem`, stack the introduction above the ordered list. Keep the same `01`, `02`, `03` order and clear space between steps.

## FAQ section

Use a two-column layout on wide screens:

- `Lo que debes saber.` on the left;
- the FAQ list on the right.

Leave a clear column gap so the title does not sit too close to the questions.

Use native `details` and `summary` elements. Do not place FAQ items inside cards or add divider lines.

Use a plus sign to show that an answer can open. Turn the sign when the item is open. Keep the motion short and disable it when reduced motion is requested.

On narrow screens, stack the title above the FAQ list.

## Final signup section

The final signup section uses the heading:

`Encuentra lo que quieres jugar.`

Place the `Quiero unirme` button below the heading and align both to the left. Do not place the action in the opposite page column.

Position the whole title and button block lower in the section than the normal section start. Keep enough space below it for the footer artwork.

The footer artwork must not cover the title, button, focus outline, or live feedback text.

## Footer

Keep the footer on the same Floral White background as the page. Use Tekhelet text.

Do not add:

- a purple footer field;
- an abstract purple shape;
- a gradient;
- a shadow; or
- another decorative color.

Use the processed transparent Kaiba composition as the footer artwork.

Footer artwork rules:

- use a high-resolution transparent PNG;
- keep Tekhelet linework;
- place the artwork on the right;
- make it large enough to enter the empty lower part of the signup section;
- raise it above the footer text;
- align its visible right edge with the viewport edge;
- move it slightly beyond the edge when needed to remove a thin transparent gap; and
- reduce its size on narrow screens without removing it.

The Kaiba artwork is decorative in this location. Use an empty alternative value so assistive tools do not repeat information.

Place the footer text at the bottom. Stack it on small screens.

## Labels and wayfinding

Keep a label only when it explains an action, place, sequence, or status.

Approved process labels are:

```text
01 PEDIR
02 COMPRAR
03 RECIBIR
```

Use uppercase monospace text for these short labels.

Do not use a small label only to introduce or repeat a nearby heading. The following removed labels must not return:

- `COMUNIDAD DE YU-GI-OH! / VENEZUELA`
- `RUTA DE PEDIDO / 01—03`
- `INFORMACIÓN / ANTES DE PEDIR`
- `PRÓXIMO PASO / REGISTRO`

Do not restore the origin-to-destination label under the hero.

Do not mix this label system with terminal graphics, fake proof marks, map lines, or game interface decorations.

## Images and texture

Use processed manga images as the main visual texture. Keep the surrounding interface flat and quiet.

Approved image treatments include:

- coarse halftone dots;
- limited two-color dithering;
- visible print grain; and
- sharp monochrome manga linework.

Use Tekhelet as the only ink color. Let the Floral White page show through transparent image regions.

Do not use full-color anime art directly in the interface. Do not add a white rectangle behind a transparent image.

Store final artwork at a useful display resolution. Avoid scaling a small source far beyond its natural size.

## Responsive behavior

Design mobile-first, then preserve the large editorial layout on wider screens.

At widths below `58rem`:

- stack the hero columns;
- stack the process introduction above its steps;
- stack the FAQ title above its list;
- keep the hero and footer artwork centered or edge-aligned as their section requires; and
- keep all actions easy to reach.

At widths below `40rem`:

- use the smallest page inset;
- allow long headings to wrap;
- keep step numbers and text in a readable two-column row;
- stack footer text; and
- keep decorative art clear of interactive content.

Do not use fixed heights for text containers. Use minimum heights only when they protect the composition.

## Accessibility

Keep a visible skip link and clear `:focus-visible` outlines.

All interactive controls must work with pointer and keyboard input.

Honor `prefers-reduced-motion`. Motion must explain a state change and must not exist only as decoration.

Support 200% text size without overlap, clipped controls, or horizontal scrolling.

Do not rely on color alone for status, price, quantity, validation, or progress.

Use useful alternative text for content images. Use an empty alternative value for decorative images.

## Writing style

Spanish is the primary product language.

Use short, direct sentences. Explain what Free Win does without sales claims.

Use `Pedido` for the group-purchase window and `Orden` for one participant's request when these product concepts appear.

Do not add filler text to occupy empty space. Empty space is part of this visual system.

## Implementation checklist

Before a page using this style is complete, confirm that:

- the page uses Floral White and Tekhelet as its main colors;
- headings use Montserrat and paragraphs use Roboto;
- no redundant section labels appear;
- the process reads `01`, `02`, `03` from top to bottom;
- wide headings do not wrap when enough space exists;
- the hero image is large, transparent, centered on the right, and two pixels higher;
- the hero route label is absent;
- the final button is below its heading on the left;
- the footer has no purple background or abstract shape;
- the Kaiba image reaches the right viewport edge;
- artwork does not cover actions or text;
- mobile navigation works with pointer, keyboard, and Escape;
- signup feedback is announced;
- focus remains visible;
- reduced motion works; and
- the page remains usable at 200% text size.
