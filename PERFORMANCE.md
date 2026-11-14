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
