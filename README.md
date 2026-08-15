# Free Win Client

Cliente comunitario para coordinar Pedidos de cartas Yu-Gi-Oh!. Está construido con
Astro, Svelte y Tailwind, y consume el backend y el buscador de Free Win.

## Configuración local

Requisitos: Node.js 22.12 o posterior, pnpm, el backend y el buscador local disponibles.

1. Copia `.env.example` como `.env` si necesitas cambiar las URL de los servicios.
2. Instala las dependencias con `pnpm install`.
3. Inicia el backend en `http://127.0.0.1:8000` y el buscador en `http://127.0.0.1:8001`.
4. Inicia el cliente con `astro dev --background`.

El cliente usa `PUBLIC_FREE_WIN_API_URL=http://127.0.0.1:8000` y
`PUBLIC_FREE_WIN_SEARCH_URL=http://127.0.0.1:8001` de forma predeterminada.

## Comandos

| Comando | Propósito |
| --- | --- |
| `pnpm dev` | Inicia Astro en primer plano. Para trabajo automatizado usa `astro dev --background`. |
| `pnpm api:generate` | Regenera los contratos del backend y del buscador. |
| `pnpm api:generate:backend` | Regenera los tipos desde el backend local. |
| `pnpm api:generate:search` | Regenera los tipos desde el buscador local. |
| `pnpm check` | Valida TypeScript, Astro y Svelte. |
| `pnpm test` | Ejecuta las pruebas unitarias con Vitest. |
| `pnpm build` | Genera el servidor independiente de producción. |
| `pnpm start` | Ejecuta el servidor generado después de `pnpm build`. |

La generación OpenAPI requiere ambos servicios, pero `check`, `test` y `build` usan
los contratos ya guardados y funcionan sin conectarse a ellos.

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

- `src/lib/api/backend.generated.ts`: contrato generado del backend; no editar manualmente.
- `src/lib/api/search.generated.ts`: contrato generado del buscador; no editar manualmente.
- `src/lib/api/workflow.ts`: wrappers escritos a mano para Pedidos y órdenes.
- `src/lib/api/search.ts`: búsqueda de publicaciones y seguimiento de trabajos externos.
- `src/components/workflow/`: islas Svelte con los flujos interactivos.
- `src/pages/`: páginas Astro y rutas en inglés.
- `src/styles/global.css`: base visual y patrones semánticos de Tailwind.

El backend conserva la autoridad sobre estados, transiciones, snapshots de cartas,
precios finales y totales.

## Validación manual de la integración

1. Busca una carta ya guardada y confirma que los resultados aparecen inmediatamente.
2. Busca una carta ausente y confirma los estados del trabajo externo hasta ver resultados.
3. Añade una publicación persistida, envía la Orden y confirma que el backend reconoce
   el `cardListingId` producido por el buscador.
