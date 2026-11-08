# Liquidium

Animated liquid-metal effect for shapes and logos. A flowing chrome reflection with colour fringes, a polished bevel on the edge, and export to image or video.

**Try it:** https://genz000.github.io/Liquidium/ (desktop browser, window at least 1024 px wide)

## What it does

- Shapes: circle, daisy, diamond, metaballs, the full canvas, or your own logo (SVG or PNG with transparency)
- Four looks to start from: Default, Noir, Backdrop and Stripes
- Shape size and X/Y position; the reflection stays in place while the shape moves over it
- Edge: bevel width, highlight strength and edge softness
- Surface: number of bands, band softness, distortion, angle and tint
- Dispersion: red and blue colour fringes on the band edges
- Flow speed; the animation is one seamless loop
- Export PNG/JPG (2K, 4K, 8K) and web-optimized video of one full loop: MP4 as H.265 (hvc1, faststart; H.264 where the browser cannot encode H.265) and WebM as VP9, both at constant quality with no audio track

## How to use

1. Pick a look in **Presets**, or start from your own settings.
2. In **Shape**, choose a type. For a logo, choose *Image* and add an SVG or PNG; transparent areas stay empty. Use **Scale**, **X** and **Y** to size and place it.
3. Shape the edge in **Edge**: **Bevel** rounds and polishes it, **Highlight** sets the light on it, **Softness** fades the outline.
4. Tune the reflection in **Surface** and **Dispersion**, and the flow in **Motion**.
5. Set the background and canvas size in **Settings**. Turn on **Timeline** there to pause or scrub the animation.
6. Choose format and size in **Image Export** / **Video Export** and use the export buttons at the bottom of the panel. Images capture the frame under the playhead; video captures one loop.

## Run locally

```bash
npm install
npm run dev
```

## Author

Made by Nader Boulaich — [naderboulaich.net](https://naderboulaich.net).

Third-party code included in this repository keeps its own license; see `LICENSE.md` and `NOTICE.md`.
