# Free Win Client

Cliente comunitario para coordinar Pedidos de cartas Yu-Gi-Oh!. Está construido con
Astro, Svelte y Tailwind, y consume el backend de Free Win.

## Configuración local

Requisitos: Node.js 22.12 o posterior, pnpm y el backend local disponible.

1. Copia `.env.example` como `.env` si necesitas cambiar la URL del backend.
2. Instala las dependencias con `pnpm install`.
3. Inicia el backend en `http://127.0.0.1:8000`.
4. Inicia el cliente con `astro dev --background`.

El cliente usa `PUBLIC_FREE_WIN_API_URL=http://127.0.0.1:8000` de forma
predeterminada.

## Comandos

| Comando | Propósito |
| --- | --- |
| `pnpm dev` | Inicia Astro en primer plano. Para trabajo automatizado usa `astro dev --background`. |
| `pnpm api:generate` | Regenera todos los tipos desde el OpenAPI local. |
| `pnpm check` | Valida TypeScript, Astro y Svelte. |
| `pnpm test` | Ejecuta las pruebas unitarias con Vitest. |
| `pnpm build` | Genera el servidor independiente de producción. |
| `pnpm start` | Ejecuta el servidor generado después de `pnpm build`. |

La generación OpenAPI requiere el backend, pero `check`, `test` y `build` usan el
contrato ya guardado y funcionan sin conectarse a él.

## Rutas de la primera fase

Las URL y los identificadores técnicos están en inglés; todo el texto enfocado en el
usuario está en español.

- `/`: resumen del flujo.
- `/order-periods` y `/order-periods/:id`: Pedidos y composición de una orden.
- `/orders` y `/orders/:id`: seguimiento y edición permitida de órdenes propias.
- `/admin/order-periods`: creación y administración de Pedidos.
- `/admin/orders` y `/admin/orders/:id`: revisión de cantidades y precios.

La autenticación todavía depende de la identidad temporal configurada por el
backend. Esta fase no agrega un flujo falso de inicio de sesión.

## Arquitectura

- `src/lib/api/generated.ts`: contrato completo generado; no editar manualmente.
- `src/lib/api/workflow.ts`: wrappers escritos a mano para Pedidos, órdenes y
  publicaciones de cartas.
- `src/components/workflow/`: islas Svelte con los flujos interactivos.
- `src/pages/`: páginas Astro y rutas en inglés.
- `src/styles/global.css`: base visual y patrones semánticos de Tailwind.

El backend conserva la autoridad sobre estados, transiciones, snapshots de cartas,
precios finales y totales.
