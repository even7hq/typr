import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Typr",
      description: "Interaction protocol built for humans and terminals.",
      defaultLocale: "root",
      locales: {
        root: {
          label: "English",
          lang: "en"
        },
        pt: {
          label: "Português",
          lang: "pt-BR"
        }
      },
      sidebar: [
        {
          label: "Guide",
          items: [{ label: "Introduction", link: "/" }]
        },
        {
          label: "Protocol",
          items: [
            { label: "Transport", link: "/protocol/transport/" },
            { label: "Envelope kinds", link: "/protocol/envelopes/" },
            { label: "Prompt requests", link: "/protocol/prompt-requests/" },
            { label: "Response", link: "/protocol/response/" },
            { label: "Events", link: "/protocol/events/" }
          ]
        },
        {
          label: "Reference",
          items: [
            { label: "Runtime modes", link: "/reference/runtime-modes/" },
            { label: "AUTO policy", link: "/reference/auto-policy/" },
            { label: "npm package", link: "/reference/npm-package/" }
          ]
        }
      ]
    })
  ]
});
