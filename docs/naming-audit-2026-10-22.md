# Random Info Pages: human-first naming audit
Date: October 22, 2026

## Conventions

* Display a literal description of what a page does in navigation and browser titles. Keep project brands discoverable as secondary names and search aliases.
* Keep existing URLs, IDs, query parameters, CSS selectors, localStorage keys, data formats, and app behavior unchanged.
* Keep established game/mechanics terms such as FishScore, Perfect Catch, Trait Luck and Tideborne. These are domain terminology, not unclear generic names.
* Use specific descriptions instead of "Studio", "Lab", "Arena", "Atlas" or "Hub" when they do not identify a function.
* Avoid promising features not actually present. "Interactive" and "live" should reflect the implementation.
* Retain legacy aliases in the homepage search catalog.

## Main project directory

| URL (preserved) | Former public title | New plain-language directory title |
|---|---|---|
| `/belief-atlas/` | Belief Atlas | **Public Figure Beliefs & Claims** |
| `/9-11-timeline/` | A Day in Messages | **September 11: Message Timeline** |
| `/fiction-workspace/` | Draftroom | **Novel Writing & Revision** |
| `/algorithm-arena/` | Algorithm Arena | **Algorithm Visualizer** |
| `/cryptography-museum/` | Cryptography Museum | **Interactive Cryptography Museum** |
| `/music-microscope/` | Music Microscope | **Music & Audio Analyzer** |
| `/one-million/` | One Million, Actually | **Visualizing One Million** |
| `/infrastructure-atlas/` | Infrastructure Atlas | **U.S. Infrastructure Report Cards** |
| `/political-grid/` | Political Grid | **100-Statement Political Survey** |
| `/tools/` | Toolbox | **Everyday Web Tools** |
| `/wheel/` | Wheel | **Random Choice Wheel** |
| `/whenwemeet/` | When We Meet | **Group Availability Planner** |
| `/school-schedule/` | School Schedule | **Class & Assignment Planner** |
| `/friends/` | Friend Group Hub | **Friend Quotes & Games** |
| `/stock-fights/` | Stock Fights | **Stock Image Fight Simulator** |
| `/tideborne/` | Tideborne | **Tideborne Fishing Guide** |
| `/tide2/` | Fishing System 2.0 | **Fishing Mechanics & Calculators** |
| `/vct-scout/` | VCT Scout Board | **Valorant Team Scout & Strategy** |
| `/oldasspolitic/` | Old Ass Politic | **U.S. Congress Age Explorer** |
| `/heatmap/` | 10Groups Heatmap | **10Groups Comparison Heatmap** |
| `/wanuiv2/` | Emperor Director | **AI Video Scene Director** |
| `/nerdcore-prompts/` | Nerdcore Prompts | **Nerdcore Song Prompt Builder** |

## Toolbox: internal tool families

| Former heading | Plain-language title |
|---|---|
| Time & Scheduling | Time Zones & Meeting Planner |
| Image Studio | Image Editor & Converter |
| Money & Finance | Money Calculators |
| Text Studio | Text Tools |
| PDF & Documents | PDF & Document Tools |
| File & Archive Lab | File & ZIP Tools |
| Media Studio | Audio & Video Tools |
| Data Studio | Data Tools & Converters |
| Developer Lab | Developer Tools |
| Math & Science Lab | Math & Science Calculators |
| Random & Decision Lab | Random Pickers & Team Generator |
| Codes & Generator Lab | QR Codes, Barcodes & Passwords |
| Network & System Lab | Network & Storage Calculators |

## Tideborne: nested page audit

The game terms are established names and should not be replaced with generic substitutes. Organize these pages around user questions:

| Existing route | Suggested human-readable browser title | Finding |
|---|---|---|
| `/tideborne/getting-started/` | Getting Started with Tideborne Fishing | Clear workflow, title improved |
| `/tideborne/fish/` | Tideborne Fish Encyclopedia | Search and filter fish |
| `/tideborne/gear/` | Fishing Rods & Gear | Rod parts, lines and leaders |
| `/tideborne/satchel/` | Fish Storage & Angler's Satchel | Storage, sorting, upgrades |
| `/tideborne/journal/` | Fishing Journal & Teams | Progress and records |
| `/tideborne/fishing/` | How Fishing & Fish Traits Work | Overview of the specimen pipeline |
| `/tideborne/fishing/specimens/` | Fish Specimens Explained | Persistent fish data |
| `/tideborne/fishing/body-types/` | Giant & Dwarf Fish Sizes | Body-type event |
| `/tideborne/fishing/condition/` | Fish Condition Explained | Independent condition roll |
| `/tideborne/fishing/pigmentation/` | Rare Fish Colors | Pigmentation event |
| `/tideborne/fishing/quality/` | Perfect Specimen Quality | Extreme-percentile quality |
| `/tideborne/fishing/trait-luck/` | Trait Luck Explained | Trait-modifier effect |
| `/tideborne/fishing/momentum/` | Trait Momentum Explained | Per-player, per-species mechanic |
| `/tideborne/fishing/perfect-catch/` | Perfect Catch Explained | Minigame reward |
| `/tideborne/fishing/fishscore/` | How FishScore Is Calculated | Score ingredients and purpose |
| `/tideborne/reference/` | Fishing Formulas & Technical Reference | Reference landing |
| `/tideborne/reference/mechanics/` | Exact Fishing Formulas | Detailed mechanics |
| `/tideborne/tide/` | Tide 2 Fishing Basics | Base game guide |
| `/tideborne/ecosystem/` | Sharks, Chum & Catch Loss | Other game mechanics |
| `/tideborne/compatibility/` | Compatible Mods & Existing Worlds | Compatibility information |
| `/tideborne/config/` | Game Settings & Configuration | Client/server configuration |
| `/tideborne/gallery/` | Fish & Equipment Gallery | Visual references |
| `/tideborne/design/` | Tideborne Website Design System | Design primitives, developer-focused |
| `/tideborne/status/` | Tideborne Website Progress | Build status, developer-focused |

## Other nested pages

| Page | Plain-language title |
|---|---|
| `/oldasspolitic/member/` | Congress Member Profile & Campaign Finance |
| `/heatmap/compare/` | 10Groups Compass & Axis Comparison |
| `/tide2/mechanics-reference.html` | Exact Fishing Mechanics & Formulas |
| `/os/` | Retro Desktop Simulator |
| `/computer/` (generated at deploy time) | Interactive 3D Computer |

## Navigation groups

Existing internal category identifiers stay unchanged for compatibility. Public labels become:
* Tools -> Utilities
* School -> School & Planning
* Friends -> Friends & Social
* Games -> Games & Guides
* Data -> Data & Research
* Experiments -> Interactive Labs

## Notes / limitations

The root homepage renders its project index from JavaScript and retains original internal `n` names for existing tests and aliases; the human-readable `d` field is shown to visitors. Folder names are intentionally not changed.
