# Conexión del admin a m3b-api — Diseño

Fecha: 2026-10-21 · Estado: para aprobación

## 1. Intención

Hoy el admin (`m-3-b-admin`) funciona entero contra datos semilla en `localStorage` (`src/lib/store.tsx` + `src/lib/data.ts`). El backend real (`../m3b-api`, Spring Boot) ya expone los slices 1–3 (auth, catálogo, stock, proveedores, clientes, cobros, medios de pago, cuentas, ventas, gastos).

Objetivo: **conectar el admin a todo lo que la API ya ofrece, para probar esos endpoints usando la interfaz real.** El admin pasa a ser el cliente de prueba de la API.

## 2. Metas, no-metas, anti-metas

**Metas**
- Cada pantalla cuyo dominio exista en la API lee y escribe **solo** contra la API.
- Login real (JWT) y sesión.
- Los errores de la API se ven en pantalla con el `message` del backend (y el `field` si viene), para poder diagnosticar.
- Las pantallas se adaptan a cómo trabaja la API (decisión del contrato §4 "Frontend changes implied").

**No-metas**
- Reportes (`/reports/*`), conciliación de cuentas, `/settings`, promociones, órdenes de compra en borrador, gestión de usuarios: la API todavía no los tiene. Esas zonas muestran un estado "Pendiente de API", no datos inventados.
- Rediseño visual. Se conserva el look actual (Tailwind, hex hardcodeados, Sora/Inter).
- Cambios en el backend. Si algo falta o no encaja, se anota como hallazgo para la API, no se parchea en el front.

**Anti-metas (sería un fracaso aunque "funcione")**
- Fallback silencioso a `localStorage` o a datos semilla cuando la API falla: oculta justo lo que se quiere probar.
- Recalcular en el navegador lo que la API ya calcula (stock, estado, saldos, deuda, totales de venta, recargos): el front muestra lo que devuelve el servidor. Única excepción: el total **estimado** de "Nueva venta" antes de confirmar (D8).
- Referenciar entidades por nombre en lugar de por id.

## 3. Restricciones

- **Export estático, solo cliente** (`output: "export"`). Todo el acceso a la API es `fetch` desde el navegador. Sin server actions ni route handlers.
- **Sin nuevas dependencias** salvo necesidad real. No se agrega React Query/SWR: un hook propio pequeño alcanza.
- API (ver `../m3b-api/docs/superpowers/specs/2026-10-12-api-contract-design.md`):
  - Base `http://localhost:8080/api`. CORS por defecto permite `http://localhost:3000`.
  - Auth: `POST /auth/login` → `{accessToken, expiresAt, user}`; todo lo demás con `Authorization: Bearer`. 401 sin `WWW-Authenticate`.
  - Respuesta simple: `{start, length, total, data}`. Listas: `{..., nextCursor, prevCursor, data: []}`. DELETE → 204. POST → 201.
  - Paginación **solo por cursor** (`length` 1..200, `cursor`, `before`, `sortBy`, `sortDir`, `search`, `filter` = base64 de JSON `{combinator, filters:[{field, operator, value}]}`).
  - Errores `{message, status, timestamp, field?, details?}`; 400/401/404/409/422/500.
  - IDs enteros. Instantes ISO UTC (`soldAt`, `paidAt`, `movedAt`, `createdAt`); fechas `YYYY-MM-DD` (`incurredOn`, `dueDate`). Dinero: número con ≤ 2 decimales (más decimales = 400). Enums en MAYÚSCULAS.
- No hay framework de tests en el admin. `npm run build` es el chequeo de tipos.

## 4. Decisiones tomadas

Del usuario:
- **D1. Solo API.** Sin interruptor ni fallback a datos locales.
- **D2. Login real** con token en `sessionStorage`; cualquier 401 → `/login`.
- **D3. Lo que la API no tiene → "Pendiente de API"**, sin datos falsos.
- **D4. Es un proyecto**: diseño → plan → implementación.
- **D8. Total estimado en "Nueva venta".** Antes de confirmar, el navegador calcula y muestra un total estimado (subtotal, descuento, recargo de tarjeta por `surchargePct`, restante a repartir entre medios de pago), rotulado "estimado". Un descuento en % se convierte a monto en el navegador, porque `DISCOUNT` solo acepta monto. Tras el `POST /sales` se muestran las cifras del servidor (`grossTotal`, `adjustmentTotal`, `totalDue`, `totalPaid`, `outstanding`); si difieren del estimado, se ve la diferencia (también es una prueba). La falta de un endpoint de cotización queda anotada como hallazgo para el backend.
- **D9. Rama aparte.** Todo el trabajo va en una rama de feature; `main` (y por lo tanto GitHub Pages) no se toca hasta que la API esté desplegada. Al unir a `main` habrá que configurar la variable de repositorio `NEXT_PUBLIC_API_URL` (y `APP_CORS_ORIGINS` en la API con el dominio de Pages); eso queda fuera de este proyecto.

Mías (marcadas para revisión):
- **D5. Adaptar pantallas a la API**, no capa de traducción que imite el modelo viejo. El modelo viejo (`Sale.clientName`, `Product.category: string`, `Expense.type: "Ingreso"`) no se puede mapear sin inventar datos.
- **D6. `store.tsx`, `data.ts` y los tipos viejos se eliminan** al terminar la migración (y con ellos `DATA_VERSION` y las claves `mates_admin_*`). Mientras dure la migración conviven: una pantalla ya migrada no lee del store.
- **D7. Sin capa de caché global.** Cada pantalla pide lo suyo al montar y vuelve a pedir después de una escritura. Para pruebas es lo más transparente: lo que ves es lo que respondió la API.

## 5. Arquitectura

### 5.1 Cliente HTTP (`src/lib/api.ts`, se reescribe el existente)
- Inyecta `Authorization: Bearer <token>` desde `sessionStorage`.
- `ApiError` con `status`, `message`, `field`, `details` parseados del cuerpo de error del backend.
- En 401 (salvo en `/auth/login`): borra la sesión y redirige a `/login` (respetando `basePath`).
- Desenvuelve las respuestas: `getOne` → `data`; `getPage` → `{items, nextCursor, prevCursor}`.
- Helper `encodeFilter(filters)` → base64 del JSON del contrato.
- Helper `getAll(path, params)` para dropdowns: pide `length=200` y sigue `nextCursor` hasta el final.
- `env.apiUrl` por defecto pasa a `http://localhost:8080/api` (hoy cae en el puerto 8000, que es incorrecto); actualizar `.env.example` y el fallback de `.github/workflows/deploy.yml`.

### 5.2 Tipos (`src/lib/apiTypes.ts`)
Interfaces que reflejan los DTO de la API 1:1 (ProductView, VariantView, StockRow, Movement, SupplierView, CustomerView, AccountRow, PaymentView, PaymentMethod, FinancialAccount, SaleResponse, ExpenseCategory, ExpenseRow, ExpenseView, ExpenseSummary, ErrorResponse, Page<T>) y los enums como uniones de strings. Más un mapa `labels` enum → texto en español para la UI (ej. `LOW` → "Bajo stock", `CASH` → "Efectivo").

### 5.3 Sesión
- `src/lib/auth.ts`: `login(email, password)`, `logout()`, `getToken()`; guarda token, `expiresAt` y `user` en `sessionStorage`.
- `/login`: formulario real, muestra el error del backend en 401.
- `(admin)/layout.tsx`: reemplaza `StoreProvider` por un guard que, sin token o con token vencido, redirige a `/login`; con token, llama a `/auth/me` una vez y deja el usuario disponible (contexto mínimo) para el Topbar/Sidebar.
- "Cerrar sesión" del Sidebar llama a `logout()`.

### 5.4 Lectura de datos en pantallas
- Hook `usePagedList(path, {sortBy, sortDir, search, filters, length})` → `{items, loading, error, next(), prev(), hasNext, hasPrev, reload()}`. Cambiar búsqueda/filtros/orden reinicia al primer página.
- Hook `useApiResource(fn, deps)` para lecturas simples (`GET /x/{id}`, resúmenes) → `{data, loading, error, reload}`.
- Búsqueda y filtros pasan a ser **del lado del servidor** (`search` + `filter`), porque con paginación el filtrado local sería sobre una sola página. `FilterPanel` se mantiene como UI; cada pantalla traduce sus valores a criterios del contrato (ej. rango de fechas → `GREATER_OR_EQUAL` / `LESS_THAN` sobre `soldAt`).
- La paginación por número de página se reemplaza por "Anterior / Siguiente".

### 5.5 Errores
- Un componente `ApiErrorBanner` (o toast) en `components/ui` que muestra `message` (+ `field`, + `status`). Lecturas fallidas muestran el banner en lugar de la tabla; escrituras fallidas lo muestran dentro del modal sin cerrarlo.
- Los 409 con `details` (ej. "Product still has stock") muestran el mensaje tal cual: el texto viene del backend en inglés y así queda (son pruebas).

## 6. Mapa pantalla → API

| Pantalla | Endpoints | Cambios de comportamiento |
|---|---|---|
| `/login` | `POST /auth/login` | Login real. Se quitan credenciales precargadas. |
| `/productos` | `GET/POST/PATCH/DELETE /products`, `POST /products/{id}/variants`, `PATCH/DELETE /variants/{id}`, `GET /variants/{id}/cost-history`, dropdowns de `/product-categories` y `/suppliers` | Categoría y proveedor por id. Alta simple (sku, price, cost, initialStock) o con variantes, no ambas. `onHand`/`status` vienen del servidor. Se puede ver el historial de costo de una variante. Activar/desactivar con `active`. |
| `/stock` | `GET /stock`, `/stock/summary`, `/stock/movements`, `POST /stock/restocks`, `POST /stock/adjustments` | Reposición manda `unitCost` (no `listPrice`), `expenseCategoryId` obligatorio, opcional cuotas y `payFirstNow`. Nuevo: ajuste/merma (`DAMAGE`/`ADJUSTMENT`, motivo obligatorio). Los KPI salen de `/stock/summary`. |
| `/proveedores` | CRUD `/suppliers` | Se agregan `type` y `active`. `productCount` y `lastActivityOn` del servidor. |
| `/clientes` | `GET/POST/PATCH/DELETE /customers` | `name` → `firstName`/`lastName`. Totales y deuda (`outstanding`) del servidor. |
| `/clientes/detalle?id=` | `GET /customers/{id}`, `GET /customers/{id}/account`, `POST /customers/{id}/payments`, `GET /sales?filter=customerId`, `DELETE /payments/{id}` | La cuenta corriente sale de `/account` (con saldo corrido). Cobro: FIFO o a una venta (`saleId`), con medio de pago por id. "Saldar todo" = cobro por `outstanding`. Anular cobro. |
| `/ventas` | `GET /sales`, `GET /sales/{id}`, `PATCH /sales/{id}` (notas), `POST /sales/{id}/cancel` | **Editar ítems desaparece**: se cancela y se registra de nuevo. Eliminar → Cancelar. Estado = `paymentStatus`. |
| `/ventas/nueva` | `POST /sales`, `GET /variants/lookup?code=`, dropdowns `/products`, `/customers`, `/payment-methods` | Líneas por `variantId`. Descuentos como `adjustments: DISCOUNT`. Pagos en partes `payments[]`; el recargo de tarjeta lo calcula el servidor. Venta sin cliente debe pagarse completa. `type` = enum `SaleType`. Alta rápida de cliente vía `POST /customers`. |
| `/gastos` | `GET /expenses`, `GET/POST/PATCH/DELETE /expenses/{id}`, `GET /expenses/summary`, `POST /expenses/{id}/installments/{no}/payments`, `DELETE /expense-payments/{id}` | **Se elimina la división Ingreso/Egreso**: es solo gastos. Monto y cuotas no se editan una vez creados. Pago de cuota con medio/cuenta por id. |
| `/gastos/ingresos`, `/gastos/egresos` | — | **Se eliminan** (y sus links del Sidebar). |
| `/gastos/categorias`, `/configuracion/gastos` | CRUD `/expense-categories` | Se agregan `isBusiness`, `isCapex`. "Tipos de gasto" pasa a ser el enum fijo `FIXED/VARIABLE` (sin ABM). |
| `/configuracion/producto` | CRUD `/product-categories` | Por id; `productCount` del servidor. |
| `/configuracion/venta` | CRUD `/payment-methods`, CRUD `/financial-accounts` | "Tipos de venta" pasa a ser el enum fijo `SaleType` (sin ABM). La página gestiona medios de pago (con recargo % y cuenta por defecto) y cuentas. |
| `/configuracion` (general) | — | Pendiente de API (`/settings`). |
| `/dashboard` | `GET /sales` (recientes), `GET /stock?filter=status IN (LOW,OUT)`, `GET /stock/summary` | KPIs financieros, gráfico de balance y donut por categoría: Pendiente de API (`/reports/*`). |
| Notificaciones (Topbar) | `GET /stock` (LOW/OUT), `GET /expenses?filter=status=OVERDUE` | Hasta que exista `/reports/alerts`, se arma con esas dos lecturas. Estado leído/no leído sigue local (el contrato lo deja fuera). |

## 7. Orden de trabajo sugerido

Cada etapa deja el admin compilando y probable contra la API local.

1. **Base**: `api.ts`, `apiTypes.ts`, `auth.ts`, hooks, `ApiErrorBanner`, login, guard del layout, `.env.example`.
2. **Configuración de catálogo**: categorías de producto, proveedores.
3. **Productos y stock** (incluye reposición, ajustes, movimientos, historial de costo).
4. **Configuración de cobros**: cuentas financieras, medios de pago.
5. **Clientes** (lista, detalle, cuenta corriente, cobros).
6. **Ventas** (lista, cancelar, notas, nueva venta).
7. **Gastos** (categorías, gastos, cuotas, resumen) y eliminación de Ingreso/Egreso.
8. **Dashboard y notificaciones** con lo disponible + "Pendiente de API".
9. **Limpieza**: borrar `store.tsx`, `data.ts`, tipos viejos; actualizar `CLAUDE.md` del admin.

## 8. Cómo se prueba

- API local corriendo (`./mvnw spring-boot:run` en `m3b-api`, con Postgres y `APP_CORS_ORIGINS=http://localhost:3000`) y `npm run dev`.
- Por etapa: recorrer cada acción de la pantalla (listar, buscar, filtrar, paginar, crear, editar, borrar, casos de error conocidos: 409 por stock, 422 por id inválido, venta sin cliente sin pagar) y confirmar contra la respuesta en DevTools o Swagger (`/swagger-ui.html`).
- `npm run build` y `npm run lint` limpios al cerrar cada etapa.
- Lo que no encaje con la API se anota como hallazgo para el backend.

## 9. Abierto / a cargo de quien implemente

- Forma exacta de los hooks y del banner de error.
- Qué columnas son ordenables en cada tabla (usar las marcadas **S** en el contrato §4).
- Textos en español de los enums.
- Formato de instantes UTC a hora local (extender `dateUtils.ts`).
