import { useEffect } from "react";
import { IS_LOCAL } from "@/lib/config";

const SCRIPT_ID = "trustedsite-code";
const SCRIPT_SRC = "https://cdn.ywxi.net/js/1.js";

function trustedSiteScriptSrc() {
  return IS_LOCAL ? `${SCRIPT_SRC}?demo=1` : SCRIPT_SRC;
}

/** Ensures TrustedSite loads on SPA navigations (verification reads index.html). */
export function TrustedSiteScript() {
  useEffect(() => {
    const desiredSrc = trustedSiteScriptSrc();
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    // Local dev: replace production script so demo trustmarks render on localhost.
    if (script && IS_LOCAL && !script.src.includes("demo=1")) {
      script.remove();
      script = null;
    }

    if (script) return;

    script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "text/javascript";
    script.src = desiredSrc;
    script.async = true;
    script.setAttribute("data-rescan", "1");
    document.body.appendChild(script);
  }, []);

  return null;
}
