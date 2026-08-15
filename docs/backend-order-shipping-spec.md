# Envío fijo por Orden

Estado: implementado en el contrato del backend. `cardSubtotal` y `taxTotal` se
calculan únicamente en el cliente para presentar el desglose.

## Objetivo

El envío de una Orden es un costo fijo de USD 5. No depende de la cantidad de
copias ni del número de ítems. El backend debe almacenarlo en la Orden, sumarlo
una sola vez y devolver el desglose necesario para explicar el total.

## Problema del contrato anterior

El contrato anterior definía `shippingUnitPrice` dentro de
`OrderRequestItemPricingUpdate`. Según su descripción, representa la parte del
envío asignada a una copia. El servidor incluye ese importe en
`finalUnitPrice` y después multiplica el precio unitario por `agreedQuantity`.

Este modelo convierte un envío fijo de USD 5 en USD 5 por cada copia. Tampoco
puede prorratearse de forma fiable: una Orden con tres copias requeriría un valor
periódico de USD 1,666…, lo que introduce diferencias de redondeo.

### Referencias actuales

- [Swagger UI del backend](http://localhost:8000/docs)
- [Contrato OpenAPI](http://localhost:8000/openapi.json)
- [Endpoint actual de precios por ítem](http://localhost:8000/docs#/order-requests/updateOrderRequestItemPricing)
- [`OrderRequestItemPricingUpdate` generado](../src/lib/api/backend.generated.ts#L919)
- [`OrderRequestResponse` generado](../src/lib/api/backend.generated.ts#L1088)

## Modelo implementado

Añadir `shippingPrice` a la Orden.

| Propiedad | Valor |
| --- | --- |
| Nombre JSON | `shippingPrice` |
| Recurso | `OrderRequest` |
| Tipo interno recomendado | `Decimal` |
| Tipo de respuesta | `string \| null` |
| Moneda | La indicada por `OrderRequest.currency` |
| Precisión | Dos decimales |
| Mínimo | `0.00` |
| Valor sugerido al iniciar la revisión | `5.00` |

`shippingPrice` es el costo total del envío. Se aplica una sola vez y no se
multiplica por la cantidad acordada ni por el número de ítems.

Debe permanecer en `null` hasta que se establezca durante la revisión. El
organizador puede cambiarlo, incluso a `0.00`.

## Endpoint para actualizar el envío

El backend expone una operación específica para los precios de la Orden:

```http
PATCH /order-requests/{order_request_id}/pricing
Content-Type: application/json
```

La operación requiere el permiso `order_requests.review` y solo puede ejecutarse
cuando la Orden está en estado `in_review`.

### Request body

```json
{
  "shippingPrice": "5.00"
}
```

### Esquema OpenAPI

```yaml
OrderRequestPricingUpdate:
  type: object
  required:
    - shippingPrice
  properties:
    shippingPrice:
      description: >
        Costo total de envío de la Orden. Se aplica una sola vez,
        independientemente del número de ítems o copias.
      oneOf:
        - type: string
          pattern: '^\d+(\.\d{1,2})?$'
        - type: number
          minimum: 0
          multipleOf: 0.01
      examples:
        - "5.00"
```

### Respuestas esperadas

| Estado | Significado |
| --- | --- |
| `200` | Devuelve la Orden actualizada. |
| `401` | No existe una identidad autenticada válida. |
| `403` | La identidad no posee `order_requests.review`. |
| `404` | La Orden no existe o no es visible. |
| `409` | La Orden no está en revisión. |
| `422` | El importe es negativo, inválido o tiene más de dos decimales. |

## Cambio en los precios por ítem

Mantener el endpoint actual:

```http
PATCH /order-requests/{order_request_id}/items/{item_id}/pricing
```

`shippingUnitPrice` fue eliminado de `OrderRequestItemPricingUpdate` y ya no
participa en los cálculos nuevos.

El request body del ítem queda así:

```json
{
  "cardUnitPrice": "0.79",
  "taxUnitPrice": "0.13"
}
```

### Esquema del ítem

```yaml
OrderRequestItemPricingUpdate:
  type: object
  required:
    - cardUnitPrice
    - taxUnitPrice
  properties:
    cardUnitPrice:
      description: Precio definitivo de una copia de la carta, en USD.
      type: string
      pattern: '^\d+(\.\d{1,2})?$'
      example: "0.79"
    taxUnitPrice:
      description: Impuesto correspondiente a una copia, en USD.
      type: string
      pattern: '^\d+(\.\d{1,2})?$'
      example: "0.13"
```

## Respuesta de la Orden

El backend añade `shippingPrice` y mantiene `agreedTotal` como total
autoritativo:

```yaml
shippingPrice:
  type:
    - string
    - "null"
  description: Costo total de envío aplicado una sola vez.
  example: "5.00"

agreedTotal:
  type:
    - string
    - "null"
  readOnly: true
  description: Total definitivo de cartas, impuestos y envío.
  example: "7.76"
```

`cardSubtotal` y `taxTotal` no forman parte de la respuesta. El cliente los
calcula para mostrar el desglose, usando los precios y cantidades devueltos por
el backend. `agreedTotal` sigue siendo la cifra definitiva.

En `OrderRequestItemResponse`:

- Eliminar o marcar como obsoleto `shippingUnitPrice`.
- Calcular `finalUnitPrice` como `cardUnitPrice + taxUnitPrice`.
- Calcular `agreedTotal` como `finalUnitPrice × agreedQuantity`.

## Fórmulas

Para cada ítem activo:

```text
cardTotal = cardUnitPrice × agreedQuantity
itemTaxTotal = taxUnitPrice × agreedQuantity
item.agreedTotal = cardTotal + itemTaxTotal
```

Para la Orden:

```text
cardSubtotal = Σ(cardUnitPrice × agreedQuantity)
taxTotal = Σ(taxUnitPrice × agreedQuantity)
agreedTotal = cardSubtotal + taxTotal + shippingPrice
```

Los ítems retirados no participan en los subtotales. El envío se suma una sola
vez si existe al menos un ítem activo con `agreedQuantity > 0`.

## Ejemplo completo

Para tres copias de una carta con precio unitario de USD 0,79:

```text
Cartas:   USD 0,79 × 3 = USD 2,37
Impuesto: USD 0,13 × 3 = USD 0,39
Envío:                   USD 5,00
Total:                   USD 7,76
```

Respuesta esperada:

```json
{
  "id": 41,
  "orderPeriodId": 12,
  "createdByUserId": 7,
  "status": "in_review",
  "currency": "USD",
  "shippingPrice": "5.00",
  "agreedTotal": "7.76",
  "items": [
    {
      "id": 93,
      "cardListingId": 145,
      "cardName": "Dark Magician - Duelist Pack Yugi",
      "requestedQuantity": 3,
      "agreedQuantity": 3,
      "cardUnitPrice": "0.79",
      "taxUnitPrice": "0.13",
      "finalUnitPrice": "0.92",
      "agreedTotal": "2.76"
    }
  ]
}
```

## Reglas de negocio

- Usar `Decimal` para todos los importes y cálculos monetarios.
- Redondear el impuesto unitario a dos decimales con `ROUND_HALF_UP`.
- No multiplicar `shippingPrice` por cantidades ni por ítems.
- Excluir los ítems retirados de `cardSubtotal` y `taxTotal`.
- No permitir aceptar una Orden si falta `shippingPrice` o algún precio requerido.
- Registrar los cambios de `shippingPrice` en el historial de la Orden.
- Mantener una sola fuente de verdad para el envío.

## Migración de datos

Para conservar el total de envío de Órdenes existentes:

```text
shippingPrice = Σ(shippingUnitPrice × agreedQuantity)
```

Las Órdenes aceptadas deben conservar sus importes históricos. Para Órdenes
abiertas o en revisión, `shippingUnitPrice` deja de usarse después de la
migración.

## Criterios de aceptación

1. Tres copias de una carta no multiplican el envío fijo de USD 5.
2. Una Orden con varios ítems suma `shippingPrice` una sola vez.
3. Cambiar `agreedQuantity` modifica los subtotales de carta e impuesto, pero no
   modifica `shippingPrice`.
4. Retirar un ítem lo excluye de `cardSubtotal` y `taxTotal`.
5. El backend devuelve `shippingPrice` y `agreedTotal`; el cliente muestra
   `cardSubtotal` y `taxTotal` como valores derivados.
6. Los importes negativos o con más de dos decimales producen `422`.
7. Actualizar el envío fuera de `in_review` produce `409`.
8. Los cambios de envío aparecen en el historial de la Orden.

## Integración del cliente

Cuando el backend publique el nuevo contrato, regenerar los tipos con:

```sh
pnpm api:generate:backend
```

El cliente mantiene el campo de envío fuera de los ítems, lo envía mediante el
endpoint de precios de la Orden y calcula visualmente los subtotales de cartas e
impuestos. Los valores persistidos y `agreedTotal` provienen del servidor.
