# Midnight Parallax Cosmos

Create a highly immersive, interactive 3D cosmic background inspired by https://bhuwansd.netlify.app/.

Background requirements:

A continuous, seamless deep-space environment covering the entire viewport.

Deep midnight navy and near-black base colours.

Realistic, scattered stars with varying sizes, brightness, density and depth.

Subtle muted blue, violet and purple nebulae with soft atmospheric glow.

Distant celestial objects and subtle cosmic dust to create a sense of scale and depth.

Smooth mouse-responsive parallax, with different movement speeds based on object depth.

Extremely subtle ambient movement and occasional shooting stars.

Keep the lighting dim, elegant and comfortable for extended viewing. Avoid bright neon colours, excessive glow and visual clutter.

The background must remain fixed and continuous while scrolling through the website, without resetting or changing between sections.

Technical requirements:

React + TypeScript.

Use Three.js with React Three Fiber.

Use efficient particle rendering and optimized animations.

Keep the background in a reusable, independent component.

Ensure it works across desktop and mobile, with reduced motion support.

Background must have pointer-events disabled so foreground content remains interactive.

Important: Generate ONLY the cosmic background component and its required supporting files. Do not generate a navbar, hero section, text, buttons, cards or any other portfolio UI. Make the result visually rich but subtle and professional.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/da7e945d-c503-4c02-9d1b-92553c910598).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
