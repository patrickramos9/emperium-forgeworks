import { useEffect } from "react";

const SCRIPT_ID = "trustedsite-code";
const SCRIPT_SRC = "https://cdn.ywxi.net/js/1.js";

/** Ensures TrustedSite loads on SPA navigations (verification reads index.html). */
export function TrustedSiteScript() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "text/javascript";
    script.src = SCRIPT_SRC;
    script.async = true;
    script.setAttribute("data-rescan", "1");
    document.body.appendChild(script);
  }, []);

  return null;
}
