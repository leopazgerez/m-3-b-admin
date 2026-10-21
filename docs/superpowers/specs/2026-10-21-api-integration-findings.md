# Hallazgos de la integración del admin con la API

Documento para el dueño de m3b-api. Lista lo que no encajó entre el admin (ya migrado a la API) y el backend, ordenado por impacto. Cada punto dice qué pasa, dónde se vio en el admin, qué impacto tiene y qué se sugiere cambiar en la API.

## 1. Descuentos positivos se aceptan y suben el total

- **Qué pasa:** `Sale.register` valida solo que el tipo de ajuste sea `DISCOUNT`, no que el monto sea negativo. Un `DISCOUNT` con monto positivo se guarda y aumenta el total de la venta. El admin envía descuentos negativos, pero la API no lo exige.
- **Dónde se vio:** Nueva venta, campo de descuento (el admin envía `amount: -descuento`, decisión R8).
- **Impacto:** un cliente de la API (otro frontend, script, error del propio admin) puede cobrar más de lo debido sin error.
- **Sugerencia:** rechazar `DISCOUNT` con `amount > 0` con 400 `field=adjustments[i].amount`.

## 2. No hay endpoint de cotización de venta

- **Qué pasa:** Nueva venta calcula el total estimado en el cliente (`estimateSale`, decisión D8). Es la única excepción a la regla de no recalcular lo que devuelve la API, y puede divergir del total que devuelve el servidor (recargos por tarjeta, redondeos).
- **Dónde se vio:** Nueva venta, resumen antes de confirmar.
- **Impacto:** el total mostrado puede no coincidir con el total guardado; hay lógica de negocio duplicada en el front.
- **Sugerencia:** `POST /sales/quote` con el mismo cuerpo que una venta, que devuelva `grossTotal`, `adjustmentTotal`, `totalDue` y `surcharges` sin persistir.

## 3. Los endpoints de stock no muestran variantes inactivas

- **Qué pasa:** `GET /stock` devuelve solo variantes activas de productos activos. El admin no puede ajustar stock de variantes inactivas, aunque `POST /stock/adjustments` sí lo permite. Las líneas de venta de variantes inactivas o borradas se muestran como "Variante #id".
- **Dónde se vio:** Existencias (selector de variante para ajustes, decisión R6); detalle de venta en Clientes y Ventas (nombres de línea).
- **Impacto:** no se puede corregir stock de variantes inactivas desde la UI; nombres incompletos en el historial.
- **Sugerencia:** parámetro `includeInactive` en `GET /stock`, o un endpoint de variantes por lista de ids.

## 4. Las cuotas de gastos no se pueden reprogramar

- **Qué pasa:** `ExpenseService.update` solo lee `categoryId`, `kind`, `supplierId`, `description`, `incurredOn` y `notes`. Ignora `firstDueDate`, así que no hay forma de cambiar el vencimiento de las cuotas después de crear el gasto.
- **Dónde se vio:** Gastos, editar gasto (el campo no se ofrece, decisión R10).
- **Impacto:** un vencimiento mal cargado no se puede corregir; hay que borrar y recrear el gasto.
- **Sugerencia:** aceptar `firstDueDate` en el PATCH (regenerando las cuotas pendientes) o un endpoint para reprogramar cuotas.

## 5. Las líneas de venta no traen nombre de producto

- **Qué pasa:** las líneas de venta solo traen `variantId`. Cada detalle de venta necesita una consulta extra para mostrar el nombre.
- **Dónde se vio:** detalle de cliente (Clientes > detalle, las ventas se muestran como "Venta #id", decisión R7).
- **Impacto:** más llamadas al abrir un detalle y nombres ausentes si la variante cambió o se borró.
- **Sugerencia:** guardar un snapshot de nombre de producto y variante en cada línea.

## 6. La lista de gastos no trae la próxima fecha de vencimiento

- **Qué pasa:** `ExpenseRow` no tiene la próxima cuota vencida. Las notificaciones de gastos vencidos muestran `incurredOn` en lugar de la `dueDate` de la cuota vencida.
- **Dónde se vio:** Notificaciones (popover de la campana del topbar).
- **Impacto:** la fecha de vencimiento mostrada es incorrecta.
- **Sugerencia:** agregar `nextDueDate` a `ExpenseRow`, o usar `/reports/alerts` (slice 4).

## 7. Los gastos no se pueden vincular a su reposición

- **Qué pasa:** `restockId` del gasto es un id de orden de compra, pero no hay endpoint ni filtro para listar reposiciones por `purchaseOrderId`. `stock/movements` tiene ese campo como filtro; hay que confirmarlo.
- **Dónde se vio:** Gastos, detalle del gasto ("Ver reposición" lleva a `/stock` sin filtrar, decisión R10).
- **Impacto:** el enlace de la reposición no lleva al registro correcto.
- **Sugerencia:** exponer `GET /restocks?purchaseOrderId=` o documentar el filtro de movimientos y enlazar a él.

## 8. Proveedores no tiene conteos agregados

- **Qué pasa:** no hay endpoint de totales por proveedor (cantidad, categorías, con productos).
- **Dónde se vio:** Proveedores, barra de estadísticas (se quitó, decisión R4).
- **Impacto:** el usuario pierde los contadores de resumen; calcularlos sobre páginas parciales daría cifras incorrectas.
- **Sugerencia:** `GET /suppliers/summary` o incluir `totals` en la respuesta de la lista.

## 9. El tipo de proveedor no se puede borrar

- **Qué pasa:** una vez asignado, el tipo no se puede quitar. `PATCH` con `null` lo conserva y `""` no se acepta para el enum.
- **Dónde se vio:** Proveedores, editar proveedor (opción "Sin tipo" se ignora).
- **Impacto:** el usuario no puede dejar un proveedor sin tipo.
- **Sugerencia:** aceptar `null` explícito en el PATCH como "borrar", o agregar un valor "NONE" al enum.

## 10. Endpoints de reportes y configuración pendientes (slice 4)

- **Qué pasa:** `/reports/summary`, `/reports/monthly-balance`, `/reports/sales-by-category`, `/reports/alerts` y `/settings` no existen todavía.
- **Dónde se vio:** Dashboard (KPIs y gráficos) y Configuración muestran "Pendiente de API".
- **Impacto:** esas pantallas no tienen datos reales.
- **Sugerencia:** implementar el slice 4 según el contrato.

## Recorrido end-to-end pendiente

El Paso 1 de la Tarea 18 no se ejecutó porque la API no estaba corriendo (ruling R1 y R12). Hay que correrlo a mano con la base vacía de datos de negocio (solo seeds). Pasos, textuales del plan (`docs/superpowers/plans/2026-10-21-api-integration.md`, Tarea 18):

> Con la base vacía de datos de negocio (solo seeds), recorrer de punta a punta: login → categoría → proveedor → producto con variantes → reposición en cuotas → cliente → venta con pago parcial con tarjeta → cobro FIFO → cancelar otra venta → gasto y pago de cuota → dashboard y notificaciones → logout.

Cualquier fallo nuevo que aparezca en ese recorrido se suma a esta lista.
