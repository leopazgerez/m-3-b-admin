# Asistente de IA y guía de usuario — diseño

Fecha: 2026-11-05. Backend: `m-3-b-api`, rama `feat/ai-assistant`.

## Intención

El backend ya sirve dos asistentes:

- un **chat de datos** con historial, que responde sobre el negocio;
- una **guía de usuario** sin historial, que responde a partir de un manual cargado en PDF.

En ambos casos, el POST devuelve 202 con un `requestId` y la respuesta llega en pedazos por un WebSocket global. Este trabajo conecta el admin a ese flujo:

- cliente HTTP, cliente WebSocket, tipos, estado y hooks;
- la estructura mínima de pantallas para usarlo de punta a punta.

El diseño visual lo define el usuario después y se aplica sobre esta estructura. Por eso las pantallas llevan estilos mínimos, con los colores hex que ya usa el admin, y sin decisiones de diseño propias.

El WebSocket es la base para eventos futuros, por ejemplo notificaciones. Tiene que poder sumar un `type` nuevo sin tocar la conexión.

## Objetivos

- Un cliente de API tipado para los endpoints de chats y de guía.
- Un módulo WebSocket con:
  - una sola conexión por pestaña;
  - auth por mensaje;
  - reconexión con backoff;
  - manejo del cierre 1008;
  - un dispatcher por `type`.
- Hooks: `useChats`, `useChat(id)`, `useGuideAsk` y `useGuideSections`.
- La pestaña flotante del asistente (desktop/tablet) y el botón flotante (mobile).
- Una sección nueva en Configuración para administrar el manual.
- Tests `node:test` de la lógica pura: armado por `delta`, correlación por `requestId`, `error` y 1008.

## No objetivos

- Diseño visual final. El usuario lo describe aparte.
- Refresh de token. No existe en el backend ni en el admin: la sesión es un JWT en `sessionStorage` con `expiresAt`.
- Renderizar Markdown en las respuestas. Se muestran como texto plano con `whitespace-pre-wrap`. Se puede sumar cuando se defina el diseño.
- Enviar al socket cualquier mensaje que no sea el `auth`.

## Anti-objetivos

- El token en la URL del socket. Va solo en el mensaje `auth`.
- Reconectar con el mismo token después de un 1008.
- Inventar o guardar localmente respuestas o historial. Lo persistido se lee siempre por HTTP, como en el resto del admin (ver CLAUDE.md: no se usan datos cacheados o locales).
- Permitir una segunda pregunta en el mismo chat, o en la guía, mientras hay una respuesta en curso.

## Contrato del backend (resumen)

Envelopes y errores son los de siempre: `{data}`, la página por cursor y `{message, status, field?, details?}`. Ya los maneja [src/lib/api.ts](../../../src/lib/api.ts) con `ApiError`.

**Tipos:**

```ts
type ChatSummary = { id: number; title: string | null; createdAt: string; updatedAt: string };
type MessageView = { id: number; role: "USER" | "ASSISTANT"; content: string; createdAt: string };
type ChatView = { id: number; title: string | null; createdAt: string; messages: MessageView[] };
type GuideSectionView = { id: number; name: string; characters: number; updatedAt: string; content: string | null };
type AskAccepted = { requestId: string };

type AssistantDelta = { source: "chat" | "guide"; requestId: string; chatId: number | null; text: string };
type AssistantDone  = { source: "chat" | "guide"; requestId: string; chatId: number | null; messageId: number | null; sections: string[] };
type AssistantError = { source: "chat" | "guide"; requestId: string; chatId: number | null; message: string };
```

**Endpoints** (relativos a `env.apiUrl`, que ya incluye `/api`):

| Método y ruta | Body | Respuesta |
|---|---|---|
| `POST /chats` | — | 201 `ChatSummary` |
| `GET /chats` | `length, cursor, before, search` | página de `ChatSummary`, `updatedAt` desc |
| `GET /chats/{id}` | — | `ChatView` |
| `DELETE /chats/{id}` | — | 204 |
| `POST /chats/{id}/messages` | `{question}` (≤ 2000) | 202 `AskAccepted` |
| `POST /guide/ask` | `{question}` | 202 `AskAccepted` |
| `GET /guide/sections` | — | `GuideSectionView[]` sin `content`, por nombre |
| `GET /guide/sections/{id}` | — | `GuideSectionView` con `content` |
| `POST /guide/sections` | multipart `name` (≤ 120) + `file` (PDF) | 201 `GuideSectionView` |
| `PUT /guide/sections/{id}` | multipart `name` y/o `file` | `GuideSectionView` |
| `DELETE /guide/sections/{id}` | — | 204 |

**Errores relevantes:**

- 409 con `field: "name"`: nombre repetido.
- 400 con `field: "file"`: el archivo no es PDF, o es un PDF sin texto.
- 503 al preguntar: el asistente está apagado u ocupado.
- Límite de 10 MB por archivo.

**Socket:**

- URL: `env.apiUrl` con el esquema `http`→`ws` / `https`→`wss` y el path `/api` reemplazado por `/ws`. Por ejemplo, `http://localhost:8080/api` → `ws://localhost:8080/ws`.
- Primer mensaje del cliente: `{"type":"auth","token":"..."}`. El servidor responde `{"type":"auth.ok","payload":{}}`.
- El servidor cierra con 1008 cuando no hay auth en 5 s, cuando el token es inválido o cuando vence.
- Todos los mensajes del servidor son `{type, payload}`.
- Eventos del asistente: `assistant.delta`, `assistant.done` y `assistant.error`.
- Los eventos llegan a todas las pestañas del usuario.

## Decisiones

### Cliente HTTP

- Se extiende [src/lib/api.ts](../../../src/lib/api.ts) para aceptar `FormData`. Si el body es `FormData`, no se pone `Content-Type` (lo arma el navegador) ni se pasa por `JSON.stringify`. Se agregan `api.postForm` y `api.putForm`, o bien se detecta `FormData` dentro de `post`/`put` (queda a criterio del builder). Se mantienen el toast, el loader y el manejo del 401.
- Un módulo `src/lib/assistantApi.ts` tipado, con una función por endpoint, sobre `api.*`.
- Las preguntas usan `notify: { silent: true }`: el error, incluido el 503, se muestra dentro del panel del asistente y no como toast. Las acciones de Configuración usan el toast normal, con `success`.
- Validaciones en el cliente, antes de llamar a la API:
  - pregunta no vacía y de hasta 2000 caracteres;
  - nombre de sección no vacío y de hasta 120 caracteres;
  - archivo de hasta 10 MB.

  Las tres dan un error en el campo, sin request.

### WebSocket (`src/lib/socket.ts`)

- Un singleton de módulo con estado plano y `subscribe`, el mismo patrón que [src/lib/feedback.ts](../../../src/lib/feedback.ts). Expone:
  - `on(type, handler) → off`: el dispatcher;
  - `status()`: `"idle" | "connecting" | "open" | "closed"`;
  - `start()` y `stop()`;
  - un evento "reconectado", que emite cada `auth.ok` posterior al primero.
- Lo abre un `SocketProvider` montado dentro de `AuthGuard`, en [src/app/(admin)/layout.tsx](../../../src/app/(admin)/layout.tsx). Al montar llama a `start()` y al desmontar a `stop()`. `logout()` también llama a `stop()`.
- **Conexión:**
  - al abrir, manda el `auth` con `getSession().accessToken`;
  - si no hay sesión válida, no conecta y lleva a `/login`;
  - los mensajes que no son JSON o no tienen `type` se ignoran;
  - un `type` sin handlers se ignora.
- **Cierre 1008 (decisión de diseño):** como no hay refresh, se trata igual que un 401: `clearSession()` y redirección a `${basePath}/login/`. No se reconecta con ese token.
- **Otros cierres:** se reconecta con backoff exponencial desde 1 s, duplicando hasta un tope de 30 s, con jitter. El backoff se resetea con cada `auth.ok`. Un `stop()` explícito cancela cualquier reconexión pendiente.
- La lógica de "qué hacer con este cierre" y "cuánto esperar" queda en funciones puras testeables: por ejemplo, `closeAction(code, stopped)` y `backoffDelay(attempt)`. La URL se arma con una función pura, `socketUrl(apiUrl)`.

### Estado del asistente (lógica pura, `src/lib/assistant.ts`)

Un reducer puro, sin React, que es lo que se testea:

- Turno en curso: `{ requestId, question, text, status: "streaming" | "done" | "error", messageId?, sections?, error? }`.
- **`delta`:** si el `requestId` coincide con el turno esperado, concatena `text`. Si no coincide, lo ignora.
- **`done`:**
  - marca el turno terminado y guarda `messageId` y `sections`;
  - en el chat, el turno queda como dos `MessageView` normales: el del usuario con id local negativo, y el del asistente con el `messageId`;
  - el turno se cierra, y se habilita preguntar otra vez.
- **`error`:**
  - en el chat, se sacan la pregunta y la respuesta optimistas, y el `message` queda como error visible del chat;
  - en la guía, el turno queda en `error` con el `message`.
- **Eventos de otras pestañas:** `source: "chat"` con un `chatId` igual al del chat abierto y un `requestId` desconocido → señal de "recargar". El hook hace `GET /chats/{id}` cuando llega el `done` de ese request. Los `delta` ajenos se ignoran.

### Hooks (`src/lib/useAssistant.ts`)

**`useChats(search)`**

- Envuelve a `usePagedList<ChatSummary>("/chats", { search, length })`.
- Agrega `create()`, que devuelve el `ChatSummary` creado y recarga la lista, y `remove(id)`.

**`useChat(id)`**

- Hace `GET /chats/{id}` con `useApiResource`.
- Agrega `ask(question)`:
  1. si no hay `id` (chat nuevo), primero hace `POST /chats` y avisa al llamador el id nuevo;
  2. después hace el POST de la pregunta;
  3. con el 202, agrega el mensaje optimista y el turno en curso.
- Se suscribe a los tres eventos `assistant.*` y aplica el reducer.
- Expone `messages`, `pending` (hay turno en curso), `error`, `ask` y `reload`.
- Recarga con `GET /chats/{id}` cuando el socket emite "reconectado", y también al reabrir el chat (es un mount nuevo).
- Si el turno quedó en curso cuando el socket se reconectó, se descarta y la recarga trae lo que el servidor haya guardado.
- Un 503 o un 400 en el POST no deja nada optimista y muestra `message`.

**`useGuideAsk()`**

- Lo mismo que `useChat`, pero sin chat ni recarga.
- Guarda la lista de turnos de la sesión del panel, solo en memoria. Se pierde al cerrar el panel o recargar la página, porque el backend no guarda nada.
- Cada turno muestra sus `sections`.

**`useGuideSections()`**

- `list` (`GET /guide/sections`) y `get(id)`, que trae el `content`.
- `create(name, file)`, `update(id, {name?, file?})` y `remove(id)`.
- Cada escritura recarga la lista.
- Los errores con `field` se devuelven como `ApiError`, así el formulario muestra el mensaje en ese campo.

### Pantallas (estructura mínima)

**Desktop y tablet (`md` y más).** Una pestaña fija abajo a la derecha, estilo chat de Facebook, montada en el layout `(admin)` y visible en todas las pantallas.

- Al tocarla se abre un panel flotante, de unos 360×520. El primer paso es elegir **Guía de usuario** o **Chatbot**.
- **Chatbot:**
  - muestra la lista de chats: búsqueda por título, paginado con `Pager` o "cargar más", botón para crear uno nuevo y para borrar con `ConfirmDeleteModal`;
  - al elegir un chat, muestra la conversación, un input y un botón de enviar, deshabilitado mientras `pending`;
  - un chat sin título se muestra como "Chat nuevo";
  - cada vista tiene un botón para volver atrás.
- **Guía:**
  - muestra directamente la conversación efímera y el input;
  - cada respuesta lista las secciones consultadas.
- El panel se puede minimizar a la pestaña. Al reabrirlo, empieza desde la elección.
- Si la vista de chat o de guía queda montada, mantiene su estado (decisión del builder).

**Mobile (por debajo de `md`).** Un botón flotante redondo.

- Al tocarlo muestra las dos opciones.
- Al elegir una, abre esa vista en **pantalla completa**: un overlay fijo, con un botón para cerrar o volver. El contenido y los hooks son los mismos que en desktop: solo cambia el contenedor.

**Configuración.** Una subpágina nueva, `/configuracion/guia`, con un link en la barra de submenús y una tarjeta en [configuracion/page.tsx](../../../src/app/(admin)/configuracion/page.tsx), siguiendo el patrón de `gastos`/`producto`. Muestra:

- una tabla de secciones con nombre, caracteres y fecha;
- un modal para subir: nombre + PDF (`accept="application/pdf"`);
- reemplazar desde la misma fila: nombre y/o archivo;
- ver el texto extraído en un modal;
- borrar con `ConfirmDeleteModal`;
- los errores de validación, debajo del campo indicado por `field`.

La subpágina usa `ApiErrorBanner` para los errores de carga.

## Tests (`node --test`, `src/lib/*.test.ts`)

- **`assistant.test.ts`**, sobre el reducer:
  - concatenación ordenada de varios `delta`;
  - un `delta` con otro `requestId` no cambia nada;
  - con `done` se guardan `messageId` y `sections`, y se habilita preguntar;
  - con `error` en el chat se sacan los dos mensajes optimistas y queda el `message`;
  - con `error` en la guía, el turno queda en error;
  - un `done` ajeno con el mismo `chatId` → señal de recargar.
- **`socket.test.ts`**, sobre funciones puras:
  - `socketUrl` con `http`, `https` y `basePath` `/api`;
  - `closeAction(1008)` → `"login"`;
  - otros códigos → `"reconnect"`;
  - después de `stop()` → `"none"`;
  - `backoffDelay` crece y respeta el tope;
  - el dispatcher ignora los `type` desconocidos y el JSON inválido.

### Casos borde (decisiones de diseño, no del usuario)

- **Eventos antes del 202.** El backend podría mandar `delta`, `done` o `error` antes de que el cliente procese el 202. Para cubrirlo, mientras hay una pregunta en vuelo (POST enviado y sin 202 todavía), el hook guarda los eventos `assistant.*` del mismo `source` en un buffer. Al llegar el 202, aplica los del `requestId` devuelto y descarta el resto. Un `done` del buffer que resulta ser propio no cuenta como "de otra pestaña". El buffer va en el reducer puro y tiene sus propios tests.
- **Otra pestaña respondiendo en el mismo chat.** Esta pestaña no bloquea su input. Si el backend rechaza la segunda pregunta (409 o 503), se muestra `message`. Cuando llega el `done` ajeno, se recarga el chat como ya está previsto.
- **Falla la primera pregunta de un chat nuevo.** El chat creado con `POST /chats` no se borra. Queda abierto y la pregunta se puede reintentar ahí mismo. `ask` avisa el id nuevo apenas se crea el chat, así el panel pasa a la conversación.
- **Título.** El backend lo completa con la primera pregunta, pero `done` no lo trae. La lista de chats se recarga cada vez que se vuelve a ella.
- **La guía y la reconexión.** Si el socket se reconecta con un turno de la guía en curso, ese turno pasa a `error` con un mensaje del tipo "Se perdió la conexión; volvé a preguntar". En la guía no hay nada para recargar.

## A criterio del builder

- Los nombres finales de archivos y componentes, y cuánta UI va en `src/components/assistant/`.
- Si el multipart va con funciones nuevas o detectando `FormData`.
- El jitter exacto del backoff.
- Si el panel de desktop recuerda la última vista entre aperturas.
- El tamaño de página de la lista de chats.
