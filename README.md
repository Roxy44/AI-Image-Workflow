# AI Image Workflow

Node-based редактор и backend для одной AI-генерации. Ключ API только на сервере.

## Стек

Yarn workspaces: `apps/web` (React / Vite / FSD), `apps/api` (Fastify, in-memory), `packages/shared` (граф, порты, preset, request builder, планировщик).

## Запуск

```bash
yarn install
yarn dev
```

- UI: http://localhost:5173
- API: http://127.0.0.1:3001

По умолчанию `IMAGE_PROVIDER=mock`: Generate даёт красный пиксель, Edit — зелёный. Так проверяют граф, джобы и Result без ключа. Боевой провайдер — `IMAGE_PROVIDER=cloudflare`.

**Импорт / Экспорт** рядом с названием: файл `ai-image-workflow.json` (ноды, рёбра, preset). Экспорт сохраняет граф, импорт загружает его обратно для правки. Загруженные `/uploads` и `/results` живут только на этой машине. Готовую картинку с ноды Result можно скачать кнопкой **Сохранить**.

**Канва.** Левой кнопкой двигается вид. **Shift + перетаскивание** по пустому месту рисует рамку: внутри выделяются несколько нод разом. **Delete** или **Backspace** удаляет все выбранные. Клик по ноде с Shift добавляет её к выделению.

### Порты нод

| Нода | Входы | Выходы |
| --- | --- | --- |
| Prompt | — | `text` |
| Image Input | — | `image` |
| Generate | `text` (обязателен) | `image` |
| Edit | `image` (обязателен), `text` сверху (необязателен: пусто, поле в ноде или ребро от Prompt) | `image` |
| Result | `image` | `image` (продолжение в Edit / другой Result) |

Несовместимые рёбра (`text` ↔ `image`) режутся. Типичное продолжение идеи: **Generate → Result → Edit → Result**.

### Как прогнать обязательный сценарий

1. На канве уже лежит ветвление: **Prompt → Generate A / Generate B → Result A / Result B**.
2. Выбери Preset в шапке (Premium 3D или Photo).
3. Введи текст в Prompt (без текста Generate не стартует).
4. **Запустить**. Независимые Generate идут параллельно; статусы нод обновляются polling `GET /api/runs/:id`.
5. Если нода упала — **Повторить** рядом с Run (retry одной ноды, не всего графа).

## Соответствие брифу (§6–13)

| Требование | Статус |
| --- | --- |
| FSD, логика графа не в UI-виджетах | Сделано: `apps/web/src` по слоям, движок в `packages/shared` |
| Сценарий 1 Prompt → Generate → Result | Сделано (входит в ветвление) |
| Обязательное ветвление Prompt → Generate A/B параллельно | Сделано; тест на два in-flight Generate |
| Граф как данные, порты `text` / `image`, несовместимые рёбра режутся | Сделано (UI + `POST /runs`) |
| Job: idle / queued / running / success / error | Сделано |
| Run: `POST /api/runs` → `{ runId }`, `GET /api/runs/:id` → queued / running / completed / failed | Сделано, polling |
| Retry failed node | Сделано |
| Preset — сущность модели + выбор, без Preset Editor | Сделано (`preset-demo` Premium 3D, Photo) |
| Request builder: user prompt + preset → prompt / negative / references | Сделано в `packages/shared` |
| Loading / error / timeout | Сделано: статусы на ноде; AI-вызов обрывается по `AI_TIMEOUT_MS` |
| Ключ не на фронте | Сделано |
| Canvas (xyflow): add / move / connect / delete / selection / branching | Сделано (звезда) |
| Одна реальная генерация Browser → Backend → AI → Result | Сделано: Cloudflare Workers AI; mock без ключа |
| Сценарий 2 Image Input → Edit → Result | Сделано: upload, Edit (image + опциональный prompt), Result с выходом дальше в Edit |

## Сценарий 2: Image Input и Edit Image

В брифе Edit нужен, если image API умеет редактирование. Cloudflare `flux-2-dev` умеет, поэтому сценарий живой: загрузка файла или картинка с Generate/Result → Edit → Result.

**Граф.** `Image Input` (файл → порт `image`) и/или выход Generate/Result → `Edit Image` (job) → `Result`. У Edit слева два входа: сверху необязательный `text`, снизу обязательный `image`. У Result есть выход `image`, чтобы дорабатывать результат ещё одним Edit.

**Image Input.** Пользователь выбирает файл в ноде. Фронт шлёт data URL на `POST /api/uploads`, backend кладёт байты на диск и возвращает `/uploads/:id`. В граф пишется этот URL, не blob из браузера.

**Edit Image.** Тот же класс job, что Generate: queued → running → success / error, timeout, retry одной ноды. Планировщик не стартует Edit, пока нет картинки. Текст правки: поле в ноде и/или ребро от Prompt; пустой текст допустим (уйдёт preset). Исполнитель читает файл через `ImageReader` и вызывает `ImageGenerator.edit`.

**AI-адаптер.** Узкий порт `generate` / `edit` на backend:

- `IMAGE_PROVIDER=cloudflare` — прод: Generate `flux-1-schnell`, Edit `flux-2-dev`;
- `IMAGE_PROVIDER=mock` — без ключа: красный/зелёный 1×1 PNG.

Других провайдеров в репозитории нет. Если понадобится API заказчика — новый адаптер рядом с Cloudflare, тот же порт `ImageGenerator`.

Собрать граф: кнопки **+ Image Input**, **+ Edit**, **+ Result**, соединить порты, при необходимости загрузить файл, Run.

## Cloudflare Workers AI

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers AI** → **Use REST API**.
2. Создай токен **Workers AI** (Read + Edit) и скопируй **Account ID**.
3. В корневом `.env`:

```env
IMAGE_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=твой_account_id
CLOUDFLARE_API_TOKEN=твой_токен
```

4. Перезапусти `yarn dev`. Generate → `flux-1-schnell`. Edit → `flux-2-dev` (исходник как `input_image_0`, лучше ≤ 512×512).

Бесплатный план: 10 000 neurons в сутки (сброс 00:00 UTC). 429 «capacity» — очередь, имеет смысл подождать; исчерпанный лимит — нет. Параллельные Generate A/B плюс Edit съедают квоту быстро.

Без ключа — `IMAGE_PROVIDER=mock`.

Negative prompt дописывается в текст как `Avoid: …`. Preset-референсы text→image модели не принимают: они уже в builder и поедут, когда контракт заказчика это опишет.

## Проверки

```bash
yarn lint
yarn test
yarn typecheck
yarn build
```

## Вне скоупа брифа

Авторизация, сохранение графа в браузере между сессиями (есть только файл Импорт/Экспорт), деплой, Preset Editor, секции 1–5 задания (критерии оценки / формат сдачи) в исходном файле не было.
