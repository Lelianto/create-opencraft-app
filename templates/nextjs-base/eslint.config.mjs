// Flat ESLint config. eslint-config-next 16 exports flat config arrays directly,
// so the legacy FlatCompat shim is no longer required.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
  ...nextTypescript,
];
