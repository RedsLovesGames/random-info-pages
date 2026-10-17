# CODEX MASTER TASK: Build Four Complete Interactive Websites for Random Info Pages

You are acting as the lead software architect, frontend engineer, interactive visualization specialist, audio engineer, and QA engineer.

Your task is to **fully implement four production-quality, interactive websites** within my existing Random Info Pages repository.

Repository: https://github.com/RedsLovesGames/random-info-pages

The four projects are:

1. **Music Microscope**
2. **One Million, Actually**
3. **Algorithm Arena**, including interactive sound
4. **Cryptography Museum**

## PRIMARY OBJECTIVE

Build all four projects locally, integrate them with my existing repository, thoroughly test them, and package all required new and modified files into a ZIP that can be merged directly into my existing repository and deployed through GitHub Pages.

Do not deploy, push, or merge changes yourself.

I will provide the completed ZIP to ChatGPT for final integration and deployment.

**Do not produce mockups, incomplete prototypes, static demonstrations, placeholder buttons, or nonfunctional scaffolding. Build working applications.**

Do not stop after completing the first project. Continue until all four have been implemented and tested.

If certain secondary features are too ambitious, prioritize a complete, polished, functional core for all four applications over unfinished advanced features.

---

# 1. REPOSITORY INSPECTION AND SAFETY

Before making changes:

1. Inspect the repository's directory structure, README, homepage, CSS conventions, existing applications, automated tests, and GitHub Actions workflows.
2. Identify the existing static-site architecture and deployment process.
3. Check the working tree for uncommitted changes. Preserve them.
4. Identify opportunities to reuse existing code without creating unnecessary dependencies.
5. Review existing homepage navigation, category folders, search indexing, and project counts.
6. Review `tests/home-index.test.mjs` and `.github/workflows/pages.yml`.
7. Identify any paths, compatibility requirements, or existing features that must remain untouched.

Preserve all existing projects and functionality.

Do not rewrite the homepage or redesign unrelated applications.

Do not modify existing IDs, links, persistent data formats, or application behavior except where explicitly required for integration.

Use the smallest reasonable set of shared components.

# 2. GLOBAL DESIGN REQUIREMENTS

These should look like independently art-directed, professional interactive experiences.

Avoid the stereotypical AI-generated dashboard appearance.

Specifically avoid:
- Excessive rounded cards.
- Random purple gradients.
- Generic glowing backgrounds.
- Unnecessary dashboard statistics.
- Huge empty sections.
- Decorative charts without meaningful data.
- Identical layouts across all four applications.
- Unnecessary animations that reduce usability.

Use excellent typography, visual hierarchy, careful spacing, precise alignment, purposeful motion, and meaningful interaction feedback.

Take inspiration from the design principles seen in award-winning interactive editorial websites, scientific exhibits, visualization tools, and carefully designed creative applications.

Each project must have its own visual identity:

**Music Microscope:** Professional audio-analysis instrument. Dark laboratory aesthetic, precise graphs, restrained turquoise/amber spectral accents, and highly functional controls.

**One Million, Actually:** Minimalist editorial data visualization. Immersive typography, almost infinite zoom, carefully controlled color, and visually dramatic scale transitions.

**Algorithm Arena:** Technical, playful, and audiovisual. Highly readable algorithm visualizations, subtle synthesized sound, distinctive visual modes, and excellent animation timing.

**Cryptography Museum:** Historical technology museum. Editorial typography, mechanical diagrams, archival colors, and elegant animated cipher mechanisms.

All projects must be responsive and genuinely usable on phones and desktop computers.

Support keyboard controls, touch interactions, focus states, reduced motion, and appropriate accessibility labels.

Design and implement actual responsive layouts rather than simply shrinking desktop layouts.

---

# 3. PROJECT ONE: MUSIC MICROSCOPE

Route: `/music-microscope/`

Create a complete browser-based audio-analysis application.

## Required functionality

### Audio input
- Upload or drag-and-drop supported local audio files.
- Fully local processing, without uploading audio to a server.
- Include an original, locally generated or bundled example recording.
- Show duration, sample rate, number of channels, and format information when available.
- Handle invalid and unsupported files gracefully.
- Handle large files with sensible performance and memory safeguards.

### Playback
- Play/pause.
- Accurate seeking.
- Scrubbable timeline.
- Loop selected regions.
- Playback position indicator.
- Volume controls.
- Keyboard shortcuts.

### Visualizations
Implement real, data-driven:

1. Detailed audio waveform.
2. Spectrogram.
3. Live frequency spectrum.
4. Frequency-band visualization.
5. Stereo channel comparison.
6. Peak and RMS amplitude measurements.

Waveforms must support zooming and panning.

The spectrogram must support readable frequency and time labels, color adjustments, and a logarithmic frequency option.

Keep playback and the visualizations synchronized.

### Interactive audio experiments
- Low-pass filter.
- High-pass filter.
- Band-pass filter.
- Adjustable cutoff frequency.
- Adjustable resonance where supported.
- Ability to compare filtered and original sound.
- Simple waveform selection and analysis.

### Advanced analysis
Implement where technically reliable:
- Transient/onset detection.
- BPM estimation with uncertainty or alternative candidates.
- Prominent frequency identification.
- Basic pitch detection for suitable audio.

Do not fabricate analysis results or present unreliable estimations as exact.

### Technical requirements
Prefer:
- Web Audio API.
- Canvas rendering.
- Web Workers for expensive processing.
- Efficient downsampling and caching.
- Browser-native audio decoding.
- Minimal dependencies.

Do not make the core application depend on external music services, APIs, AI models, or hosted audio-analysis servers.

The result should be a genuine audio-analysis instrument, not merely an animated visualizer.

---

# 4. PROJECT TWO: ONE MILLION, ACTUALLY

Route: `/one-million/`

Create an immersive, interactive visualization of numerical scale and proportion.

The goal is to make enormous quantities intuitively understandable.

## Required functionality

### Scale Explorer
- Begin with one visible unit.
- Progress through 10, 100, 1,000, 10,000, 100,000, and 1,000,000.
- Animate zoom transitions meaningfully.
- Support zooming and panning.
- Allow users to inspect individual units at sufficiently close zoom.
- Display accurate numerical counts.
- Maintain a stable visual hierarchy during transitions.

### Million-point experience
Represent a million units in an efficient and mathematically honest way.

Use Canvas, WebGL, or another suitable rendering strategy.

Avoid a million separate DOM elements.

Use aggregation and level-of-detail rendering when necessary, but clearly disclose when units are summarized or sampled.

### Interactive comparisons
Users should be able to:
- Enter a quantity.
- Choose a total population or denominator.
- Highlight the corresponding proportion.
- See its percentage.
- Compare multiple quantities.
- Switch between visualization styles.
- Save or share a comparison through URL state.

### Guided visual stories
Include at least these initial stories:

1. One versus one million.
2. One million seconds versus one billion seconds.
3. What a one-in-a-million probability looks like.
4. Why very small percentages can still represent large populations.
5. How misleading visual scales can distort numerical interpretation.

For sourced real-world examples, display the data source, reporting year, and definitions.

### Visual storytelling
Implement smooth but controllable camera movement, scroll-driven sequences where appropriate, and intelligently selected labels.

Users must retain control of the visualization.

Support reduced motion.

### Performance
The point-field renderer must remain responsive while zooming and panning.

Use progressive rendering, efficient buffers, or hierarchical grouping.

Provide an accessible numerical alternative to visual-only representations.

---

# 5. PROJECT THREE: ALGORITHM ARENA

Route: `/algorithm-arena/`

Create an interactive algorithm laboratory with synchronized audio.

**Sound is a major feature, not an optional finishing detail.**

## Sorting laboratory

Implement:

1. Bubble sort.
2. Insertion sort.
3. Selection sort.
4. Merge sort.
5. Quick sort.
6. Heap sort.

Features:
- Generate random arrays.
- Adjustable array size.
- Already sorted, reversed, nearly sorted, and duplicate-heavy distributions.
- Visualize comparisons, swaps, and writes.
- Highlight active elements.
- Adjustable execution speed.
- Pause/resume.
- Single-step execution.
- Restart from the same initial input.
- Show operation counts.
- Show measured computational runtime separately from animation playback duration.

Provide side-by-side algorithm comparisons with identical starting arrays.

## Pathfinding laboratory

Implement:

1. Breadth-first search.
2. Depth-first search.
3. Dijkstra's algorithm.
4. A* search.

Features:
- Interactive editable grid.
- Draw walls.
- Move start and destination.
- Generate mazes.
- Adjustable dimensions.
- Adjustable animation speed.
- Clear explored-cell and frontier visualization.
- Final path highlighting.
- Path cost and visited-node metrics.
- Support weighted terrain where applicable.

Clearly explain when algorithms do not guarantee an optimal path.

## Graph laboratory

Implement an additional graph exploration mode with:
- Editable nodes and edges.
- BFS and DFS.
- Dijkstra's algorithm.
- Prim's or Kruskal's minimum spanning tree algorithm.
- Animated edge and node highlighting.
- Explanation of the results.

## AUDIO ENGINE

Use the Web Audio API to synthesize audio locally.

Do not rely on external sound files or online audio services.

Implement at least three sonification modes:

**Melodic**
- Map element values to musical pitches.
- Support selectable scales or pitch ranges.
- Make sorting sound musically distinct.

**Percussive**
- Distinct synthesized sounds for comparisons, swaps, writes, discoveries, and completion.

**Minimal**
- Subtle audio feedback with reduced sound density.

Also provide a full mute mode.

Audio controls:
- Volume.
- Playback speed.
- Synth preset.
- Sound mode.
- Mute/unmute.
- Optional musical scale selection.

Sound should correspond to real algorithm operations.

Ensure audio and visual playback remain synchronized.

At high animation speeds, intelligently aggregate or reduce sound events.

Limit concurrent audio voices and prevent clipping or runaway gain.

Initialize sound after user interaction to comply with browser autoplay restrictions.

### Algorithm integrity

Implement algorithms as pure or independently testable logic.

Record operation traces for deterministic animation, pause, stepping, and replay.

Verify correct sorting and pathfinding outcomes on diverse inputs.

Never use animation duration as a substitute for actual algorithm runtime.

---

# 6. PROJECT FOUR: CRYPTOGRAPHY MUSEUM

Route: `/cryptography-museum/`

Create an interactive museum exploring historical and modern cryptography.

Each exhibit must contain:

1. Brief historical context.
2. An explanation of the mechanism.
3. An interactive demonstration.
4. Animated diagrams where appropriate.
5. An explanation of its security properties or weaknesses.
6. Related exhibits.

## Required exhibits

### Caesar Cipher
- Interactive rotating cipher wheel.
- Adjustable shift.
- Encrypt/decrypt messages.
- Step-by-step character mapping.

### Substitution Cipher
- Editable substitution alphabet.
- Frequency-analysis visualization.
- Interactive ciphertext-solving challenge.

### Vigenère Cipher
- Key input.
- Encryption and decryption.
- Animated shifting alphabets.
- Explanation of repeating-key weaknesses.

### Enigma Machine
Create a historically grounded working simulation.

Implement:
- Rotor selection and ordering.
- Rotor positions.
- Ring settings.
- Plugboard.
- Reflector.
- Signal-path animation.
- Rotor stepping, including double-stepping where applicable.
- Input and output text.

Validate against known Enigma test vectors.

Do not produce a decorative but inaccurate Enigma simulator.

### Hashing Laboratory
- SHA-256 hashing.
- Visual comparison of hashes.
- Input-change avalanche demonstration.
- Clear explanation of the distinction between hashing and encryption.

### Modern Cryptography Laboratory
- Real AES-GCM encryption and decryption using Web Crypto.
- Secure random IV generation.
- Properly handled authentication failures.
- Local operation.
- Clear handling of passphrases and derived keys where appropriate.

Do not implement homemade modern security primitives.

### Public-Key Cryptography
- Illustrate public and private keys.
- Provide an interactive demonstration using supported Web Crypto primitives.
- Explain encryption versus digital signatures.
- Clearly distinguish simplified educational models from secure practical implementations.

### Museum-wide features
- Historical timeline.
- Exhibit navigation.
- Cipher challenges.
- Progress tracking stored locally.
- Animated mechanism diagrams.
- Clear explanations of common misconceptions.

The site should feel like a real digital museum, not a list of cryptographic tools.

---

# 7. SHARED ARCHITECTURE

Use four separate project directories.

Suggested structure:

```text
music-microscope/
one-million/
algorithm-arena/
cryptography-museum/
exhibits-shared/
```

Create shared code only where multiple projects genuinely benefit from it.

Examples:
- Navigation.
- Accessibility helpers.
- Common control primitives.
- Responsive utility styles.
- Export/share helpers.

Do not force the four applications into a large monolithic framework.

Prefer plain HTML, CSS, and JavaScript or lightweight browser-compatible modules unless inspection reveals a strong reason for another approach.

A local build step is acceptable if all final assets are generated and committed as deployable static files.

**The deployed applications must work on GitHub Pages without a persistent backend or Node.js server.**

Use relative paths compatible with:

`https://redslovesgames.github.io/random-info-pages/`

Avoid root-absolute asset paths.

Do not use external CDNs for critical assets.

Any required library should have a documented license and be included in a reproducible build.

Sound samples, example audio, fonts, and other necessary assets must either be bundled legally or generated locally.

Avoid unnecessary binary assets that inflate repository size.

---

# 8. HOMEPAGE INTEGRATION

Integrate all four websites into the existing Random Info Pages archive homepage.

Maintain the established homepage design.

Place:

- Music Microscope under Experiments.
- One Million, Actually under Data.
- Algorithm Arena under Experiments.
- Cryptography Museum under Experiments.

Update:
- Archive project links.
- Folder counts.
- Total project counts.
- Search index.
- Search metadata.
- Project descriptions.
- Automated homepage tests.

Do not break existing categories, links, or search functionality.

If project counts are duplicated in several places, carefully consolidate the source of truth if it can be done without altering the existing layout or behavior.

Update `tests/home-index.test.mjs` rather than weakening or removing its checks.

---

# 9. TESTING AND VERIFICATION

Implement real tests, not merely syntax checks.

At minimum:

**Music Microscope**
- Known synthetic sine-wave frequency analysis.
- Waveform peak/RMS verification.
- Playback and visualization synchronization checks.
- Audio import and error handling.
- Filtering behavior on controlled test inputs.

**One Million, Actually**
- Exact count and proportion calculations.
- Boundary cases and rounding.
- Zoom/pan coordinate transformations.
- Consistency of aggregation and displayed totals.
- Rendering performance sanity checks.

**Algorithm Arena**
- Sorting correctness on randomized and adversarial arrays.
- Comparison modes starting with identical inputs.
- Deterministic operation traces.
- Correct pathfinding outcomes.
- Weighted versus unweighted behavior.
- Audio event scheduling and concurrency limits.

**Cryptography Museum**
- Cipher round-trip tests.
- Published Enigma reference vectors.
- Known SHA-256 digests.
- AES-GCM round-trip tests and authentication failure handling.
- Public-key operation tests.

**Integration**
- All homepage links.
- All four project routes.
- Static asset loading.
- Mobile layout.
- Keyboard interactions.
- Audio enable/mute.
- Reduced-motion behavior.
- No browser console errors during standard use.

Use Playwright or an equivalent real-browser test approach if available.

Test using a local static HTTP server, not assumptions about `file://` behavior.

Run all relevant existing repository checks too.

Do not claim a test passed unless it was actually executed.

Fix discovered defects wherever feasible.

Do not silently skip failing checks.

---

# 10. PERFORMANCE AND UX REQUIREMENTS

Target smooth interactive rendering on capable desktop hardware and graceful degradation on mobile.

Avoid:
- Rendering large data with millions of DOM elements.
- Excessive main-thread computation.
- Repeatedly recomputing unchanged analysis.
- Memory leaks.
- Unbounded event logs.
- Unnecessary continuous redraws.
- Uncontrolled audio scheduling.
- Layout shifts and overlapping controls.

Use Web Workers, requestAnimationFrame, typed arrays, caching, appropriate Canvas/WebGL techniques, and incremental computation when useful.

Make the applications function well even on moderately powered mobile devices.

Use thoughtful empty states, tooltips, onboarding, and meaningful interaction explanations.

Do not hide important functionality behind hover-only interactions.

All visually presented measurements must be grounded in actual calculations or explicitly labeled as demonstrations.

---

# 11. DEVELOPMENT WORKFLOW

Complete the work in this order:

**Phase A: Inspection and foundation**
- Audit the repository.
- Establish project directories and common infrastructure.
- Plan integration with the existing homepage and CI.

**Phase B: Cryptography Museum**
- Implement the cryptographic engines.
- Verify correctness.
- Build the interactive exhibits.
- Polish layout and animation.

**Phase C: One Million, Actually**
- Build rendering engine.
- Implement accurate scale navigation.
- Add comparisons and guided stories.
- Optimize rendering.

**Phase D: Algorithm Arena**
- Implement algorithms and trace engine.
- Build visualizers.
- Integrate complete audio engine.
- Implement comparison and playback tools.

**Phase E: Music Microscope**
- Implement audio import and transport.
- Build analysis pipeline.
- Add synchronized interactive visualizations.
- Add frequency filtering and measurements.

**Phase F: QA and packaging**
- Integrate homepage links.
- Update tests.
- Run automated verification.
- Test in real browsers.
- Fix regressions.
- Package deployment-ready files.

Do not stop after producing project plans. Write and verify actual working application code.

Use independent tests and manual browser inspection to confirm the implementation.

---

# 12. ZIP DELIVERY REQUIREMENTS

When all four projects are complete, create:

**`random-info-pages-four-exhibits.zip`**

The ZIP must be a deployment-ready overlay for the existing repository.

Its root must correspond directly to the repository root.

For example:

```text
random-info-pages-four-exhibits.zip
├── index.html
├── music-microscope/
├── one-million/
├── algorithm-arena/
├── cryptography-museum/
├── exhibits-shared/
├── tests/
└── .github/
    └── workflows/
        └── pages.yml
```

Include modified files only where necessary. If the deployment workflow does not need modification, omit it from the ZIP.

Do not include:
- `.git/`
- `node_modules/`
- Unnecessary caches.
- Temporary files.
- Test screenshots unless needed for QA documentation.
- Build-system junk.
- Personal files.
- API keys, passwords, or credentials.

All application assets needed for GitHub Pages must be included.

Do not assume the recipient has generated build output or locally installed dependencies.

Additionally, provide a short handoff document containing:

1. All files added or modified.
2. Installation and merge instructions.
3. Testing commands.
4. Tests actually run and their results.
5. Any known limitations.
6. External attribution or licensing requirements.
7. Whether any assets require a build process.
8. Any integration hazards involving existing files.

If any pre-existing file has local changes that cannot safely be incorporated, preserve it and explicitly report the conflict.

Ensure the ZIP does not contain an unnecessary extra parent folder.

Verify the ZIP by extracting it into a fresh copy of the repository and running the appropriate tests.

Keep the existing repository's GitHub Pages deployment workflow intact unless a change is necessary.

---

# 13. FINAL ACCEPTANCE REQUIREMENTS

Do not declare the project complete until:

- All four applications have functional landing pages.
- All four contain working interactive features, not static mockups.
- Music Microscope genuinely analyzes audio.
- One Million genuinely represents accurate quantities.
- Algorithm Arena executes real algorithms and produces synchronized sound.
- Cryptography Museum implements working and verified cipher mechanisms.
- All pages have functional mobile interfaces.
- The existing homepage includes all four projects.
- The homepage search includes all four projects.
- Existing projects remain intact.
- Required assets are bundled.
- Relevant tests have been run.
- Errors discovered during verification have been addressed or explicitly documented.
- The final ZIP has been generated and its contents verified.

**Do not substitute a screenshot, mockup, report, or implementation plan for the actual websites.**

Prioritize correctness, functionality, distinctive design, performance, and maintainability.

Use your own judgment to resolve minor ambiguities without repeatedly requesting clarification.

Work through the entire task, implement the code, run the checks, package the deliverables, and provide the ZIP's exact local path plus a factual completion report.
