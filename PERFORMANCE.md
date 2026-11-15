# Hero rendering performance

The intro still uses individual photographic fragments, visible mineral side faces and the same house composition. This revision changes the renderer, not the story or calculator pricing.

## Runtime changes

- Authoring-time WebP atlases replace 261 mobile per-stone canvases and synchronous masking, grain generation, bevels and shadow baking. Source/destination rectangles and trajectories live in `hero-manifest.json`, also embedded in `index.html`.
- Mobile atlas is 1536 × 1328, desktop atlas 2048 × 2517. Mobile sprite destinations retain their original logical dimensions. Finished facade textures have independent full-resolution crops.
- Stationary stones are updated only when placement changes. The moving canvas covers the flight band rather than the full viewport and starts at DPR 1 on mobile. At 412 × 892 its backing buffer is 412 × 428 instead of 618 × 1338 (79% fewer pixels).
- After 24 active frame samples, 8 intervals above 25 ms lower moving-layer resolution to 80%, then 65%. This never resizes the stationary facade or house. Orientation reloads the corresponding atlas and resets quality.
- Images decode and the atlas is materialized before the ready state accepts gestures; ImageBitmap is used when supported. Previous bitmaps close on scene changes.
- Reveal properties are scoped to the hero instead of invalidating inherited properties across the entire document. The animation stops when caught up or the tab is hidden.
- Below-fold CSS image backgrounds activate through IntersectionObserver. Mobile navigation/buttons no longer blur the moving background.

## Comparative measurement

Headless Chromium, viewport 412 × 892, device scale factor 3, mobile/touch emulation, CDP CPU throttling 4×, same 120-step target progression. The RAF wrapper records callback cost and timestamp intervals. These are comparative desktop laboratory measurements, **not a Pixel 7 Pro or physical GPU benchmark**; run-to-run variation is expected.

| Measurement | Before | After |
| --- | ---: | ---: |
| Median RAF interval | 33.3 ms | 16.7 ms |
| p95 RAF interval | 50.1 ms | 33.3 ms |
| Longest measured animation callback | 175 ms | 10.1 ms |
| Callback durations above 33.4 ms | 2 | 0 |
| Longest RAF interval | 200 ms | 66.6 ms |
| Longest startup main-thread task | 2070 ms | 536 ms |

The after sample used the compact atlas. The adaptive path was separately forced and checked to preserve stationary canvas dimensions. A longer idle pause is not treated as an animation performance measurement.

Validation: four desktop/mobile aspect ratios, touch keeps the intro fixed then releases the page, reverse clears placed stones, orientation switches textures, reduced motion reaches the finished facade. Calculator totals, custom rates, clipboard and form handoff also passed in both viewport sizes.

Physical-device follow-up: cold load, several slow and fast swipes, reverse/replay, then normal page scrolling on the user's Pixel. Browser emulation cannot guarantee a constant 60 fps on a particular device.

## Reversible native scrolling

The intro now uses an ordinary document scroll range with a sticky scene instead of capturing wheel/touch events and switching the body between fixed and scrollable modes. Progress derives from scroll position in both directions. The last 15% of the sticky range holds the completed hero before it scrolls out; returning to the top restores the bare concrete house. Browser touch inertia, wheel, keyboard and pinch zoom remain native. The optimized atlas renderer and adaptive moving-layer resolution are unchanged.

Validated at 412 × 892 and 1440 × 900: partial assembly keeps hero top at zero, full assembly displays copy, scrolling beyond the range moves the hero out, reverse scroll removes placed stones, and scroll zero clears every stone. Mobile touch continues scrolling after release, and the hero calculator link reaches its target.

## Architectural hero and finish chooser

The headline is now “Вашему дому идёт камень.” Runtime trajectories are shorter and rotate less; five bottom-to-top placement waves replace long flights across the frame. Flight duration is reduced to .16 of the assembly timeline, which also reduces simultaneously active stones. The finished facade receives a subtle source-atop warm light pass in 12 bounded redraws, then a pause precedes the text reveal. Native reversible scrolling remains the timeline driver, with a longer completed-scene range for material comparison.

Three photographic facade options are available: the original warm sandstone, generated ivory limestone, and generated graphite slate. Each has matching desktop and portrait imagery, cut into the existing facade mask and sprite layout at authoring time. These are design visualizations, not representations of a confirmed stock batch. Additional atlas/wall pairs load on selection only. A detached surface warms the texture before an atomic replacement; the old finish stays visible while loading, and a failed request leaves it usable. Scene versioning prevents stale requests overwriting a newer choice. Adaptive canvas quality survives a finish change.

The calculator receives the chosen finish as a design preference, not an invented product price. Its existing material selection and pricing model remain explicit; the preference appears in the copied estimate and facade request summary. Hero CTA sets the task to facade before opening the calculator.

Reviewed: 390 × 844, 320 × 680, 1440 × 900 and 1220 × 434; all three finishes, reverse to bare concrete, lazy loading, calculator preference and copy text, and absence of browser errors/failed resources. A 4× CPU comparison run recorded median RAF interval 16.7 ms and p95 animation callback 3.4 ms. This does not measure a physical Pixel GPU or guarantee 60 fps.

## Next.js migration

The site now builds through Next.js App Router with static HTML output for GitHub Pages and the same components/data in production. Marketing, product content and category pages are server components. Canvas runs in a deferred independent module without React state updates per frame, with AbortController cleanup and bitmap disposal on navigation. Calculator and catalog search receive reduced data rather than full descriptions. Local Geologica WOFF2 files are about 38 KB each versus about 130 KB TTF. Real product images are local WebP, with explicit dimensions and native lazy loading. The hero preserves native reversible scrolling and lazily loaded finish atlases.
