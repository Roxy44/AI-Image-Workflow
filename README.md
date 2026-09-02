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

По умолчанию `IMAGE_PROVIDER=mock`: Generate даёт красный пиксель, Edit — зелёный. Так проверяют граф, джобы и Result без ключа.

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
| Одна реальная генерация Browser → Backend → AI → Result | Адаптер готов. До API заказчика: mock или опционально Fal (см. ниже) |
| Сценарий 2 Image Input → Edit → Result | Контракт и прототип нод есть; живой edit ждёт API заказчика — подход ниже |

## Сценарий 2: Image Input и Edit Image

В брифе Edit — только если image API умеет редактирование, иначе достаточно описания. Документации заказчика ещё нет, поэтому **боевой сценарий 2 не сдаём как must**. Подход уже заложен в модели, его можно доключить, когда появится контракт.

**Граф.** `Image Input` (файл → порт `image`) → `Edit Image` (job, вход `image`, выход `image`) → `Result` (превью). Prompt к Edit не обязателен по контракту портов: правка идёт от исходной картинки плюс текст из preset / request builder, как у Generate.

**Image Input.** Пользователь выбирает файл в ноде. Фронт шлёт data URL на `POST /api/uploads`, backend кладёт байты на диск и возвращает `/uploads/:id`. В граф пишется этот URL, не blob из браузера. Несовместимые связи (`text` ↔ `image`) уже запрещены.

**Edit Image.** Это тот же класс job, что Generate: queued → running → success / error, timeout, retry одной ноды. Планировщик не стартует Edit, пока на входящем ребре нет картинки (загрузка или выход предыдущего job). Исполнитель читает файл через порт `ImageReader` и вызывает `ImageGenerator.edit(request, sourceImage)`.

**AI-адаптер.** Узкий порт `generate` / `edit` на backend. Пока нет API заказчика:

- `IMAGE_PROVIDER=mock` — Edit возвращает зелёный 1×1 PNG, чтобы прогнать граф без ключа;
- live-адаптер сейчас заточен под Fal (`flux/dev/image-to-image`) как временная проверка механизма, не как контракт сдачи.

**Когда дадут API заказчика.** В `liveImageGenerator` заменить URL и тело `edit` на их img2img / inpaint (исходник как data URI или upload, плюс prompt / negative / references из builder). Если edit в API не будет — сценарий 2 остаётся этим README, UI-ноды можно не показывать проверяющим.

Собрать граф вручную: кнопки **+ Image Input**, **+ Edit**, **+ Result** в шапке, соединить image-порты, загрузить файл, Run.

## Живая генерация до API заказчика (опционально)

Чтобы увидеть настоящие картинки на Generate, не дожидаясь заказчика:

1. Ключ: [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys).
2. `.env` в корне (файл в git не попадает):

```env
IMAGE_PROVIDER=live
IMAGE_API_KEY=вставьте_ключ
```

3. Перезапустить `yarn dev`. Generate → `fal-ai/flux/schnell`. Один прогон с двумя Generate = два платных запроса (порядка долей цента).

`FAL_KEY` сработает, если `IMAGE_API_KEY` пуст. Preset-референсы Flux Schnell не принимает (text→image): `references[]` собираются в builder и уйдут в запрос, когда контракт заказчика это опишет. Negative prompt для Fal дописывается в текст как `Avoid: …`.

Если баланс Fal пуст (`403 TOP_UP`) или ключа нет — оставь `IMAGE_PROVIDER=mock`.

## Проверки

```bash
yarn lint
yarn test
yarn typecheck
yarn build
```

## Вне скоупа брифа

Авторизация, сохранение графа между сессиями, деплой, Preset Editor, секции 1–5 задания (критерии оценки / формат сдачи) в исходном файле не было.
