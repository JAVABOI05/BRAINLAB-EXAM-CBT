import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import path from "node:path";
import { fileURLToPath } from "node:url";
import reactHooks from "eslint-plugin-react-hooks";

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const nextConfigs = fixupConfigRules(
  compat.extends("next/core-web-vitals", "next/typescript"),
);

const eslintConfig = defineConfig([
  ...nextConfigs,
  {
    // Keep the existing React Compiler diagnostics visible without blocking
    // unrelated application changes while those patterns are refactored.
    plugins: {
      "react-hooks": fixupPluginRules(reactHooks),
    },
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
