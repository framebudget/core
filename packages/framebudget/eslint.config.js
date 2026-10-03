// Lint rules for the framebudget library. The rules are hard limits: every
// one is an error, and CI or the pre-commit hook fails on any of them.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import functional from "eslint-plugin-functional";
import { importX } from "eslint-plugin-import-x";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

const TYPE_FILES = ["**/*.types.ts", "**/*.enum.ts"];
const TS_FILES = ["src/**/*.ts", "test/**/*.ts", "*.config.ts"];

// Type declarations live in `*.types.ts`; `*.enum.ts` holds a const object and
// the union type derived from it (they must share a file to share a name).
const declarationsOutsideTypeFiles = [
  { selector: "TSInterfaceDeclaration", message: "Declare interfaces in a *.types.ts file." },
  { selector: "TSTypeAliasDeclaration", message: "Declare type aliases in a *.types.ts file." },
];
const noEnums = { selector: "TSEnumDeclaration", message: "Use a const object in a *.enum.ts file." };

// Pure core: no mutation, no reassignment, no loops, every function returns a value.
const pureFunctionRules = {
  "functional/immutable-data": ["error", { ignoreImmediateMutation: true }],
  "functional/no-let": "error",
  "functional/no-loop-statements": "error",
  "functional/no-return-void": "error",
  "functional/no-throw-statements": "error",
  "functional/no-try-statements": "error",
};

// Code that may reach the browser or a sibling layer only through its own folder.
const layer = (files, forbidden) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: forbidden.map((name) => ({
          group: [`**/${name}/**`],
          message: `This layer must not import ${name}.`,
        })),
      },
    ],
  },
});

export default defineConfig(
  { ignores: ["dist/**", "node_modules/**", "src/boot/source.generated.ts"] },
  js.configs.recommended,
  {
    files: TS_FILES,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked, unicorn.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["*.config.ts"], defaultProject: "test/tsconfig.json" },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
    plugins: { functional, "import-x": importX },
    rules: {
      // Size and shape.
      "max-lines": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true }],
      "max-params": ["error", 4],
      "max-depth": ["error", 3],
      "max-nested-callbacks": ["error", 3],
      "max-statements": ["error", 20],
      complexity: ["error", 10],

      // Side effects and state.
      "no-param-reassign": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-nested-ternary": "error",
      "functional/no-classes": "error",
      "functional/no-this-expressions": "error",

      // Modules.
      "import-x/no-cycle": "error",
      "import-x/no-default-export": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-mutable-exports": "error",
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",

      // Naming.
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"], leadingUnderscore: "allow" },
        { selector: "variable", format: ["camelCase", "UPPER_CASE", "PascalCase"] },
        { selector: "function", format: ["camelCase", "PascalCase"] },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "import", format: ["camelCase", "PascalCase"] },
        { selector: ["objectLiteralProperty", "typeProperty"], format: ["camelCase", "PascalCase", "UPPER_CASE"] },
        { selector: ["objectLiteralProperty", "typeProperty"], modifiers: ["requiresQuotes"], format: null },
        // `window.__framebudget` is the boot script's hand-off to the core; the
        // options placeholder is replaced by createBootScript().
        { selector: "typeProperty", filter: { regex: "^__framebudget$", match: true }, format: null },
        { selector: "variable", filter: { regex: "^__FRAMEBUDGET_OPTIONS__$", match: true }, format: null },
      ],
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      "unicorn/name-replacements": ["error", { allowList: { props: true } }],
      "unicorn/consistent-boolean-name": ["error", { ignore: ["^useBudget$"] }], // public React hook name
      // The public API returns null for "not measured"; null is part of the contract.
      "unicorn/no-null": "off",
      // JSDoc stays conventional: `/** one line */` and ` * ` prefixed blocks.
      "unicorn/single-line-block-comment-style": "off",
      "unicorn/no-asterisk-prefix-in-documentation-comments": "off",
      // Suggest APIs newer than the ES2020 build target (the boot script targets ES2018).
      "unicorn/prefer-string-replace-all": "off",
      "unicorn/prefer-at": "off",
      "unicorn/no-array-sort": "off",
      "unicorn/prefer-structured-clone": "off",
    },
  },
  {
    files: TS_FILES,
    ignores: TYPE_FILES,
    rules: { "no-restricted-syntax": ["error", ...declarationsOutsideTypeFiles, noEnums] },
  },
  {
    files: ["**/*.types.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        noEnums,
        {
          selector:
            "Program > :not(ImportDeclaration[importKind='type'], ExportNamedDeclaration[exportKind='type'], TSInterfaceDeclaration, TSTypeAliasDeclaration)",
          message: "A *.types.ts file holds type declarations and type imports only.",
        },
      ],
    },
  },
  {
    files: ["**/*.enum.ts"],
    rules: { "no-restricted-syntax": ["error", noEnums] },
  },
  { files: ["src/core/**/*.ts"], rules: pureFunctionRules },
  layer(["src/core/**/*.ts"], ["platform", "startup", "budget", "boot", "react", "panel", "governor"]),
  layer(["src/benchmark/**/*.ts", "src/governor/**/*.ts"], ["platform", "startup", "budget", "boot", "react", "panel"]),
  layer(["src/platform/**/*.ts"], ["startup", "budget", "boot", "react", "panel"]),
  layer(["src/startup/**/*.ts"], ["budget", "boot", "react", "panel"]),
  {
    files: ["test/**/*.ts"],
    rules: {
      // Test doubles stand in for browser objects, which need loose shapes.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  {
    files: ["*.config.ts", "eslint.config.js"],
    rules: { "import-x/no-default-export": "off", "unicorn/no-top-level-side-effects": "off" },
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
