import { useEffect } from "react";

export function useSEO({ title, description, image }: { title: string; description?: string; image?: string | null }) {
  useEffect(() => {
    const fullTitle = title.includes("Commuvent") ? title : `${title} · Commuvent`;
    document.title = fullTitle;
    const upsert = (sel: string, attrPair: [string, string], content: string) => {
      let m = document.querySelector(sel);
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute(attrPair[0], attrPair[1]);
        document.head.appendChild(m);
      }
      m.setAttribute("content", content);
    };
    if (description) upsert('meta[name="description"]', ["name", "description"], description);
    upsert('meta[property="og:title"]', ["property", "og:title"], fullTitle);
    upsert('meta[property="og:type"]', ["property", "og:type"], "website");
    upsert('meta[property="og:site_name"]', ["property", "og:site_name"], "Commuvent");
    if (description) upsert('meta[property="og:description"]', ["property", "og:description"], description);
    upsert('meta[name="twitter:card"]', ["name", "twitter:card"], image ? "summary_large_image" : "summary");
    upsert('meta[name="twitter:title"]', ["name", "twitter:title"], fullTitle);
    if (description) upsert('meta[name="twitter:description"]', ["name", "twitter:description"], description);
    if (image) {
      upsert('meta[property="og:image"]', ["property", "og:image"], image);
      upsert('meta[name="twitter:image"]', ["name", "twitter:image"], image);
    }
  }, [title, description, image]);
}
