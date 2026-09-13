import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // TypeScript-egne kontroller (noUnusedLocals m.m.) klarer resten via tsc
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "smart"],
      "no-var": "error",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  }
);

