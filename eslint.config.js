import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["build", "node_modules"] },
    js.configs.recommended,
    tseslint.configs.recommended,
    react.configs.flat.recommended,
    react.configs.flat["jsx-runtime"],
    reactHooks.configs.flat.recommended,
    {
        files: ["**/*.{js,ts,tsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: { ...globals.browser },
        },
        settings: { react: { version: "detect" } },
        rules: {
            "react/prop-types": "off",
        },
    },
    {
        files: ["**/*.test.{ts,tsx}", "src/test/**"],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ["vite.config.ts", "eslint.config.js"],
        languageOptions: { globals: { ...globals.node } },
    },
);
