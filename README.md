# Free Win Client

Astro, Svelte, and Tailwind client for the Free Win community card-order workflow.

## Setup

1. Copy `.env.example` to `.env` and adjust `PUBLIC_FREE_WIN_API_URL` if needed.
2. Install dependencies with `pnpm install`.
3. Start the development server with `astro dev --background`.

The local backend defaults to `http://127.0.0.1:8000`; its contract is available at
`/openapi.json`.

## Project structure

- `src/config/`: runtime configuration.
- `src/lib/api/`: typed API client and transport-level models.
- `src/components/`: reusable Astro and Svelte components.
- `src/pages/`: route entry points.
- `src/styles/`: global Tailwind styles.

---

# Astro Starter Kit: Minimal

```sh
pnpm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
