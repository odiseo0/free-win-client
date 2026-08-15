## Development

When starting the development server, use background mode:

```sh
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Free Win domain and backend

Free Win is a non-profit community tool that coordinates group purchases of Yu-Gi-Oh!
cards from external sources. It is not an e-commerce or corporate application. Use
Spanish domain terms in user-facing text where they are clearer:

- A **Pedido** (`OrderPeriod`) is a group-purchase window with the states `draft`,
  `open`, and `closed`.
- An **Orden** (`OrderRequest`) is one participant's request inside a Pedido. Its
  states are `submitted`, `in_review`, `accepted`, `rejected`, and `cancelled`.
- An order contains items based on **card listings**. Items retain a snapshot of the
  listing's card data, condition, rarity, and estimated price for historical accuracy.
- During review, organizers agree a quantity and set card, shipping, and tax prices.
  The backend calculates final unit and order totals when all required pricing exists.
- Items can be soft-removed and restored; orders and Pedidos both expose history.

The local backend is the contract authority: `http://127.0.0.1:8000/openapi.json`.
Consult it before adding or changing backend-facing functionality. Do not infer a
request field, enum, endpoint, or state transition from the UI alone.

### API integration rules

- Use the OpenAPI contract's camelCase JSON field names without client-side
  snake_case translation.
- Collection endpoints conventionally accept `page` (starting at 1) and `shows`
  (1–100), and return `{ items, total }`.
- Model API responses and request payloads with TypeScript types close to the API
  client; keep UI-specific state separate from transport types.
- Treat `401`, `403`, `404`, and `422` as expected user-facing states. Display
  validation errors clearly and do not silently discard them.
- Backend authentication is currently development-configured. Do not build a fake
  browser token flow unless the backend contract introduces one.
- Never use mutation endpoints merely to explore the API. Read operations are safe;
  creating, updating, reviewing, or deleting data requires the task to call for it.
- Key API areas are `order-periods`, `order-requests`, `cards`, `card-listings`,
  `users`, `user-addresses`, `roles`, and `permissions`.

## Client architecture: Astro, Svelte, and Tailwind

- Use Astro pages and layouts for routes, document structure, and mostly static
  composition. Use Svelte components for interactive, stateful UI such as forms,
  searchable listings, order editing, and review actions.
- Svelte components render static HTML by default in Astro. Add the smallest
  appropriate `client:*` hydration directive only where browser interactivity is
  needed; avoid hydrating entire pages by default.
- Tailwind is the styling system for this client. If it is not installed yet,
  configure the official Astro integration before writing a large amount of styling.
  Prefer reusable semantic component patterns over one-off, repeated utility groups.
- Design mobile-first and make status, price, quantity, and validation information
  readable without relying on color alone.
- Keep external API URLs configurable rather than scattering local service addresses
  through components. The development defaults are backend `127.0.0.1:8000` and
  search `127.0.0.1:8001`.
- Preserve Spanish as the primary product language. Keep technical identifiers in
  English when they mirror API names or source code.
- Keep route paths and URL segments in English (for example, `/order-periods`,
  `/orders`, and `/admin/orders`). Visible navigation labels, headings, form labels,
  status labels, validation, and other user-focused copy remain in Spanish.
- The backend and search contracts are generated into
  `src/lib/api/backend.generated.ts` and `src/lib/api/search.generated.ts`.
  Refresh them with `pnpm api:generate` while both local services are running, and
  commit the result. Do not hand-edit generated files.
- Arbitrary backend identifiers use Astro on-demand routes through the Node adapter.
  API records still load in focused Svelte islands so the build does not require a
  running backend.

## Achievable development objectives

Build the client incrementally in this order unless a task explicitly changes it:

1. Establish the app shell, Tailwind foundation, Spanish navigation, API client, and
   shared loading/error/empty states.
2. Build the participant flow: browse open Pedidos, search card listings, compose an
   Orden, and view/update the user's own order and its calculated totals.
3. Build organizer workflow: create and manage Pedidos, inspect orders, review item
   quantities and prices, and apply accept/reject/cancel transitions.
4. Add account, delivery-address, and role-aware administration screens supported by
   the available permissions.
5. Validate responsive behavior, accessibility, error states, and production builds
   as each workflow is completed.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
