# Device Worlds V2: Four Interfaces, One Impossible Machine

Status: RESEARCH AND DESIGN BLUEPRINT. Proposed functionality below is NOT yet implemented.
Existing route: /device-worlds/ ; compatible URLs must preserve ?os=windows|linux|apple|android.
Date: 2026-10-27.

## 1. Product thesis

A different operating-system skin is a novelty. Four different ways to manipulate the *same evolving fictional world* could be an experience worth revisiting. Design Windows as a spatial office of interacting virtual files, Linux as a coherent command world, Apple as a generative audiovisual instrument, and Android as a playful pocket ecosystem. Objects move between them and change representation without losing identity.

The experience must accommodate four depths:
- 10 seconds: one immediately satisfying action without onboarding.
- 2 minutes: a few intuitive toys and a reason to try one more thing.
- 10 minutes: meaningful, causal combinations and persistent creations.
- 30 minutes: an optional cross-world puzzle and a surprising fifth space.

Free play comes first; lore must not block fun. "What happens if I try that?" is the most important design question. Answer through coherent reactions rather than unrelated randomized jokes. This is an original synthesis of known patterns, not a claim that it is historically unprecedented.

## 2. What exists and what must remain intact

Current Device Worlds is a static HTML/CSS/ES module project. Windows has three icons, a Start menu and simple popup. Linux recognizes a small fixed command set but lacks a navigable filesystem. Apple has a breathing orb and a saved note. Android has a stylized phone with theme changes and notification text. The bottom "all 4 worlds" chooser changes worlds with shareable query-string overrides. Keep that affordance.

The wider repository already includes /os/, a draggable-window retro desktop, and /computer/, a vendored 3D desktop. Inspect and borrow *patterns* instead of duplicating either whole application. Preserve the homepage project entry, public routes, existing page tests, GitHub Pages workflow and current OS-selection semantics.

A fundamental technical rule: OS detection is a recommendation, not a reliable security or hardware signal. Keep the chooser and detect input/audio/GPU capabilities separately.

## 3. Research-backed reference lessons

1. daedalOS (https://github.com/DustinBrett/daedalOS): browser-desktop basics can have depth through working file operations, windows, keyboard shortcuts, apps and persistence. Avoid building a large generic OS competitor.
2. Hypnospace Outlaw (https://jay-tholen.itch.io/hypnospace-outlaw): invented computer culture becomes engaging when everything has history, jokes, cross-references and consequences. Do not copy characters, art or setting.
3. A Normal Lost Phone (https://anormallostphone.com/): ordinary phone conventions can serve as a narrative exploration interface, not just a visual frame.
4. Hacknet (https://www.hacknet-os.com/): a fictional terminal becomes engaging through consistent command behavior and an internally coherent network of events. Device Worlds must be a harmless simulated shell, not a real hacking tool.
5. A Dark Room (https://press.doublespeakgames.com/adr/index.html): small interactions can gradually reveal complex systems. Avoid artificial waiting and content gates.
6. Sandspiel (https://github.com/MaxBittker/sandspiel): combinable materials with causal physics create replay value independent of quests or text.
7. Patatap (https://patatap.com/) and Chrome Music Lab (https://musiclab.chromeexperiments.com/): delightful sound/visual response is approachable immediately. Add editing, rules and saved reusable outputs to deepen it.

Conclusion: These reference projects establish that desktop sims, fake phones, shell games, procedural sandboxes and audiovisual instruments already exist. The differentiator should be coherent *cross-world transformation* using the specific affordance of each world, not more feature-count or a visual imitation.

## 4. Windows: The Office of Misfiled Things

**Fantasy:** A working little office computer whose folders hide surprising relationships.

**First ten seconds:** Desktop loads with ~6 prominent icons: Explorer, Paint, Signal Player, Notes, Recycle Bin, and a peculiar file named START_HERE. A user can open a file immediately; a small paper note hints that files can be dragged between applications.

**First minute:** Open Paint, draw a tiny cat. Save -> a real virtual file appears in Explorer. Drag it to Signal Player -> pixels become a coherent, deterministic melody. The player discovers that *file types are suggestions*. They can play, modify and undo without touching real files.

**Working apps:**
- Explorer: folders, breadcrumbs, recent, sorting, search, rename, copy, delete, undo, virtual file history, keyboard controls.
- Paint Lab: drawing, palette, mirror tool, undo, virtual save, export PNG, pattern-to-music conversion.
- Signal Player: generated sound from artifact patterns; visual waveform; pause/mute/volume.
- Notes/Mail: fictional authored conversations and editable personal notes, visibly distinct.
- Recycle Bin: meaningful recovered objects and an optional Lost+Found transformer.
- Screensaver Studio: procedural wallpapers composed of selected artifacts.
- System Monitor: clearly marked fictional status indicators and controllable toy processes, never real hardware telemetry.

**Little secrets that are also systems:**
- Drop a weather artifact onto wallpaper -> weather begins in the desktop background.
- Rename one specific authored document -> its fictional office assistant reacts and reveals a folder.
- Move a file to the virtual bin; use Undo -> a paper-bird animation restores it and changes its thumbnail.
- Choose New Tiny Universe from desktop context menu -> a contained particle sandbox appears in a window.
- Two open windows can be spatially overlapped to reveal something in their combined preview. This is a playful discovery, but all critical actions also have keyboard alternatives.

**Feel:** A warm, tangible fictional OS, not generic faux Windows 95. Responsive z-order, drag, resize, taskbar, keyboard focus, viewport bounds, touch-friendly stacked windows. A window must contain something useful, not only prose.

## 5. Linux: The Shell That Grows

**Fantasy:** A fictional computer you can learn by asking it questions and operating on little programs.

**First ten seconds:** The terminal reads guest@archive:~$, explains that it is a toy, and suggests help and ls. Running ls reveals six real navigable virtual paths:

    experiments/  garden/  inbox/  lost+found/  signals/  manual.txt

**First minute:** The user runs cat manual.txt and cd garden, explores files, and runs a small ASCII terrarium. They can grow, flood or reset a little grid. It responds with actual changed state, not a canned one-line reply.

**Supported parser, tiered:** A bounded whitelist interpreter with cwd, relative/absolute paths, basic quoting, flags, history, completion, suggestions and at most a few pipes. Tier 1 help/man/pwd/ls/cd/cat/clear/history/tree/whoami/date/echo; Tier 2 grep/find/head/tail/sort/wc/open/play/seed/inspect/convert/fortune; Tier 3 virtual touch/mkdir/mv/cp/rm/undo for safe, user-owned fictional objects. Never eval input, spawn processes, execute user's binaries, request arbitrary URLs or expose their actual files.

**Real toy programs:**
- ASCII Terrarium: deterministic simple rules for water, sun, growth, fungi and tiny creature behaviors.
- Procedural Maze: generate reproducible mazes, navigate with keyboard or commands, save exploration notes.
- Signal Lab: inspect, reverse, compare, transpose and play pattern data created on Apple or Windows.
- Log Archaeology: search and compare fictional text logs to reconstruct an incident.
- Text Transformer: assemble or mutate short poems, encode/decode authored puzzle strings.

Examples:

    seed 3019 | garden
    cat /garden/weather.txt | sonify
    find /signals -type pulse
    inspect /signals/pulse-014.pulse
    echo hello | glyph
    fortune | glitch

These are bespoke fictional commands, not promises of Unix-compatible shell semantics. Help must document what is and is not supported.

**Recurring character:** A "Janitor" fictional process tidies stray files. Users can observe, predict and manipulate its movement logic, building a relationship between jokes and a comprehensible system. Any automated mutation is reversible and explained in file history.

**Feel:** Clear text, strong typographic hierarchy, contextual ASCII visuals; game-quality autocompletion and error messages. A good beginner can navigate without knowing Linux beforehand.

## 6. Apple: Resonance Garden

**Fantasy:** The browser is a living material that can be sculpted into visuals and music.

**First ten seconds:** A soft, responsive sculpture sits alone on a near-white page. Drag creates a physical deformation and a visible trail. An explicit sound-enable button appears on initial interaction; silence remains a complete experience.

**First minute:** The visitor finds two controls: Create and Replay. Gestures place notes in a musical scale, then turn the gesture into a loop. A second shape harmonizes with the first. The user saves an audiovisual object, not a screenshot-only novelty.

**Four creative modes:**
- Ribbon: x = pitch, y = timbre/brightness, gesture speed = attack/intensity; change mappings.
- Orbit: drawn loops become orbiting note sequencers; interactions trigger chords.
- Bloom: plant shapes and send particles through them with controlled physical rules.
- Resonate: load Pulse, Pattern, Weather or Seed artifacts from other worlds and reinterpret them as light/sound.

**Musical quality:** Default pentatonic quantization avoids accidental noise. Select major, minor, pentatonic or modal palettes. Limit simultaneous voices, soften transients, and add optional BPM and metronome. Undo/redo, muted mode, pause, and local save/export.

**Playful discoveries:**
- Draw a closed loop -> it keeps playing periodically until paused.
- Link two loops -> synchronize or offset their phase.
- A Linux garden seed grows a patterned audiovisual forest.
- A Windows drawing produces a visual ripple palette and harmonic pattern.
- Share a versioned deterministic scene URL; export a PNG and optionally a recorded clip where browser APIs permit.

**Feel:** Deliberate calm, expressive precision and generous negative space. Do not clone macOS UI or spend most of the budget on a permanently animated blob. Let the visitor *author* outcomes. Use Canvas 2D/WebGL2 with capability-dependent visual effects; WebGPU is optional only.

## 7. Android: Pocket City

**Fantasy:** A fictional phone populated with mini-apps, a little city and an evolving, whimsical message system.

**Important responsive difference:** On actual Android or other narrow viewports, the fictional home screen fills the browser view. Do not place a tiny phone-shaped viewport inside the physical phone screen. On a desktop override, show a well-proportioned mock phone and surrounding editorial context.

**First ten seconds:** The phone shows a real interactive weather widget and a simple dock. Tapping Weather opens a little sandbox with draggable weather fronts; tapping the sun brightens the virtual city.

**Apps:**
- Weather Lab: clouds, precipitation, wind and small ecological changes.
- Pocket Map: a diorama of the fictional city where collectibles become physical landmarks.
- Messages: authored fictional contacts and branching moments, with safe clearly in-world notifications.
- Gallery: transformed cross-world artifacts with previews.
- Radio: procedural music station scanner and simple beat toy.
- Sticker Studio: make artwork from saved patterns; use as wallpaper or city objects.
- Camera Without Camera: generate imaginary views from procedural scene seeds, no access to real camera required.
- Settings: rearrange widgets, color themes, wallpaper, local save/export/reset.

**Interactions:** Swipe a message into the weather system to turn text into a named cloud. Drag a sticker onto the city to make it a landmark. Long press widgets to reorganize. Optional shake-to-randomize with motion permission, always mirrored by a shuffle button. Receive Pulse from Apple as an in-world voicemail. Let the map react to weather and sound, not just notifications.

**Feel:** Tactile, playful, crisp, variable accent colors and responsive gestures. No fake real notification permissions, no hidden access to messages/contacts, no arbitrary "install" downloads.

## 8. One shared fictional physics: The Signal

All four are different representations of a common library of user-created and authored artifacts. They are not four disconnected portals and not four collectibles disguised as an ARG.

Canonical artifact types:
- text: letters, poems, notes.
- pattern: drawing grids and vector paths.
- pulse: musical phrase with timestamps and timbre seed.
- weather: bounded environmental parameters.
- seed: deterministic generator state.
- creature: small behavior parameters for the virtual garden/city.

A finite authored transformation graph gives repeatable discoveries:
- pattern + pulse -> kinetic poster
- text + seed -> procedural poem
- weather + seed -> living terrarium
- pulse + weather -> storm soundtrack
- pattern + creature -> sprite skin
- text + creature -> fictional creature greeting and behavior tag

The transformation result is derived from specific inputs, not arbitrary randomness. Provenance view explains the source materials and actions.

**Demonstration: One Pulse in Four Worlds**
1. Apple player creates a sequence and saves pulse-014.
2. Windows File Explorer sees pulse-014.pulse and plays/visualizes it.
3. Linux /signals/pulse-014.pulse supports inspect and reverse, producing a changed revision of the same logical artifact.
4. Android receives it as a playable, fictional audio message that can be placed into wallpaper or sent to Pocket Weather.
5. Reopening Apple shows the modified phrase and its transformation trail.

This is the central novel-feeling mechanic. Make this flow excellent before adding thirty apps.

**Alternative humorous chain:** The Janitor moves a saved note to Lost+Found. Linux logs an orphaned file. Android receives a fictional lost-parcel message. Apple visualizes the note as a singing paper bird. Rescuing it from any representation restores the same object everywhere. A joke becomes an internally consistent world rule.

## 9. Optional fifth mode: THE BETWEEN

The small bottom chooser still shows only the four familiar editions. A discoverable fifth mode can unlock through play, without a forced account or only-one-chance event. Its location and clues should be included in non-spoiler in-world hints.

Chapter I: CONTACT. Notice that an object created in one world appears in another.
Chapter II: TRANSLATION. Modify an object in one edition; discover its corresponding change elsewhere.
Chapter III: CONVERGENCE. Combine two types in the fifth space to create something irreducible to one platform.

The Between should **not** look like a fifth OS dashboard. It is a spatial generative interface where the same object is simultaneously visible as a waveform, image, file graph and miniature city. Moving one representation causally changes the others. The endpoint is a unique remixable artifact and new creative tools, not just an achievement toast.

Offer alternative routes for players unable to use sound, drag, color discrimination or motion. All core toys remain accessible without the mystery.

## 10. Persistence and cross-tab/device semantics

Suggested event and artifact layers:
- Core artifact with schemaVersion, id, type, deterministic seed, payload, origin, revisions and optional fiction tags.
- Immutable author-provided world fixtures kept separate from user-generated objects.
- Event types artifact.created, artifact.transformed, artifact.moved, world.setting.changed, mystery.discovered.
- Deterministic reducer/event processing with idempotency, snapshots and migration tests.

Use IndexedDB for structured artifacts and histories. localStorage is fine for small preferences. Add visible Export Save, Import Save, Reset This World, Erase All Local Data. Warn that browser storage may be cleared and that local saves do not sync between actual physical devices.

Use BroadcastChannel for same-origin, same-storage-partition tab updates. For sharing across actual devices, provide a compact URL or versioned exported save (possibly a QR encoding the URL), without claiming magic automatic synchronization. Validate all imported content, cap sizes, keep untrusted text out of innerHTML, never execute user-supplied programs.

## 11. Technical implementation strategy

Proposed future module boundaries under existing device-worlds/:
- app.mjs remains OS router and stable URL owner.
- core/artifact-schema.mjs and core/transformations.mjs as pure validated deterministic functions.
- core/save-manager.mjs as IndexedDB wrapper with graceful storage-disabled fallback and explicit import/export.
- core/event-store.mjs as scoped event bus and snapshot manager.
- core/capabilities.mjs as pointer/audio/GPU/motion detection.
- worlds/windows/, worlds/linux/, worlds/apple/, worlds/android/, worlds/between/ for world-specific UI.
Do not split prematurely: extract each module as the first need arises.

The terminal parser is a restricted interpretation layer; no eval, shells or arbitrary filesystem access. Pointer events provide a unified model for touch, pen and mouse. Audio is enabled only after user interaction. Orientation, when offered, is opt-in and never a hard dependency. WebGPU is not a baseline; use Canvas/WebGL2 with a static fallback. Pause idle animation/audio in hidden tabs and offscreen worlds. Cap particle counts, output lines, oscillators and saved history. Lazy-load heavy visual assets after selecting a world. An optional scoped service worker can support offline repeat visits without interfering with other site routes.

Keep the main route, query overrides, tiny bottom changer, homepage listing and archive pages unchanged unless intentionally modified. Avoid bundling the existing full 3D computer into this page.

## 12. Development slices

**Slice 0: Baseline.** Snapshot the deployed page, tests and all four present visuals. Introduce no regressions.

**Slice 1: One Pulse Across Four Worlds.** Create eight-step musical phrase in Apple; virtual file in Windows; inspect and reverse in Linux; playable message in Android; persists on refresh; supports export/import/reset; works with sound off. This is the proof of product concept.

**Slice 2: Weather and garden.** Build Android Weather Lab, Linux garden, Apple ambient response and Windows wallpaper reaction. Two artifact classes and multiple bidirectional transformations now exist.

**Slice 3: Meaningful systems.** Linux navigable filesystem/usable parser; Windows quality window manager and virtual file operations; Apple multi-loop instrument; Android home screen layout/customization. Each edition must have at least five *meaningful* interactive actions.

**Slice 4: Reactive fiction.** Add a clear, reversible Janitor system, three authored characters, discoverable log and message clues, provenance UI and optional hint system.

**Slice 5: The Between.** Build its independent visual grammar, optional three-chapter discovery chain, alternative input paths and satisfying generative conclusion.

**Slice 6: Polish.** Responsive/mobile, reduced motion, audio settings, screen readers, performance/offline, deterministic tests, real device matrix.

Risk notes: state consistency and reversible transformations are the highest foundational risk; the audiovisual instrument has the highest performance/accessibility risk; authored story content has a surprisingly high writing cost; a large number of mini apps is not a substitute for depth. Do not proceed to the fifth world if the first two cross-world transforms are still broken.

## 13. Three sample sessions and what qualifies as fun

**15–30 seconds:** User flicks a storm onto Android's little city, sees immediate rainfall and decides to try another widget. No account, no briefing and no forced story.

**5–7 minutes:** User paints on Windows, drops the picture into Signal Player, gets a motif, opens Linux and reverses that motif, then hears/visualizes the reversal back in Windows. The user now understands an emergent rule.

**20–30 minutes:** User follows clues through fictional messages, odd file paths and a visual shape, finds that the same data is interpreted differently in each world, enters The Between, and creates a saved multi-representation artifact. The adventure remains optional; all mini-tools are still independently entertaining.

### Ship/no-ship quality rubric

A toy ships only if: discoverable, responsive, causally meaningful, reversible, replayable, legible, keyboard/touch usable, and bounded against performance problems. Prefer two polished nonlinear systems over ten decorative windows or fifteen standalone one-line jokes.

Proposed product acceptance tests (targets, not measured results):
- First useful interaction achievable within about 10 seconds, including on mobile.
- At least five real operations per OS, with one open-ended sandbox per OS.
- Two independent artifact types travel between worlds and transform in both directions.
- Save refresh/import/export and Reset do not corrupt state.
- No unrequested sound, no important clues requiring flashes, color alone, precise touch or sensor access.
- All features work with simulated OS choice independent of actual device.
- Automation checks OS detection, URL back/forward, persistence/migrations, parser safety, artifact transformations and page staging.
- Manual browser matrix: Windows Chrome/Edge; macOS Safari; Linux Firefox/Chrome; iPhone Safari; Android Chrome; iPad touch with desktop-class user agent; keyboard-only and reduced motion.

## 14. Technical references and evidence limitations

Official source / documentation links:
- Browser detection caveats: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Browser_detection_using_the_user_agent
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- BroadcastChannel: https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel
- Pointer Events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Using_Pointer_Events
- Autoplay policy: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- Motion permission: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static
- WebGPU limited availability: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- WebGL performance: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- Service worker/offline: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- W3C seizures and motion accessibility: https://www.w3.org/WAI/WCAG22/Understanding/seizures-and-physical-reactions.html

The linked products inform feasibility and interaction patterns; they are not formal usability research of this particular project. Proposed session lengths and quality targets are design hypotheses, not measured retention or performance outcomes. Validate with observed first-time visitors. Do not import copyrighted artwork, music, app logos or specific narrative designs from references.

**Final principle:** One meaningful transformation across four representations is worth more than a hundred icons. A surprise should reward experimentation by teaching a rule the user can use again.
