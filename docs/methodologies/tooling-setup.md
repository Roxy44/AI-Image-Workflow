# Подключение инструментов после апрува

Открывается, когда пользователь **уже согласился** добавить линтер, форматтер или
расширение (конституция **W-6**). До согласия — только предложение.

## Порядок

1. Проверить, чем проект уже закрывает задачу. Если оно есть — донастроить, а не менять
   инструмент.
2. Установить пакеты тем менеджером, который указан в `project/stack.mdc`, с явными
   версиями.
3. Добавить скрипты в манифест, чтобы агент и человек проверяли одинаково:
   `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `test`.
4. Прописать конфиг инструмента в репозитории, а не в глобальных настройках.
5. Настроить редактор (ниже), чтобы правила работали без ручных действий разработчика.
6. Обновить `project/stack.mdc`: чем проверяем и какой командой.

## Настройка редактора (VS Code / Cursor)

`.vscode/extensions.json` — рекомендации, чтобы новый разработчик получил подсказку:

```json
{
    "recommendations": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint", "editorconfig.editorconfig"]
}
```

`.vscode/settings.json` — минимум, который реально включает правила:

```json
{
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.rulers": [130],
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "prettier.configPath": ".prettierrc",
    "prettier.ignorePath": ".prettierignore",
    "prettier.requireConfig": true
}
```

Последние три ключа обязательны: без них пользовательская настройка Prettier, указывающая
на другой проект, ломает форматирование в этом репозитории.

Проверить, что нужное расширение установлено. Если нет — попросить пользователя
установить, а не считать, что оно есть.

## `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Значения обязаны совпадать с секцией «Formatting» в `code-style.mdc` и с конфигом
Prettier. Три источника правды, которые расходятся, — хуже одного отсутствующего.

## Prettier

```json
{
    "printWidth": 130,
    "tabWidth": 4,
    "useTabs": false,
    "singleQuote": true,
    "jsxSingleQuote": true,
    "semi": true,
    "trailingComma": "all",
    "arrowParens": "always",
    "endOfLine": "lf"
}
```

## Хуки перед коммитом

Ставятся только по отдельной просьбе: они замедляют коммит и ломают процесс у тех, кто их
не ждал. Если ставим — гоняем на изменённых файлах (`lint-staged`), а не на всём
репозитории, и никогда не запускаем полный набор тестов в `pre-commit`.

## После настройки

Прогнать `format` и `lint` один раз и **отдельным коммитом** — массовое переформатирование
вперемешку с логикой делает ревью невозможным.
