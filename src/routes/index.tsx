import { createFileRoute } from "@tanstack/react-router";
import { CosmicBackground } from "@/components/cosmic/CosmicBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Background — Interactive 3D Deep Space" },
      { name: "description", content: "An immersive, subtle 3D deep-space background with parallax stars, nebulae and shooting stars." },
      { property: "og:title", content: "Cosmic Background — Interactive 3D Deep Space" },
      { property: "og:description", content: "An immersive, subtle 3D deep-space background with parallax stars, nebulae and shooting stars." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // Tall empty page so you can scroll and see the background stays fixed.
  return (
    <main className="min-h-[300vh]">
      <CosmicBackground />
    </main>
  );
}
