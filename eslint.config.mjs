import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "public/**", "tmp/**", "vendor/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["app/frontend/**/*.{ts,tsx}", "vite.config.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: {
      "react-hooks": reactHooks,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // Side-effect imports stay in their written execution order.
            ["^\\u0000(?!.*\\.(?:css|scss|sass|less)(?:\\?|$))"],
            ["^(?:node:|[a-zA-Z])"],
            ["^@(?!/)"],
            ["^@/"],
            ["^\\./"],
            [
              "^\\u0000.*\\.(?:css|scss|sass|less)(?:\\?|$)",
              "^.*\\.(?:css|scss|sass|less)(?:\\?|$)",
            ],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
      "no-restricted-imports": ["error", { patterns: ["..", "../*"] }],
    },
  },
  prettier,
);
