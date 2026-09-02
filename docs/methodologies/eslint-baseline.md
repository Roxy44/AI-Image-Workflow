# Стартовый конфиг ESLint

**Не дефолтный линтер.** Открывать только если в онбординге выбран ESLint (или пользователь
явно попросил его поднять). Для Biome, oxlint, Ruff и других инструментов этот файл не
нужен.

В живом проекте с уже настроенным линтером — чеклист интентов, а не файл для копирования
поверх.

Соответствие «интент → правило» — в `code-style.mdc`, секция «Linter intents». Здесь
готовые значения под форматирование из того же файла (4 пробела, одинарные кавычки, точки
с запятой, ~130 символов).

## Классический конфиг (`.eslintrc.json`)

```json
{
    "extends": ["react-app", "react-app/jest"],
    "rules": {
        "eqeqeq": "error",
        "no-unused-vars": "warn",
        "no-console": "warn",
        "no-duplicate-imports": "error",
        "quotes": ["warn", "single"],
        "jsx-quotes": ["error", "prefer-single"],
        "prefer-const": "error",
        "indent": ["error", 4],
        "semi": ["warn", "always"],
        "no-magic-numbers": [
            "warn",
            {
                "ignore": [-1, 0, 1, 2],
                "ignoreArrayIndexes": true,
                "ignoreDefaultValues": true
            }
        ],
        "no-empty": ["error", { "allowEmptyCatch": false }],
        "import/no-duplicates": "error",
        "import/newline-after-import": "warn",
        "import/no-cycle": "error",
        "react-hooks/exhaustive-deps": "warn",
        "react/jsx-key": "error",
        "react/self-closing-comp": "warn"
    }
}
```

## Замечания

- Правила форматирования (`indent`, `quotes`, `semi`) в ESLint конфликтуют с Prettier.
  Если Prettier подключён, форматирование остаётся за ним, а эти правила убираются —
  двойной источник правды даёт бесконечные споры линтера с форматтером.
- Правила с префиксом `import/` требуют `eslint-plugin-import`, `react-hooks/` —
  `eslint-plugin-react-hooks`. Установка — только с согласия (**W-6**).
- TypeScript-проект дополнительно подключает `@typescript-eslint` и заменяет
  `no-unused-vars` на `@typescript-eslint/no-unused-vars`.
- Современный ESLint предпочитает flat config (`eslint.config.js`). Набор правил тот же,
  меняется только форма файла.
