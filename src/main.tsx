import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { configureAmplify } from "./lib/amplify";
import { ensureGuestSession } from "./services/guestSessionService";

async function bootstrap() {
  await configureAmplify();
  try {
    await ensureGuestSession();
  } catch (err) {
    // Backend URL may be missing until M6e deploy; storefront still works.
    console.warn("Guest session bootstrap skipped", err);
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
