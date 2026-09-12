# Fish Wiki Data Validation

## Current Tideborne authority

Fish Wiki specimen mechanics were checked against Tideborne commit:

`eee0cb429921803cf2f81b2b43b76f4fed9cad4f`

That September 11, 2026 commit points at the validated P10 source tree used for this audit.

## FishScore

Current authority:

- `FishScoreV2Service.java`
- `FishScoreV2ServiceTest.java`
- `CanonicalRarity.java`

Canonical formula:

```text
raw = species points
    + 3 * final percentile
    + condition points
    + body type points
    + pigmentation points
    + quality points
```

Species points:

- 1 star: 50
- 2 star: 100
- 3 star: 175
- 4 star: 250
- 5 star: 350

Trait points:

- Scarred: +20
- Parasite-Ridden: +35
- Giant: +40
- Dwarf: +40
- Albino: +70
- Iridescent: +100
- Perfect Specimen: +100

The frozen raw range 50 to 925 is linearly mapped to FishScore 1 to 3000 and clamped.

The current test suite explicitly verifies the minimum 1-star P0 normal case as FishScore 1 and the maximum 5-star P100 Giant + Parasite-Ridden + Iridescent + Perfect Specimen combination as FishScore 3000.

Theoretical FishScore ranges by species stars are therefore:

| Stars | Minimum | Maximum |
| ---: | ---: | ---: |
| 1 | 1 | 1972 |
| 2 | 172 | 2143 |
| 3 | 429 | 2400 |
| 4 | 686 | 2657 |
| 5 | 1029 | 3000 |

These are possible canonical score envelopes. They are not statements that every combination is equally likely.

## Body Type and displayed size envelope

Current authority:

- `BodyTypeGenerator.java`
- canonical `SpecimenData.java`

Body Type values:

- Normal
- Giant
- Dwarf

Body Type event base probability is 5% before canonical rarity compensation, Trait Luck, and any axis-specific multiplier.

Physical size multipliers:

- Normal: exactly 1.00
- Giant: uniformly 1.10 to 1.30
- Dwarf: uniformly 0.60 to 0.82

The Fish Wiki's `With traits` reference range is derived from the catalog's displayed normal-size reference range by applying the widest current Body Type multipliers: 0.60 at the low end and 1.30 at the high end.

This is a display envelope based on the source fish reference range. It is not a new gameplay rule and does not replace Tideborne's canonical deterministic size generation.

## Canonical specimen axes

Current authority: `SpecimenData.java`.

- Body Type: Normal, Giant, Dwarf
- Condition: Normal, Scarred, Parasite-Ridden
- Pigmentation: Normal, Albino, Iridescent
- Quality: Normal, Perfect Specimen

These axes are stored as part of canonical immutable specimen identity.

## Perfect Specimen

Current authority: `SpecimenQualityService.java`.

A Perfect Specimen cannot be created below final percentile 95 by the current Quality rule.

Frozen base chance anchors before Trait Luck and the direct Perfect Catch Quality bonus:

- P95: 2%
- P97.5: 8%
- P99: 25%
- P99.9 and above: 60%

The values between anchors are piecewise linear.

## Historical code excluded

`SpecimenSizeService.java` is explicitly marked mutation-era compatibility and says new gameplay must not use it. It is not used as authority for the native Fish Wiki.

Likewise, the FishScore calculation embedded in the old Tide-2-Addons Fish Wiki was not copied as gameplay authority. Current FishScore display is derived from current Tideborne canonical code and tests instead.

## Render/data boundary

Base fish records and source-backed renders remain vendored from the pinned Tide-2-Addons Fish Wiki source. Tideborne-specific score and specimen interpretation is layered on top from current Tideborne authority. Missing source renders remain missing and are never replaced with generated art.
