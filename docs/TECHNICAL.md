### >>> <i>CONNECT</i> messenger
Just a small project, which helped me learn React. [Server side app](https://github.com/Filip1159/connect-messenger-java) written using Java and Spring Boot.

#### Development
Built with [Vite](https://vite.dev).

| Command | |
|---|---|
| `npm install` | install dependencies |
| `npm run dev` | start the dev server on http://localhost:3000 |
| `npm run build` | type-check, then production build into `build/` |
| `npm run typecheck` | TypeScript only (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm test` | unit and component tests (Vitest) |
| `npm run test:e2e` | browser tests (Playwright, backend mocked; starts its own dev server on port 3100) |
| `npm run test:e2e:ui` | the same in Playwright's interactive UI |

The backend URL defaults to `http://<current hostname>:8080`. Override it with `VITE_API_URL` (e.g. in `.env.local`).
