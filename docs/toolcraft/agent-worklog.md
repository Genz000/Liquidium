# Toolcraft App Agent Worklog

## Status

Mode: product

Active change: liquidium-9

## Decision Trail

### Change ID: liquidium-9

- Entry type: focused
- Change ID: liquidium-9
- Request: "there is a strock frame the shape , a strock that doesnt exist on shape svg , also there is a bug in edge softer , its impact the whole canva , fix it"
- Changed owner: src/metal/metal-shader.ts (image mask), src/metal/metal-heightfield.ts (signed distance clamp).
- User-visible result: no square line around uploaded images, and Edge Softness feathers only the image outline. Cause: outside the image area the mask used a placeholder distance of 8 texels, which jumped against the stored 64 inside it (the anti-aliasing width, taken from the distance's derivative, spiked into a visible line) and became partly opaque once the feather widened the ramp. Now the outside counts as 10^4 texels, the anti-aliasing width comes from the uv mapping, and stored distances reach 160 texels (beyond the widest feather).
- Verification: typecheck, ai:check, product tests pass; the user's saved logo and settings rendered at Softness 0 and 0.05 in the built-in browser.
- Risks: None beyond earlier entries.

### Change ID: liquidium-8

- Entry type: focused
- Change ID: liquidium-8
- Request: "can make the shader smooth and not impacted by the shape , because the tool treat shape as 3d but its 2d with bevel effect"
- Changed owner: src/metal/metal-shader.ts; metal-settings.ts, metal-controls.ts, metal-gl.ts (metal.contour removed); src/app/app-defaults.json (metal.contour dropped).
- User-visible result: the reflection bands depend only on position, Angle, noise and time: the bevel no longer displaces them, the outline no longer bends them, and dispersion is even across the surface. The shape is a flat cut-out of one continuous band field. The bevel is lighting only: brighter where the lip faces the top-left light, darker where it faces away, plus the glint. The Contour control was removed because its only purpose was bending bands toward the outline.
- Verification: typecheck, ai:check, product tests pass; None, Diamond, Circle and an uploaded logo rendered at the same phase show the same band field.
- Risks: Risk: presets no longer reproduce Paper's contour bending; the user asked for shape-independent bands.

### Change ID: liquidium-7

- Entry type: focused
- Change ID: liquidium-7
- Request: "i want to control edge softn , so i can soft the edge of shape and control its value"
- Changed owner: src/metal/metal-controls.ts (edge.softness in Edge), metal-settings.ts, metal-gl.ts, metal-shader.ts (featherRamp, uSoftEdge, uFieldSize), src/app/app-defaults.json (edge.softness 0).
- User-visible result: Edge > Softness (0 to 0.1 of the shape size) widens the outline's anti-aliasing ramp into a feather centred on the outline, with an S-curve fade; 0 keeps the crisp 1 px edge. Works for built-in shapes and uploaded images (image distances are stored to 64 texels, enough for the full range). None keeps a crisp frame.
- Verification: typecheck, ai:check, product tests pass; renders at 0, 0.02, 0.05 and 0.1 checked in the built-in browser.
- Risks: None beyond earlier entries.

### Change ID: liquidium-6

- Entry type: focused
- Change ID: liquidium-6
- Request: "there is Aliasing in the edge of shape , fix it"
- Changed owner: src/metal/MetalCanvas.tsx and metal-settings.ts (backingScale), metal-export.ts, metal-heightfield.ts, metal-field.ts, metal-gl.ts, metal-shader.ts, metal-pipeline.ts.
- User-visible result: preview renders at exactly 2x the on-screen density (zoom x devicePixelRatio, max 4096 px edge) so the browser averages 2x2 samples per pixel; zoom changes reallocate once the gesture ends. Exports render at up to 2x (max 8192 px edge) and are averaged down. Uploaded images use a 1024 px half-float field: signed outline distance with sub-texel coverage for the mask, and a blurred float depth for bevel normals (the old 8-bit depth gave noisy normals and sparkle on the bevel). Built-in shapes use the exact gradient length for their 1 px edge ramp.
- Verification: typecheck, ai:check, unit tests for backingScale and the signed distance channel, product tests pass; 1:1 crops of an uploaded logo with bevel compared before/after; supersampled frame 3.3 ms at 2400x1800 (RTX 3050); 1024 field builds in about 220 ms; PNG export 4096x3072.
- Risks: Risk: 2x supersampling quadruples fragment work; slow integrated GPUs may drop frames at large zoom.

### Change ID: liquidium-5

- Entry type: focused
- Change ID: liquidium-5
- Request: "I want to have export options like we did in the Morphium app. And here I mean the video export. with the same features of the video export that we have in Morphium."
- Changed owner: src/app/app-schema.ts (videoExportModule), src/metal/metal-inventory.ts (Video Export section, user-requested video intent), metal-acceptance.ts, metal-pipeline.ts; src/toolcraft/runtime/export/video-encoding-policy.ts and video-encoding-backend.ts copied from Morphium; src/app/app-defaults.json gained export.video.format/resolution so the user's saved defaults stay valid.
- User-visible result: Video Export section (MP4/WebM, Current/4K) and an Export Video footer action. Same encoder as Morphium: MP4 is H.265 (hvc1) with H.264 fallback and fast start, WebM is VP9, constant quality (VP9 40, H.265 32, H.264 28) with bitrate fallback, no audio. Length is the timeline loop (8 s / Speed), so the video loops seamlessly.
- Verification: typecheck, ai:check, encoder policy test, product tests pass; MP4 export run in the built-in browser.
- Risks: Risk: editing src/toolcraft breaks the kit's integrity check, as in Morphium (accepted there by the user).

### Change ID: liquidium-4

- Entry type: focused
- Change ID: liquidium-4
- Request: "I want to add something to the edge like a softener or something that's make it the shape look like a metallic ... like the Apple logo in the MacBook"
- Changed owner: src/metal/metal-shader.ts, metal-controls.ts (new Edge section: edge.bevel, edge.highlight), metal-settings.ts (defaults and presets), metal-gl.ts, metal-pipeline.ts, metal-inventory.ts, metal-acceptance.ts, app-schema.ts.
- User-visible result: a rounded polished lip along the outline. A surface normal from the shape's distance gradient eases from flat to about 75° at the outline; the reflected bands are displaced along it and a top-left specular glint plus a steep-edge shade appear on it. The outline itself stays a 1 px cut. Presets: Default/Noir 0.04 and 0.7, Stripes 0.03 and 0.6, Backdrop 0.
- Verification: typecheck, ai:check, metal/schema/coverage/performance tests pass; full-size renders of the diamond and an uploaded apple-shaped SVG checked in the built-in browser; Edge controls present in the app.
- Risks: Risk: sharp corners (diamond) show mitre seams in the bevel, as a real bevelled plate would.

### Change ID: liquidium-3

- Entry type: focused
- Change ID: liquidium-3
- Request: "the edges of the shape also the effect ... in case of diamond, the effects are impacted with the shape. So it's not going from side to side ... I want it to have same behavior as reference"
- Changed owner: src/metal/metal-shader.ts
- User-visible result: shape outlines are cut with exactly 1 px of anti-aliasing (image masks re-thresholded); the inner shading and glowing lip were removed; bands now run straight across along Angle with a gentle shape-independent curvature, bending toward the outline only slightly and never folding; stripe cluster, blur and dispersion are thinner.
- Verification: typecheck, ai:check, metal and schema tests pass; full-size frames of every preset and the Circle/Metaballs shapes checked in the built-in browser.
- Risks: Risk: the dome height field is now unused for shading (only the outline distance is read).

### Change ID: liquidium-2

- Entry type: focused
- Change ID: liquidium-2
- Request: "i didnt like the effect because its not smooth  and liquid  as the refference that i give u"
- Changed owner: src/metal/metal-shader.ts
- User-visible result: 4-octave value noise replaced by one smooth simplex octave on a slower orbit; band edges anti-aliased with fwidth; band profile rebuilt after Paper's structure (sharp edge, thin stripe cluster carrying the dispersion fringe, long light-to-dark gradient); lower band frequency and flow speed; bright rim lip; Angle now matches Paper's convention (90° = horizontal bands).
- Verification: typecheck, ai:check, metal/schema/coverage/performance tests pass; phase contact sheets of all four presets compared by eye with the reference playground in the built-in browser. Main thread idle during playback (no long tasks), shader draw about 1.6 ms.
- Risks: Risk: frame rate could not be measured reliably in the built-in browser pane, which throttles itself while hidden.

### Change ID: liquidium-1

- Entry type: first-delivery
- Request: "i want you to do me a web app that does same effect as this https://app.paper.design/playground/liquid-metal use crafttool to build it  this liquid metal"
- Task type: new generated app — custom WebGL renderer, schema/controls, preset actions, image upload, playback timeline, image export.
- User-visible result: Liquidium renders an animated liquid-metal shader in the Toolcraft shell. Shapes: None, Circle, Daisy, Diamond, Metaballs or an uploaded image/logo. Presets Default, Noir, Backdrop and Stripes match the reference playground's values. PNG/JPG export through the runtime footer.
- Source/reference checked: https://app.paper.design/playground/liquid-metal opened in the Claude desktop built-in browser on 2026-10-07; parameter list and the values of all four presets were read from its panel; Default, Noir and Stripes output inspected visually. Paper's shader source was not used; the shader is written from scratch.
- Reference inputs: None (no video, GIF, Figma or recording).
- Docs/contracts read: AGENTS.md; core/control-selection.md; core/media-upload.md; schema-reference.md; component-rules.md; renderer-technique.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, infinity-canvas-scene-bounds, interaction-surface-ownership, timeline-mode-choice, output-export-required, controls-section-inventory-required, renderer-technique-inventory, renderer-gpu-provider, persistence-policy-explicit.
- View interaction intent: non-spatial — a flat full-frame shader; the dome is shading, not a 3D scene.
- Interaction ownership: every parameter is a global panel property-edit; presets are a panel command; the image is a panel collection-edit. Canvas shows output only.
- Decision: one WebGL2 full-screen fragment pass in scene.canvasContent sized by useToolcraftProductSceneFrame; the same program renders exports on an OffscreenCanvas and is drawn into the runtime 2D frame. Uploaded images are rasterised once to a 512 px alpha mask and turned into a dome height field by an exact Euclidean distance transform.
- Alternatives rejected: WebGPU/VGPU (browser coverage for one stateless pass); Canvas 2D (too slow per pixel); keyframes timeline (no per-property animation was requested); video export (not requested).
- State/output mapping: shape.kind/shape.scale/shape.image → mask and dome; metal.* → band count, softness, contour bend, noise warp, angle, tint; metal.shiftRed/shiftBlue → per-channel band offsets; motion.speed → timeline duration (8 s / speed) and phase; appearance.background/export.includeBackground → runtime background.
- Verification: typecheck and ai:check pass; manual browser checks in the Claude built-in browser for every preset, shape Image with an uploaded SVG, and PNG export (4096×3072, metal pixels over background).
- Risks: Risk: the look is matched by eye to the reference, not pixel-identical. Risk: images become a 512 px height field, so fine logo detail softens at large scale.

## Decisions

### Renderer

- Decision: WebGL2 native provider with a browser-compatibility exception, preview and export.
- Reason: One stateless fragment pass; WebGL2 runs in every current desktop browser.
- Evidence: src/metal/metal-gl.ts, src/metal/metal-shader.ts, rendererTechnique in src/metal/metal-performance-model.ts.

### View Interaction

- Decision: non-spatial.
- Reason: Flat shader output with no camera.
- Evidence: appProductReadiness.viewInteraction in src/metal/metal-inventory.ts.

### Interaction Ownership

- Decision: Panel owns all parameters, presets and the image upload.
- Reason: The reference playground edits everything in its side panel.
- Evidence: appProductReadiness.interactionOwnership in src/metal/metal-inventory.ts.

### Timeline

- Decision: Playback timeline; loop length is 8 s divided by Speed; Speed 0 freezes the flow.
- Reason: The reference animates continuously; deriving duration from speed keeps every loop seamless.
- Evidence: timelineModule in src/app/app-schema.ts; loopSecondsForSpeed in src/metal/metal-settings.ts.

### Layers

- Decision: No Layers module.
- Reason: No layer workflow was requested.
- Evidence: modules list in src/app/app-schema.ts.

### Controls

- Decision: Sections Presets, Shape, Surface, Dispersion, Motion after runtime Settings; the image uploader appears only when Shape is Image.
- Reason: Mirrors the reference panel order and groups by what each value changes.
- Evidence: src/metal/metal-controls.ts and appControlSectionInventory in src/metal/metal-inventory.ts.

### Export

- Decision: Image export only (toolcraft-default PNG/JPG); SVG and video not requested.
- Reason: The request asks for the effect; it does not ask for video or SVG.
- Evidence: exportIntent in src/metal/metal-inventory.ts.

### Performance

- Decision: Workload dimensions are backing pixels, the fixed 512² height field and export resolution; the height field is memoised per upload and never recomputed during playback.
- Reason: Frame cost is linear in pixels.
- Evidence: src/metal/metal-performance-model.ts; paths derived in src/app/app-performance.ts. No measured performance has been run.

Canonical control values and selected-entity isolation follow runtime representations; this product has no render scale.

## Evidence

- Source reviewed: the reference playground panel and output, Toolcraft local docs, and the Morphium Toolcraft app for current API shapes.
- Workflow skills were not installed (generated with --no-skills); the signed local workflow was followed instead.

## Verification

Functional checks only; measured performance was not run.

## Risks

- Risk: Visual parity with the reference is approximate.
