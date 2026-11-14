# Towers of Babble playable dictionary

The user-provided `Towers_of_Babble_words.txt` contained 195,492 entries including 126 two-letter words. The four numbered parts here preserve that source, with verified Git blob hashes. `cursed-extra.txt` contains 49 additional game-specific entries present in the supplied classification ZIP but absent from the raw source.

Build with `node tools/words/build-dictionary.mjs`. This removes two-letter entries, adds the 49 cursed words, sorts, and validates 195,415 three-or-more-letter playable entries against the user's `3_plus_letters.txt` exact Git blob SHA-1.

The generated `../towers-of-babble.txt` is a local GitHub Pages asset and is included inside the standalone offline HTML build. Y counts as a vowel for the current 6+ letters / at most 2 consonants quest (551 dictionary matches) and the alternate 5+ / at most 1 consonant variant (50 matches). Level-specific conditions are not captured by static word membership.
