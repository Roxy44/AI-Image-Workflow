# Каталог стеков для опросника

Справочник вариантов. Агент открывает его **только** когда репозиторий пустой или стек
из файлов не читается. В живом проекте сначала детект из манифеста — этот файл не нужен.

Предлагай варианты из списков ниже. Не выдумывай экзотику вне каталога, если пользователь
сам её не назвал. Можно выбрать несколько пунктов в одной группе (например ORM + БД).
Ответ «другое» всегда допустим — тогда записываем формулировку пользователя как есть.

## Тип проекта

- frontend
- backend
- fullstack
- library
- CLI
- mobile

## Языки

- TypeScript
- JavaScript
- Python
- Go
- Rust
- Java / Kotlin
- C#
- PHP
- Ruby
- Swift / Kotlin (mobile)
- другое

## Frontend — фреймворк

- React (Vite / Next.js / Remix)
- Vue (Vite / Nuxt)
- Svelte / SvelteKit
- Angular
- Solid
- vanilla / без фреймворка
- другое

## Frontend — стили

- Tailwind
- CSS Modules
- SCSS / Sass
- styled-components / Emotion
- vanilla CSS
- другое

## Frontend — CSS naming (опционально)

**Не предлагать эту группу**, если стили — Tailwind / UnoCSS / Windi или CSS-in-JS
(styled-components, Emotion, Stitches, Linaria, …). Писать `CSS naming: n/a` — BEM там
неприменим и его нельзя смешивать с utility или `styled` API.

Спрашивать только при классических именованных классах: CSS Modules, SCSS/Sass/Less,
обычный CSS (или гибрид, где всё ещё есть свои block-классы). Пишется в `stack.mdc` как
**CSS naming**.

- BEM (`block__element--modifier`)
- существующее соглашение проекта (как уже в репо)
- none (классический CSS без BEM)

## Frontend — состояние

- локальный state (+ Context)
- Zustand
- Redux Toolkit
- Jotai / Recoil
- Pinia (Vue)
- другое / пока не нужно

## Frontend — данные с сервера

- fetch / axios вручную
- TanStack Query (react-query)
- SWR
- RTK Query
- Apollo / urql (GraphQL)
- tRPC
- другое / пока не нужно

## Backend — runtime / язык

- Node.js (TypeScript / JavaScript)
- Deno / Bun
- Python
- Go
- Java / Kotlin
- C# / .NET
- PHP
- другое

## Backend — фреймворк

- NestJS / Express / Fastify / Hono
- Next.js Route Handlers / tRPC (BFF)
- Django / FastAPI / Flask
- Gin / Echo / Fiber (Go)
- Spring Boot
- ASP.NET Core
- Laravel / Symfony
- другое

## Backend — БД

- PostgreSQL
- MySQL / MariaDB
- SQLite
- MongoDB
- Redis (как основная или кеш)
- другое / пока без БД

## Backend — доступ к данным

- Prisma / Drizzle / TypeORM / Knex
- SQLAlchemy / Django ORM
- GORM / sqlc
- raw SQL
- другое / пока не нужно

## Менеджер пакетов

Выберите **один**. Агент будет ставить и обновлять зависимости только им.

### JavaScript / TypeScript

| Менеджер | Типичный lockfile                               | Заметки                                                                                                     |
| -------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| npm      | `package-lock.json`                             | Дефолт с Node                                                                                               |
| pnpm     | `pnpm-lock.yaml`                                | Быстрый, строгий; удобен в монорепах                                                                        |
| yarn     | `yarn.lock` (иногда только `package-lock.json`) | Classic или Berry; бывает yarn при одном `package-lock.json` — подтверждать, не мапить lock → npm автоматом |
| bun      | `bun.lockb` / `bun.lock`                        | Runtime + менеджер пакетов                                                                                  |

Если выбранного CLI нет в PATH — сказать, как установить, или предложить другую строку
таблицы (нет yarn → npm / pnpm / bun). Не смешивать lockfile без явной миграции.

**Дефолт greenfield:** lockfile выбранного менеджера — в `.gitignore` (конституция
**G-6**). В git только манифест; lock появляется после локального install. Переопределение:
`Lockfiles in git: commit` в `stack.mdc`, если нужна закреплённая CI.

### Другие экосистемы

- pip / poetry / uv
- go modules
- cargo
- другое

## Линтер / форматтер

- ESLint + Prettier
- Biome
- oxlint (+ Prettier или без)
- Ruff / Black (Python)
- golangci-lint / gofmt
- ничего — не добавлять без спроса
- другое

## Тесты

- Vitest / Jest
- Playwright / Cypress (e2e)
- pytest
- go test
- ничего пока
- другое

## Ожидание по тестам до «готово»

- тест на каждый багфикс
- покрывать бизнес-логику
- только то, что уже есть в CI
- пока ничего не требовать

## Git

- trunk-based / GitHub Flow / Git Flow
- Conventional Commits — да / нет
- агент никогда не коммитит и не пушит — только черновик сообщения и команды для
  разработчика (конституция **G-1**, **G-5**; деплой / GitHub Pages тоже)
