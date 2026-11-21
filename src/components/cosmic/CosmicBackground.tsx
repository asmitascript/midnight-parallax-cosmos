import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CosmicScene = lazy(() => import("./CosmicScene"));

/**
 * Fixed, full-viewport 3D cosmic backdrop. Drop it once near the app root;
 * it stays put while content scrolls over it and never captures pointer events.
 */
export function CosmicBackground() {
  return (
    <div aria-hidden className="cosmic-bg">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <CosmicScene />
        </Suspense>
      </ClientOnly>
      <div className="cosmic-vignette" />
    </div>
  );
}

export default CosmicBackground;
