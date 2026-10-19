# STATUS

Code review of the current codebase (React 19, React Router 7, Vite). It lists known bugs and bad practices to fix.
Each item has a file reference. Priority: **P1** = real bug or security risk, **P2** = fragile or incorrect in edge cases, **P3** = cleanup.

Not verified at runtime against the backend. Items come from reading the code.

---

## P1: Bugs and security

- [ ] **Auth token stored in `localStorage`** (partly addressed: the header is now set in one axios interceptor, but httpOnly cookies / `Bearer` need a backend change): readable by any XSS. It is also sent as a raw `Authorization` header with no `Bearer` scheme (`src/store/ChatAPI.js`, `Message.jsx`). Consider httpOnly cookies, or at least the standard `Bearer` scheme.
- [x] **Token expiry is only checked once**: `isSignedIn()` checks `exp` only when `ChatAPI.authDetails` is not cached (`ChatAPI.js:36-48`). After the first call an expired token is treated as valid until reload. A malformed token makes `jwtDecode` throw uncaught.
- [x] **Hardcoded backend URLs**: `ChatAPI.js` builds `http://<hostname>:8080`, and `Message.jsx:8` uses `http://localhost:8080` for images, so images break on any non-localhost host. Use a single axios instance and an env var (`VITE_API_URL`).
- [x] **Image `Message` bypasses the shared `api` client**: it creates its own axios request with no error handling. It always assumes `image/jpeg` even for png/gif. It refetches the image whenever the `message` object identity changes, and the base64 round-trip is wasteful. Use a blob/object URL or an authenticated image endpoint.
- [x] **File input crash**: `NewMessageInput.jsx` calls `e.target.files[0]` and `readAsDataURL` without checking. Cancelling the file dialog gives `undefined`, which throws.
- [x] **Unhandled promise rejections everywhere**: `loadAllChats` (`App.jsx`), `updateStatus`, `postMessage`, `createChat`, `searchUsersByQuery` and the image fetch have no `.catch`. A failed request leaves the UI silently stale. There is no error UI.
- [x] **Websocket lifecycle**:
  - No error, close or reconnect handling. A dropped connection means no live updates until reload.
  - Subscriptions are never unsubscribed.
  - `initWebsocket` throws `"Websocket is already opened!"` if the `App` effect re-runs (re-login without a full sign-out, StrictMode), and the throw is unhandled inside a `.then`.
  - `connect()` has no error callback, and `this.password = undefined` is a leftover no-op.
- [x] **Search request issues** (`Search.jsx`): the query is interpolated into the URL without `encodeURIComponent` (`/user/${query}`). There is no debounce, so every keystroke fires a request. Out-of-order responses can overwrite newer results (race). `createNewChat` ignores failure.
- [x] **PII and secrets in the console**: `console.log` of `authDetails` (`App.jsx`), `FormData` (`ChatAPI.postMessage`), message objects (`Message.jsx`), the chats list on every keystroke (`Search.jsx`), and status payloads. Remove all debug logging.

## P2: Fragile or incorrect behaviour

- [x] **Reducer has side effects** (`ChatReducer.js`): `ADD_MESSAGE` queries the DOM and sets `scrollTop`, and several branches `console.log`. Reducers must be pure. Worse, the scroll runs *before* the new message renders. Move it to an effect in `MessagesSection`.
- [x] **`active` is an array index**: adding a chat or changing order makes `active` point at a different chat. Track the active chat by id, and sort chats by last activity.
- [x] **Only 1:1 chats are supported**: `status[0] / status[1]`, `users[0] / users[1]` and the `chat.status[0].id.userId === authDetails.id ? 0 : 1` pattern are repeated in `ChatItem`, `Search`, `SeenAvatar`, `useLastMessage`, `MessagesSection` and `ChatReducer`. Extract helpers (`getRecipient`, `getMyStatus`). This will silently break for group chats.
- [x] **Two sources of truth for auth** (done: components read `AuthContext`, and `ChatAPI` notifies it on sign-out/expiry/401. The static-class design itself is unchanged): `ChatAPI.authDetails` (static) and `AuthContext`. `ProtectedRoute` and `LoginPage` read `ChatAPI.isSignedIn()` while other components read context, so they can disagree after sign-out or expiry. `ChatAPI` as a static class with hidden mutable state is hard to test, so consider a module or hook-based client.
- [x] **`signIn` returns `undefined` for non-200 responses** (only `true` or `false` from the catch). Error causes (network down vs bad credentials) are not distinguished, and the login page always says "Bad credentials".
- [x] **No message de-duplication** in `ADD_MESSAGE`: a websocket redelivery or reconnect would duplicate messages. `UPDATE_STATUS` also assumes exactly two entries.
- [x] **List keys use the array index** (`key={i}` in `ChatsSection` and `MessagesSection`). Use `chat.id` and `message.id`, otherwise re-ordering and prepending cause wrong DOM reuse.
- [x] **Derived state kept in `useState` + `useEffect`**: `useChat` and `useLastMessage` copy props into state, causing an extra render with stale values, which can flash wrong data and trigger `updateStatus` early. Compute them with plain expressions or `useMemo`.
- [x] **Mark-as-read effect** (`MessagesSection.jsx:49-60`): it can fire `updateStatus` repeatedly (once per dependency change, no dedupe or in-flight guard) and has `eslint-disable` on its deps. It also marks a chat as read whenever it is merely active, even if the tab is hidden.
- [x] **Resize listener effect has no dependency array**: `MessagesSection` re-subscribes on every render. The `dim` state exists only to force a re-render, which is a hack.
- [x] **`SeenAvatarsPanel` reads the DOM during render** (`document.querySelector(...)`, marked "DON'T TOUCH!"). Values are one render stale and are `NaN` before mount. `fall()` is an un-cancellable async `setTimeout` loop. Overlapping animations fight each other, and it keeps calling `setState` after unmount. Prefer CSS transitions or `requestAnimationFrame` with cleanup.
- [x] **`MessagesSection` empty state**: `renderedMessages?.length !== 0` is true when `chat` is `undefined` (`undefined !== 0`), so the container renders with no chat. `chats[active]` can also be `undefined` right after sign-out.
- [ ] **`DateFormatter`** (partly fixed: seconds/timezone-aware parsing, calendar-day check and null sentinels are done; what remains is that `nowToSql` still sends local time without timezone and the client clock, because the backend stores that format. Fixing it needs a backend contract change to ISO/UTC):
  - `nowToSql` sends local time with no timezone, so the client clock and timezone leak into stored timestamps and ordering.
  - `sqlToDateObject` parses by substring and ignores seconds and timezone.
  - `displayDayIfDifferent` compares a >24h difference, not a calendar-day change.
  - `new Date(1970)` and `new Date(2038, 1, 19)` are magic sentinels.
  - Prefer ISO/UTC and `Intl.DateTimeFormat`.
- [x] **Chat list preview shows the file id for image messages** (`ChatItem.jsx` uses `lastMessage.content` even when `type === 'FILE'`).
- [x] **Inconsistent asset paths**: `./images/avatars/...` in `UserDetailsSection.jsx` vs `/images/avatars/...` elsewhere. The relative one breaks on any nested route. No avatar fallback if the file is missing.
- [x] **Stale `Route` props**: `<Route exact ...>` (`exact` was removed in v6+, so it's ignored) and an empty `<Route path=""/>` in `App.jsx`. There is no 404 route, and `/login` and `/` have no catch-all redirect.
- [x] **`App` component mixes concerns**: websocket callbacks, data loading and routing live in one component, and the effect uses `eslint-disable` to hide missing deps. Move data loading and subscriptions to a provider or hook.

## P3: Cleanup and tooling

- [x] **No tests and no linter**: the CRA ESLint config was removed in the Vite migration, so the `eslint-disable` comments are now dead. Add ESLint (`eslint-plugin-react-hooks`) and Vitest + Testing Library. The reducers and `DateFormatter` are easy first targets.
- [x] **Accessibility**: the logout icon, chat items and search results are clickable `div`/`li`/`svg` elements with no button semantics, keyboard support or focus styles. Login inputs have `<label>` elements with no `htmlFor` and no `id`. The send button is an `<input type="image">`. `lang="en"` is set while the UI text is Polish.
- [x] **Mixed UI languages and hardcoded strings** (texts now live in `src/strings.js`; the language mix itself is unchanged, so pick one and translate there): Polish ("Szukaj", "Brak wiadomości", "Ty") mixed with English. Extract strings to a dictionary or i18n.
- [x] **Use `onChange` instead of `onInput`** on controlled-style inputs (`LoginPage`, `Search`, `NewMessageInput`). The login form does not disable the button while submitting, so double-submit is possible.
- [x] **Redundant code**: `JSON.stringify` of the body in `signIn` (axios already does it), unused `static socket`, repeated `isSignedIn()` guards in every API method, `import React` in files that don't need it (automatic JSX runtime), and `getAuthDetails` re-decoding after `isSignedIn` already did.
- [x] **Footer "© CONNECT Inc. 2021" is hardcoded.**
- [x] **Stale files and metadata** (root deploy leftovers, `src/logo.svg`, package name and README are cleaned up. **Still open:** `build/` is still committed and holds old CRA output. Decide whether to keep deploying from it or untrack it and add it to `.gitignore`):
  - `build/` is committed and now holds old CRA output. Decide whether to keep deploying from it.
  - Root-level `asset-manifest.json`, `manifest.json`, `favicon.ico`, `robots.txt` and `static/` look like old deploy leftovers.
  - `src/logo.svg` is unused.
  - `package.json` name is `react-spring-chat-app` (the repo is `connect-messenger-react`).
  - `README.md` is likely still the CRA template.
- [x] **SCSS**: the build prints `@import` deprecation warnings (Dart Sass 3 will remove it). Migrate to `@use`/`@forward`.
- [x] **Config** (no change needed: the backend exposes a SockJS endpoint, so `global: "globalThis"` stays): `vite.config.js` sets `define: {global: "globalThis"}` for `sockjs-client`. Revisit if SockJS is dropped in favour of native WebSocket + STOMP.
