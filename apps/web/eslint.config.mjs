import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import nextPlugin from "@next/eslint-plugin-next";

if (nextPlugin?.configs) {
  const configsToSanitize = ['recommended', 'core-web-vitals'];
  configsToSanitize.forEach((key) => {
    const config = nextPlugin.configs[key];
    if (!config) return;

    if (config.name) {
      delete config.name;
    }

    if (config.plugins && !Array.isArray(config.plugins)) {
      config.plugins = ['@next/next'];
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const nextConfigs = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((config) => {
    const { name: _unusedName, ...rest } = config;
    return rest;
  });

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      "**/node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/sw.js",
      "scripts/perf-autocannon.mjs",
    ],
  },
  ...nextConfigs,
  {
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "warn",
      "prefer-const": "off"
    },
  },
];

export default eslintConfig;
