import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages deploy: base path matches the repository name so relative
// asset URLs resolve under https://joachimth.github.io/mattrin/
export default defineConfig({
  base: "/mattrin/",
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
