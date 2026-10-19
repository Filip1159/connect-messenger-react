import {defineConfig} from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    // sockjs-client / stompjs expect a Node-style `global`
    define: {global: "globalThis"},
    server: {port: 3000, open: true},
    build: {outDir: "build"},
    test: {
        environment: "jsdom",
        setupFiles: "./src/test/setup.ts",
        exclude: ["e2e/**", "node_modules/**"],
    },
});
