import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://brf2.pages.dev",
  vite: {
    plugins: [tailwindcss()],
  },
});
