# База знаний

То, что **нельзя** вывести из кода: договорённости, внешние системы, неочевидные
ограничения. Стек и команды проверки — в `.cursor/rules/project/stack.mdc`, здесь не
дублируем.

Язык — язык общения проекта.

## Договорённости

- Тестовое: AI Image Workflow, лимит 8–12 часов. Неуспевшее — рабочая основа + README.
- Canvas в скоупе: xyflow (add / move / connect / delete / branching / selection). Свой canvas engine не пишем.
- Статусы run: polling `GET /runs/:id`.
- Edit Image / Image Input: сценарий 2 по брифу описан в README до API заказчика. Ноды и upload уже есть как прототип контракта; боевой edit не сдаём.
- Сценарий 1 и обязательное ветвление Prompt → Generate A/B → Result A/B — must.
- Job (нода): idle / queued / running / success / error. Run (прогон): queued / running / completed / failed. Маппинг обязателен.
- Preset — сущность модели (id, name, mainPrompt, negativePrompt, references), не логика UI. Редактор preset не нужен, выбор — нужен.
- Движок графа и request builder живут вне React-виджетов (FSD + проверка «понимания графа»).
- Layout: yarn workspaces `apps/web` (FSD) + `apps/api` + `packages/shared`.
- AI: адаптер mock по умолчанию. Live Fal — опциональная проверка Generate до контракта заказчика. Ключ: `IMAGE_API_KEY` или `FAL_KEY` в `.env`.

## Внешние системы и интеграции

| Система              | Роль                           | Что важно помнить                                                                                |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| Image-generation API | text→image + edit              | Live: Fal. Ключ только на backend (`.env`). Контракт заказчика пока не подключён.               |

## Ограничения и «так исторически»

- В файле задания только §6–13; секции 1–5 (критерии оценки, формат сдачи) не видели.
- Yarn в PATH: Classic 1.22.22, Node 20.19.4. Berry не используем, пока не попросят.

## Окружения

| Окружение | Где                 | Особенности                                  |
| --------- | ------------------- | -------------------------------------------- |
| local     | машина разработчика | SPA Vite + Fastify; ключ AI в `.env` backend |
