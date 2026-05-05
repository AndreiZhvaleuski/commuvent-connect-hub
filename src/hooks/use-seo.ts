import { useEffect } from "react";

export function useSEO({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    const fullTitle = title.includes("Commuvent") ? title : `${title} · Commuvent`;
    document.title = fullTitle;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
      }
      m.setAttribute("content", description);
    }
    const setMeta = (sel: string, attr: string, val: string) => {
      let m = document.querySelector(sel);
      if (!m) {
        m = document.createElement("meta");
        const [k, v] = sel.replace("meta[", "").replace("]", "").split("=");
        m.setAttribute(k, v.replaceAll('"', ""));
        document.head.appendChild(m);
      }
      m.setAttribute(attr, val);
    };
    setMeta('meta[property="og:title"]', "content", fullTitle);
    if (description) setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    if (description) setMeta('meta[name="twitter:description"]', "content", description);
  }, [title, description]);
}
