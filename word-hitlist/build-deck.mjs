import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifySpecialWord, counts, isQuadrupleLetter, parseDictionary, solveRack } from '../tools/words/words-core.js';

const racks = [
  ['RACECARSTNEO','palindrome'], ['LEVELSNOATRP','palindrome'], ['RADARSNEOTIL','palindrome'],
  ['KAYAKSENITOR','palindrome'], ['CIVICTENORS','palindrome'], ['ROTORSENIAL','palindrome'],
  ['MADA MNEOTIRS','palindrome'], ['REFERSTANIO','palindrome'], ['REVIVERSTAN','palindrome'],
  ['ABRACADABRAST','quad'], ['ASSESSMENTOR','quad'], ['POSSESSIONAT','quad'], ['PEPPERPOTNAS','quad'],
  ['SENSELESSNATR','quad'], ['SASSAFRASNTE','quad'], ['SUCCESSLESSA','quad'],
  ['QUEUEINGASTR','vowel'], ['AEIOULQNENSR','vowel'], ['EUNOIASTRLN','vowel'], ['SEQUOIAELTR','vowel'],
  ['NEOTENYSLAR','vowel'], ['AEIOUYGEINTR','vowel'], ['AEIOOUPERTR','vowel'],
  ['RETROACTION','double'], ['CROSSWORDEN','double'], ['BALLOONSTER','double'],
  ['TREASURINGS','bookend'], ['DETERMINAON','double'], ['FIREFLYASON','triple'],
  ['ARTICHOKENS','score'], ['JAZZERSOUTN','score'], ['QUIZZERNATO','score'],
  ['ELECTRODANS','long'], ['MAGNETICORS','long'], ['STRAWBERRYN','long'],
  ['WILDPESTARN','bookend'], ['HANDSOMERIT','bookend'], ['PLANTERSITO','bookend']
];

const goalTypes = {
  palindrome: ['Palindrome', 'Find a word that reads the same both ways.', (x) => x.palindrome],
  quad: ['Four of a kind', 'Use the same letter at least four times.', (x) => isQuadrupleLetter(x.word)],
  vowel: ['Vowel heavy', 'Use at least 6 letters with at most 2 consonants. Y counts as a vowel.', (x) => classifySpecialWord(x.word).fewConsonants],
  double: ['Double pair', 'Use two different letters at least twice each.', (x) => Object.values(counts(x.word)).filter(n => n >= 2).length >= 2],
  triple: ['Triple letter', 'Use the same letter at least three times.', (x) => Object.values(counts(x.word)).some(n => n >= 3)],
  bookend: ['Bookended', 'Start and end with the same letter.', (x) => x.word[0] === x.word.at(-1)],
  score: ['High score', 'Play a word worth at least 14 tile points.', (x) => x.base >= 14],
  long: ['Long word', 'Make a word with 8 or more letters.', (x) => x.length >= 8],
  six: ['Six letters', 'Make a word with exactly 6 letters.', (x) => x.length === 6],
  five: ['Five letters', 'Make a word with exactly 5 letters.', (x) => x.length === 5],
  four: ['Four letters', 'Make a word with exactly 4 letters.', (x) => x.length === 4],
};

function shuffledLetters(letters, index) {
  const tiles = [...letters];
  let seed = (index + 1) * 127;
  for (let i = tiles.length - 1; i > 0; i--) {
    seed = (seed * 48271) % 2147483647;
    const j = seed % (i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles.join('');
}

export function buildDeck() {
  const dictionary = parseDictionary(readFileSync(new URL('../tools/words/dictionaries/towers-of-babble.txt', import.meta.url), 'utf8'));
  return racks.map(([input, special], index) => {
    const rack = input.replaceAll(' ', '');
    const matches = solveRack(dictionary, rack, { mode: 'tiles', bonus: 1 });
    const options = Object.fromEntries(Object.entries(goalTypes).map(([id, [, , filter]]) => [
      id, matches.filter(filter).map(item => item.word),
    ]));
    const secondary = ['double', 'triple', 'score', 'bookend', 'long'];
    const rotated = [...secondary.slice(index % secondary.length), ...secondary.slice(0, index % secondary.length)];
    const goals = [
      options[special].length ? special : 'six',
      ...rotated.filter(id => id !== special
        && !(special === 'palindrome' && id === 'bookend')
        && !(special === 'quad' && id === 'triple')
        && options[id].length >= 3).slice(0, 1),
      ...['six', 'five', 'four'].filter(id => id !== special),
    ];
    const selected = [...new Set(goals)].slice(0, 3);
    const examples = new Set();
    return {
      id: index + 1,
      letters: shuffledLetters(rack, index),
      goals: selected.map(id => {
        const [title, description] = goalTypes[id];
        const example = options[id].find(word => !examples.has(word));
        if (!example) throw new Error(`Rack ${rack} has no distinct example for ${id}`);
        examples.add(example);
        return { id, title, description, example };
      }),
      allowed: Object.fromEntries(selected.map(id => [id, options[id]])),
    };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sql = buildDeck().map(({ id, letters, goals, allowed }) =>
    `(${id}, '${letters}', '${JSON.stringify(goals)}'::jsonb, '${JSON.stringify(allowed)}'::jsonb)`);
  process.stdout.write('insert into word_hitlist_private.racks (id, letters, goals, allowed) values\n'
    + sql.join(',\n') + '\non conflict (id) do update set letters=excluded.letters, goals=excluded.goals, allowed=excluded.allowed;\n');
}
