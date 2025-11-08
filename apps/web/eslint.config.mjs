import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      "**/node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/no-explicit-any": "warn", // FIX: Włączone warning dla 'any' (było "off")
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off"
      ,
      "@next/next/no-html-link-for-pages": "off"
      ,
      "prefer-const": "off"
    },
  },
];

export default eslintConfig;
