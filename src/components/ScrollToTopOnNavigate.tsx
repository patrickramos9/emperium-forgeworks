import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Scroll to top on forward navigation; preserve position on browser back/forward. */
export function ScrollToTopOnNavigate() {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;
    window.scrollTo(0, 0);
  }, [pathname, search, navigationType]);

  return null;
}
