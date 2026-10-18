/* Rubric and checklists adapted from Fiction Author Rubric & Workbook. */
window.FICTION_TEMPLATES = [
  {
    "id": "rubric",
    "name": "Full manuscript rubric",
    "subtitle": "14 weighted criteria · 100 points · evidence and next actions",
    "scale": 4,
    "items": [
      {
        "id": "c01",
        "name": "Opening and narrative promise",
        "weight": 8,
        "perfect": "The opening gives a clear experience worth continuing: a person, problem, or question with a distinctive angle.",
        "questions": [
          "What am I promising the reader: heist, mystery, emotional transformation, politics, romance, or another experience?",
          "By the end of the opening, can a reader identify one meaningful stake and one source of curiosity?",
          "Have I made the immediate situation legible without explaining the whole world?"
        ],
        "warnings": "Many invented terms arrive before the reader can orient themselves. • The hook is loud but has no consequential follow-through.",
        "advice": "Reveal the current threat before the glossary. Let an unanswered question pull the reader forward. Protect the emotional impact of the first danger.",
        "example": "CASE STUDY  /  Rodion’s prison bargain and auction create a hook; the initial density of Magathan terms and quick deflection of slavery weaken its effect."
      },
      {
        "id": "c02",
        "name": "Plot architecture and objectives",
        "weight": 12,
        "perfect": "The central desire produces attempts, obstacles, consequences, and a changing plan; subplots alter the main line.",
        "questions": [
          "What does the protagonist try to accomplish in this chapter, specifically?",
          "What happens because of the last important decision?",
          "If I removed this scene, which later event would cease to make sense?"
        ],
        "warnings": "The protagonist thinks about the goal but rarely acts toward it. • Adjacent interesting episodes do not cause one another.",
        "advice": "Write a cause-and-effect chain: goal -> attempt -> resistance -> result -> next decision. Join social and exploratory scenes to later consequences.",
        "example": "CASE STUDY  /  Rodion wants the Stormstone, yet palace routines often outrun visible heist attempts; the royal vault and Remel provide opportunities to reconnect them."
      },
      {
        "id": "c03",
        "name": "Chronology and causal logic",
        "weight": 8,
        "perfect": "The order, durations, geography, knowledge, and causes of events can be reconstructed without accidental contradiction.",
        "questions": [
          "How many hours or days have actually passed, and where was everyone?",
          "What does each character know at this moment and how did they learn it?",
          "Could the stated journey or action occur in the available time?"
        ],
        "warnings": "Travel or recovery takes more time than the story allows. • Two scenes disagree about the same event without signaling unreliability.",
        "advice": "Keep a dated event ledger. For each reveal, cross-check prior appearances, character knowledge, and consequences; tag deliberate mysteries separately.",
        "example": "CASE STUDY  /  The arrest-to-palace clock is not reconciled with Remel’s weeks-long voyage; the assassination vehicle and named war target also change."
      },
      {
        "id": "c04",
        "name": "Pacing and scene economy",
        "weight": 8,
        "perfect": "The narrative gives time to moments that matter and compresses repetitions; quiet scenes still change knowledge, mood, relationship, or stakes.",
        "questions": [
          "What changes by the end of this scene? It can be external, internal, or in the reader’s understanding.",
          "Why should this moment get a full scene rather than a sentence of summary?",
          "Have I already made this same point through a similar joke or description?"
        ],
        "warnings": "Travel, clothing, or decoration receive more space than their narrative significance warrants. • Several interactions end in the same emotional position.",
        "advice": "Keep distinctive details that alter choice, reveal character, or foreshadow stakes. Compress the third repetition of information.",
        "example": "CASE STUDY  /  The bath and shopping sequences show class contrast but repeat it; the first mirror accusation and red-dress insight deserve more space."
      },
      {
        "id": "c05",
        "name": "Protagonist agency and arc",
        "weight": 10,
        "perfect": "The viewpoint character makes consequential choices and changes, resists change, or deepens in an intelligible way.",
        "questions": [
          "What does this person believe about themselves that the reader might question?",
          "What choice today costs them something tangible?",
          "Does their weakness change the action, not merely feature in narration?"
        ],
        "warnings": "Their plans are mostly replaced by other people’s appointments. • Charm, luck, or confidence nullifies every setback.",
        "advice": "Build a sequence of decisions that expose the protagonist’s flaw and force adaptation, loss, or a more difficult lie.",
        "example": "rich contradictions, not yet pressed hard enough."
      },
      {
        "id": "c06",
        "name": "Central secondary lead and independent arc",
        "weight": 8,
        "perfect": "The most important second character has their own wants, competence, decisions, and consequences independent of the protagonist.",
        "questions": [
          "What does this character want when the protagonist is absent?",
          "Have I distinguished their knowledge from the ability to use it under pressure?",
          "Does a public failure reveal a real limitation without arbitrarily making them unintelligent?"
        ],
        "warnings": "The character exists mainly to reward, admire, or obstruct the protagonist. • A skill established earlier disappears to make a scene happen.",
        "advice": "Give the second lead a plan that can fail for convincing reasons, then force them to revise it and affect the main plot.",
        "example": "CASE STUDY  /  Lillian’s reform goal is independent and engaging, but her earlier economic ideas sit poorly with her later inability to articulate a financing plan."
      },
      {
        "id": "c07",
        "name": "Supporting cast",
        "weight": 6,
        "perfect": "Supporting figures possess distinct incentives, private pressures, moral boundaries, and recognizable voices.",
        "questions": [
          "What does each supporting person want besides helping or opposing my lead?",
          "What would cause them to refuse their usual role?",
          "Can a reader recognize them by a decision, not only a costume or title?"
        ],
        "warnings": "Every scene with a character performs the same single function. • Secondary characters vanish after delivering information.",
        "advice": "Give each recurring figure a cost, secret, loyalty, or boundary; let that motive complicate a scene.",
        "example": "CASE STUDY  /  Chiatan is a memorable foil, Jeckle hints at a different philosophy of service, and Remel provides a moral challenge; all benefit from clearer private stakes."
      },
      {
        "id": "c08",
        "name": "Relationships, consent, and power",
        "weight": 7,
        "perfect": "The story knows who can leave, refuse, punish, or control whom, and lets those power imbalances affect trust and intimacy.",
        "questions": [
          "What can each person freely refuse, and what happens if they do?",
          "Does an action meant to be charming look different from the less powerful person’s point of view?",
          "Does a change in trust follow changed behavior rather than mere proximity?"
        ],
        "warnings": "Coercion is forgotten whenever a tender exchange begins. • Repeated flirting substitutes for evolving knowledge or trust.",
        "advice": "Show boundaries, leverage, and genuine consequences. Make affection and freedom separate questions; build reciprocity through actual choices.",
        "example": "CASE STUDY  /  Lillian campaigns for justice while controlling an enslaved attendant through a bracelet. That contradiction should carry narrative weight."
      },
      {
        "id": "c09",
        "name": "Dialogue and subtext",
        "weight": 7,
        "perfect": "Speech reveals strategy, status, personality, conflict, and what people withhold; not every exchange spells out its meaning.",
        "questions": [
          "What does each speaker want from the exchange?",
          "Could any explanatory sentence be replaced by evasion, silence, a revealing mistake, or a tactical question?",
          "Do responses vary, or does one person always joke while the other blushes?"
        ],
        "warnings": "Conversations repeat the same emotional pattern. • Exposition is delivered to someone who already knows it.",
        "advice": "Cut conversational throat-clearing, give speakers opposing agendas, and let action and silence carry some of the reaction.",
        "example": "CASE STUDY  /  The banter between Rodion and Lillian is vivid; the repeated compliment-and-blush pattern is less revealing than Remel’s accusation or the council confrontations."
      },
      {
        "id": "c10",
        "name": "Prose, imagery, and narrative voice",
        "weight": 7,
        "perfect": "Language is precise, readable, and suited to the narrator and scene; stylistic flourishes contribute rather than obscure.",
        "questions": [
          "Does this metaphor belong to this narrator’s experience and sensibility?",
          "Can I remove a qualifier or reaction without losing meaning?",
          "Does sentence rhythm change when the emotional or physical pressure changes?"
        ],
        "warnings": "The narrator explains why their own joke was funny. • A lyrical flourish sounds like a different narrator or overwhelms the moment.",
        "advice": "Preserve distinctive images, trim repeated body language and qualifiers, and favor concrete observations over accumulated adjectives.",
        "example": "CASE STUDY  /  Rodion’s comic voice and Magatha’s visuals are strong; the extended bath metaphor and habitual smirks/eyebrows sometimes feel overworked."
      },
      {
        "id": "c11",
        "name": "Worldbuilding and cultural integration",
        "weight": 7,
        "perfect": "The invented setting changes how people live and what choices cost; background information arrives when a scene needs it.",
        "questions": [
          "Which physical or social detail changes the immediate problem?",
          "Who benefits from this institution, and who bears its cost?",
          "Can the reader infer the setting from action before receiving a summary?"
        ],
        "warnings": "A large explanatory paragraph interrupts urgency. • Invented categories are named but seldom shape action.",
        "advice": "Demonstrate an institution through constraints, material objects, habits, and consequences instead of front-loading a guidebook.",
        "example": "CASE STUDY  /  Magatha’s three vertical districts turn inequality into architecture; the railcars and class restrictions give that architecture a practical life."
      },
      {
        "id": "c12",
        "name": "Magic, technology, and institutional rules",
        "weight": 5,
        "perfect": "The capabilities and limitations that resolve conflicts have been established, and laws do not change when the plot needs a shortcut.",
        "questions": [
          "What can this power do, what can it not do, and what does its use cost?",
          "Why is this security, legal, or political barrier sometimes effective and sometimes not?",
          "Was the decisive rule established before the solution depended on it?"
        ],
        "warnings": "Characters use exhausted or forbidden abilities casually when convenient. • Important people grant implausible access without explanation.",
        "advice": "Create a rules ledger: trigger, limit, cost, loophole, enforcement, and what the reader knows. Seed the rules before exploiting exceptions.",
        "example": "CASE STUDY  /  Atonosis limits, E’arezh protections, the royal vault, and the speed of Rodion’s legal clearance all need clearer operating boundaries."
      },
      {
        "id": "c13",
        "name": "Themes and emotional resonance",
        "weight": 4,
        "perfect": "The book’s ideas emerge through conflicts, costly actions, and earned emotional consequences rather than declarations alone.",
        "questions": [
          "Which belief is tested by this scene?",
          "Who pays for the character’s stated values?",
          "Did I allow a serious emotional beat to land before replacing it with humor?"
        ],
        "warnings": "A theme is announced but never tested. • An emotional consequence disappears by the next paragraph.",
        "advice": "Design choices that make an ideal expensive. Let a character’s reaction contradict their spoken philosophy and carry forward.",
        "example": "CASE STUDY  /  Freedom, class, loyalty, and hypocrisy appear throughout, especially in Rodion and Lillian; their most consequential contradictions deserve more follow-through."
      },
      {
        "id": "c14",
        "name": "Proofreading and reader-copy readiness",
        "weight": 3,
        "perfect": "The text is clean enough for an outside reader to experience the story without being pulled into accidental errors or drafting residue.",
        "questions": [
          "Did I remove outlines, tests, placeholders, and unfinished notes from the reading copy?",
          "Are dialogue tags, tense, word forms, and fictional names consistent?",
          "Did I perform a final read in a different format?"
        ],
        "warnings": "Stage directions or reminders appear inside prose. • Names and terminology change spelling, or recurring grammar errors distract.",
        "advice": "Proofread only after large-scale restructuring. Maintain a fiction style sheet; sweep for real-word errors and dialogue-tag mechanics.",
        "example": "CASE STUDY  /  Draft 2 contains a test sentence, numbered outline, internal dialogue note, and planning marker, along with name and word-form inconsistencies."
      }
    ]
  },
  {
    "id": "scene",
    "name": "Scene quality check",
    "subtitle": "5 criteria · score 0–2 each",
    "scale": 2,
    "items": [
      {
        "id": "s0",
        "name": "A character or reader has a meaningful question, need, or focus",
        "weight": 1
      },
      {
        "id": "s1",
        "name": "There is friction: resistance, uncertainty, contradiction, or pressure",
        "weight": 1
      },
      {
        "id": "s2",
        "name": "Something changes: power, knowledge, emotion, relationship, or circumstances",
        "weight": 1
      },
      {
        "id": "s3",
        "name": "The change matters later or deepens a deliberate pattern",
        "weight": 1
      },
      {
        "id": "s4",
        "name": "The scene uses its word count well; no major redundant stretch",
        "weight": 1
      }
    ]
  },
  {
    "id": "chapter",
    "name": "Chapter quality check",
    "subtitle": "6 criteria · score 0–2 each",
    "scale": 2,
    "items": [
      {
        "id": "h0",
        "name": "A clear chapter-scale purpose or meaningful inquiry",
        "weight": 1
      },
      {
        "id": "h1",
        "name": "At least one consequential change occurs",
        "weight": 1
      },
      {
        "id": "h2",
        "name": "Actions or information connect to the larger narrative",
        "weight": 1
      },
      {
        "id": "h3",
        "name": "Primary characters act consistently with established knowledge / limits",
        "weight": 1
      },
      {
        "id": "h4",
        "name": "Exposition and repeated beats are proportionate",
        "weight": 1
      },
      {
        "id": "h5",
        "name": "The ending creates a reason to continue, reflect, or reassess",
        "weight": 1
      }
    ]
  },
  {
    "id": "desk",
    "name": "Pre-scene planning",
    "subtitle": "Five questions to answer before drafting",
    "scale": 1,
    "items": [
      {
        "id": "d0",
        "name": "Who wants what now (or what is the reader meant to understand)?",
        "weight": 1
      },
      {
        "id": "d1",
        "name": "What resists, complicates, or unsettles that objective?",
        "weight": 1
      },
      {
        "id": "d2",
        "name": "What changes by the final paragraph: knowledge, emotion, status, choice, relationship, or event?",
        "weight": 1
      },
      {
        "id": "d3",
        "name": "What does that change make possible or dangerous later?",
        "weight": 1
      },
      {
        "id": "d4",
        "name": "Why must we experience this, rather than be told it happened?",
        "weight": 1
      }
    ]
  },
  {
    "id": "redflags",
    "name": "Red-flag review",
    "subtitle": "Mark each risk you have checked and addressed",
    "scale": 1,
    "items": [
      {
        "id": "f0",
        "name": "A narrator’s charm erases an irreversible consequence.",
        "weight": 1
      },
      {
        "id": "f1",
        "name": "A competent character becomes incompetent only to force the plot.",
        "weight": 1
      },
      {
        "id": "f2",
        "name": "A rule is revealed for the first time at the moment it solves the problem.",
        "weight": 1
      },
      {
        "id": "f3",
        "name": "A source of coercion is ignored when the story shifts into intimacy.",
        "weight": 1
      },
      {
        "id": "f4",
        "name": "A clue is actually an unplanned contradiction.",
        "weight": 1
      },
      {
        "id": "f5",
        "name": "A repeated scene or joke has no new emotional meaning.",
        "weight": 1
      }
    ]
  },
  {
    "id": "revision",
    "name": "Five-pass revision",
    "subtitle": "Work from structure toward proofreading",
    "scale": 1,
    "items": [
      {
        "id": "r0",
        "name": "Structure: promise, goals, causality, chronology, completeness",
        "weight": 1
      },
      {
        "id": "r1",
        "name": "Character and ethics: motives, agency, competence, emotional costs",
        "weight": 1
      },
      {
        "id": "r2",
        "name": "Scenes and exposition: turns, pacing, dialogue, worldbuilding placement",
        "weight": 1
      },
      {
        "id": "r3",
        "name": "Prose and tone: voice, clarity, rhythm, repeated gestures",
        "weight": 1
      },
      {
        "id": "r4",
        "name": "Proofreading: spelling, punctuation, style consistency, placeholders",
        "weight": 1
      }
    ]
  }
];
