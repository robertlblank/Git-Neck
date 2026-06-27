import { getDisplayName, modPitchClass } from "./notes";

export type TreySourceId =
  | "guitarworld-improv"
  | "newyorker-2025"
  | "phishnet-yem"
  | "phishnet-reba"
  | "phishnet-stash"
  | "phishnet-divided-sky"
  | "treys-guitar-rig-signal"
  | "treys-guitar-rig-2024";

export type TreySourceReference = {
  id: TreySourceId;
  title: string;
  url: string;
  use: string;
};

export type TreyVocabularyCard = {
  id: string;
  title: string;
  confidence: "VERIFIED" | "INFERRED";
  songAnchors: string[];
  coreMove: string;
  whyItMatters: string;
  practiceFocus: string;
  intervalPattern: number[];
  patternLabels: string[];
  tempoFloorBpm: number;
  tempoTargetBpm: number;
  variations: string[];
  checkpoints: string[];
  sourceIds: TreySourceId[];
};

export type TreyCurriculumWeek = {
  week: number;
  title: string;
  goal: string;
  dailyBlocks: string[];
  repertoireTargets: string[];
  passCriteria: string[];
  sourceIds: TreySourceId[];
};

export type TreyListeningAssignment = {
  title: string;
  focus: string;
  whatToMark: string[];
  sourceIds: TreySourceId[];
};

export type TreyToneNote = {
  label: string;
  confidence: "VERIFIED" | "INFERRED";
  note: string;
  sourceIds: TreySourceId[];
};

export const TREY_SOURCE_REFERENCES: TreySourceReference[] = [
  {
    id: "guitarworld-improv",
    title: "Guitar World: Phish Scales, Trey Anastasio Breaks Down His Improvisation Techniques",
    url: "https://www.guitarworld.com/lessons/phish-scales-trey-anastasio-breaks-down-his-improvisation-techniques",
    use: "Primary lesson/interview source for diatonic scale walking, groups of four, thirds, chromatic patterns, and transposition habits."
  },
  {
    id: "newyorker-2025",
    title: "The New Yorker: After Forty Years, Phish Isn't Seeking Resolution",
    url: "https://www.newyorker.com/magazine/2025/04/21/after-forty-years-phish-isnt-seeking-resolution",
    use: "Primary interview context for rhythmic variation, harmony, constraints, and composition/improvisation relationship."
  },
  {
    id: "phishnet-yem",
    title: "Phish.net: You Enjoy Myself History",
    url: "https://phish.net/song/you-enjoy-myself/history",
    use: "Song-history source for YEM's composed sections, tramps/funk segment, jam structure, and recommended listening context."
  },
  {
    id: "phishnet-reba",
    title: "Phish.net: Reba History",
    url: "https://phish.net/song/reba/history",
    use: "Song-history source for Reba's difficult composed passage, patient jam, and tension/release framing."
  },
  {
    id: "phishnet-stash",
    title: "Phish.net: Stash History",
    url: "https://phish.net/song/stash/history",
    use: "Song-history source for Stash's jazz influence, ii-V-I context, and extended dominant tension/release design."
  },
  {
    id: "phishnet-divided-sky",
    title: "Phish.net: Divided Sky History",
    url: "https://phish.net/song/divided-sky/history",
    use: "Song-history source for Divided Sky's melodic composition, palindrome segment, pause, and release behavior."
  },
  {
    id: "treys-guitar-rig-signal",
    title: "Trey's Guitar Rig: Trey's Signal Chain",
    url: "https://treysguitarrig.com/treys-signal-chain/",
    use: "Rig-context source for Whammy, wah, overdrive, modulation, delay, and Boomerang signal-chain order."
  },
  {
    id: "treys-guitar-rig-2024",
    title: "Trey's Guitar Rig: 2024 Summer",
    url: "https://treysguitarrig.com/2024/08/06/2024-summer/",
    use: "Recent rig-context source for dual Tube Screamers, Ross compressor, Whammy, wah, delay, Boomerang, vibe, amps, and cabinets."
  }
];

export const TREY_VOCABULARY: TreyVocabularyCard[] = [
  {
    id: "diatonic-groups-of-four",
    title: "Diatonic Groups Of Four",
    confidence: "VERIFIED",
    songAnchors: ["YEM", "Reba", "Chalk Dust-style peaks"],
    coreMove: "Run four-note scale cells up and down a position, then displace the starting degree.",
    whyItMatters:
      "Trey explicitly described learning Garcia-like scale navigation by walking diatonically in groups of four, then treating the pattern as a door to new ideas.",
    practiceFocus: "Even alternate picking, no rushing on the fourth note, clean position shifts.",
    intervalPattern: [0, 2, 4, 5, 2, 4, 5, 7, 4, 5, 7, 9, 5, 7, 9, 11],
    patternLabels: ["1", "2", "3", "4", "2", "3", "4", "5", "3", "4", "5", "6", "4", "5", "6", "7"],
    tempoFloorBpm: 72,
    tempoTargetBpm: 132,
    variations: [
      "Descend the same cell before moving to the next scale degree.",
      "Start each cell one eighth note late to force rhythmic displacement.",
      "Move the exact cell through Dorian, Mixolydian, then natural minor."
    ],
    checkpoints: [
      "Can sing the next four notes before playing them.",
      "Can start from any scale degree without restarting the box.",
      "Can make the last note of each cell sound intentional."
    ],
    sourceIds: ["guitarworld-improv", "newyorker-2025"]
  },
  {
    id: "descending-thirds-chain",
    title: "Descending Thirds Chain",
    confidence: "VERIFIED",
    songAnchors: ["Reba", "Divided Sky", "Foam-style composition"],
    coreMove: "Sequence diatonic thirds so the line sounds composed while still living inside the key.",
    whyItMatters:
      "Trey discussed a descending diatonic-thirds variation as one of the pattern families he extracted from players he loved and then generalized.",
    practiceFocus: "Keep the thirds lyrical; avoid making it sound like a mechanical exercise.",
    intervalPattern: [4, 0, 2, 4, 5, 2, 4, 5, 7, 4, 5, 7, 9, 5, 7, 9],
    patternLabels: ["3", "1", "2", "3", "4", "2", "3", "4", "5", "3", "4", "5", "6", "4", "5", "6"],
    tempoFloorBpm: 60,
    tempoTargetBpm: 112,
    variations: [
      "Accent only the first note of each four-note group.",
      "Play legato first, then strict alternate picking.",
      "Resolve the final note to 1, 3, or 5 of the next chord."
    ],
    checkpoints: [
      "Can hear the implied harmony moving under the line.",
      "Can play it softly without losing articulation.",
      "Can resolve the phrase before it becomes a run-on sentence."
    ],
    sourceIds: ["guitarworld-improv", "phishnet-reba", "phishnet-divided-sky"]
  },
  {
    id: "chromatic-minor-third-cell",
    title: "Chromatic Minor-Third Cell",
    confidence: "VERIFIED",
    songAnchors: ["Stash", "David Bowie", "Maze-style tension"],
    coreMove: "Use a minor-third jump followed by half-step gravity, then sequence it downward.",
    whyItMatters:
      "Trey described taking a pattern into the chromatic scale with minor-third and half-step motion, then repeating it as the group starts lower.",
    practiceFocus: "Make outside notes sound deliberate by resolving them on a strong beat.",
    intervalPattern: [0, 3, 2, -1, -2, 1, 0, -3, -4, -1, -2, -5],
    patternLabels: ["1", "m3", "2", "7", "b7", "b2", "1", "6", "b6", "7", "b7", "5"],
    tempoFloorBpm: 54,
    tempoTargetBpm: 104,
    variations: [
      "Repeat each four-note group twice before moving down.",
      "Aim every fourth note at a chord tone.",
      "Play the pattern over a static dominant chord, then over a minor vamp."
    ],
    checkpoints: [
      "Can keep time while the line sounds outside.",
      "Can resolve tension without stopping.",
      "Can move the cell to three fretboard regions."
    ],
    sourceIds: ["guitarworld-improv", "phishnet-stash"]
  },
  {
    id: "diminished-doorway",
    title: "Diminished Doorway",
    confidence: "VERIFIED",
    songAnchors: ["Stash", "David Bowie", "YEM tension bridges"],
    coreMove: "Transpose a familiar cell through diminished symmetry to build pressure before release.",
    whyItMatters:
      "Trey advised taking a pattern and transposing it to diminished scale and minor-mode environments; Stash is a natural lab for that dominant tension.",
    practiceFocus: "Cycle in minor thirds, then land on a plain major or Mixolydian phrase.",
    intervalPattern: [0, 3, 6, 9, 10, 9, 6, 3, 1, 4, 7, 10, 11, 10, 7, 4],
    patternLabels: ["1", "b3", "b5", "6", "b7", "6", "b5", "b3", "b2", "3", "5", "b7", "7", "b7", "5", "3"],
    tempoFloorBpm: 50,
    tempoTargetBpm: 96,
    variations: [
      "Play each four-note cell staccato, then legato.",
      "Resolve to 1 after two cycles, then after four cycles.",
      "Comp a dominant chord underneath before playing the line."
    ],
    checkpoints: [
      "Can explain where the release note is before starting.",
      "Can avoid overusing the sound after the release lands.",
      "Can transpose the cell by root, not just by fretboard shape."
    ],
    sourceIds: ["guitarworld-improv", "phishnet-stash"]
  },
  {
    id: "arpeggio-spine",
    title: "Arpeggio Spine",
    confidence: "INFERRED",
    songAnchors: ["YEM", "Divided Sky", "The Lizards-style composition"],
    coreMove: "Outline 1-3-5-7 first, then decorate with scalar approach notes.",
    whyItMatters:
      "Published summaries of Trey's style consistently emphasize arpeggios, and Phish.net's song histories point to through-composed material where harmony is foregrounded.",
    practiceFocus: "Make chord tones louder than passing tones.",
    intervalPattern: [0, 4, 7, 11, 12, 11, 7, 4, 2, 4, 7, 9, 11, 9, 7, 4],
    patternLabels: ["1", "3", "5", "7", "8", "7", "5", "3", "2", "3", "5", "6", "7", "6", "5", "3"],
    tempoFloorBpm: 64,
    tempoTargetBpm: 120,
    variations: [
      "Change the seventh: major 7, b7, then 6.",
      "Lead into each arpeggio tone from a half step below.",
      "Play the same outline on the top three strings only."
    ],
    checkpoints: [
      "Can name each chord tone while playing slowly.",
      "Can move the line through I-IV-V without pausing.",
      "Can create one vocal phrase from the arpeggio instead of a full run."
    ],
    sourceIds: ["newyorker-2025", "phishnet-yem", "phishnet-divided-sky"]
  },
  {
    id: "mixolydian-dorian-pivot",
    title: "Mixolydian/Dorian Pivot",
    confidence: "INFERRED",
    songAnchors: ["YEM", "Tweezer-style modal vamps", "Sand-style one-chord focus"],
    coreMove: "Treat b7 as home base, then toggle major/minor third color depending on the band bed.",
    whyItMatters:
      "Mode use is a commonly documented part of Trey's melodic vocabulary, and his own lesson advice centers on moving patterns through minor modes.",
    practiceFocus: "Keep the groove relaxed while changing color notes.",
    intervalPattern: [0, 2, 4, 7, 10, 7, 4, 2, 0, 2, 3, 7, 10, 7, 3, 2],
    patternLabels: ["1", "2", "3", "5", "b7", "5", "3", "2", "1", "2", "b3", "5", "b7", "5", "b3", "2"],
    tempoFloorBpm: 66,
    tempoTargetBpm: 118,
    variations: [
      "Play the first half bright, second half darker.",
      "Keep the same rhythm while changing only the third.",
      "Loop a two-chord vamp and decide which third wins by ear."
    ],
    checkpoints: [
      "Can hear major third versus minor third before playing.",
      "Can keep b7 stable as the modal anchor.",
      "Can make the pivot feel like melody, not theory homework."
    ],
    sourceIds: ["guitarworld-improv", "newyorker-2025", "phishnet-yem"]
  },
  {
    id: "stash-tension-release",
    title: "Stash Tension/Release",
    confidence: "VERIFIED",
    songAnchors: ["Stash"],
    coreMove: "Stay on the dominant/tension color longer than feels comfortable, then resolve clearly.",
    whyItMatters:
      "Phish.net frames Stash around extended dominant tension and release, with jazz vocabulary and ii-V-I gravity underneath.",
    practiceFocus: "Count the length of the tension zone; do not resolve early.",
    intervalPattern: [10, 1, 4, 6, 7, 6, 4, 1, 10, 8, 7, 4, 2, 1, 0],
    patternLabels: ["b7", "b9", "3", "#11", "5", "#11", "3", "b9", "b7", "b6", "5", "3", "2", "b9", "1"],
    tempoFloorBpm: 48,
    tempoTargetBpm: 92,
    variations: [
      "Hold the b9 for a full beat before resolving.",
      "Trade two bars of tension with two bars of plain Mixolydian.",
      "Record yourself and mark whether the release is obvious."
    ],
    checkpoints: [
      "Can keep the pulse through dissonance.",
      "Can land the release on beat one three times in a row.",
      "Can stop after the release instead of immediately filling space."
    ],
    sourceIds: ["phishnet-stash", "guitarworld-improv"]
  },
  {
    id: "divided-sky-sustain",
    title: "Divided Sky Sustain",
    confidence: "VERIFIED",
    songAnchors: ["Divided Sky", "Slave to the Traffic Light-style patience"],
    coreMove: "Use a simple melodic hook, let space do work, then answer with a singing release.",
    whyItMatters:
      "Divided Sky's history emphasizes melody, pause, audience tension, and a release note; this is the anti-noodle discipline in the curriculum.",
    practiceFocus: "Vibrato, bend control, silence, and note endings.",
    intervalPattern: [0, 2, 4, 7, 9, 7, 4, 2, 0, 7, 11, 12],
    patternLabels: ["1", "2", "3", "5", "6", "5", "3", "2", "1", "5", "7", "8"],
    tempoFloorBpm: 44,
    tempoTargetBpm: 78,
    variations: [
      "Add a two-beat rest after every four notes.",
      "Sustain the peak note until it decays naturally.",
      "Repeat the phrase with one fewer note each time."
    ],
    checkpoints: [
      "Can make one note feel finished.",
      "Can count silence without rushing back in.",
      "Can control vibrato width at low volume."
    ],
    sourceIds: ["phishnet-divided-sky", "newyorker-2025"]
  },
  {
    id: "reba-peak-ladder",
    title: "Reba Peak Ladder",
    confidence: "VERIFIED",
    songAnchors: ["Reba"],
    coreMove: "Build from small, pretty cells into a single high point instead of starting at peak intensity.",
    whyItMatters:
      "Reba is repeatedly discussed as a patient build and tension/release vehicle after a demanding composed section.",
    practiceFocus: "Dynamic ramping, register planning, and restraint.",
    intervalPattern: [0, 2, 4, 2, 0, 4, 5, 7, 5, 4, 7, 9, 11, 12],
    patternLabels: ["1", "2", "3", "2", "1", "3", "4", "5", "4", "3", "5", "6", "7", "8"],
    tempoFloorBpm: 58,
    tempoTargetBpm: 108,
    variations: [
      "Play three choruses: whisper, talk, sing.",
      "Move the peak note one string higher each chorus.",
      "Delay the highest note by one measure."
    ],
    checkpoints: [
      "Can play the first chorus under the band.",
      "Can identify the single peak note before starting.",
      "Can end with melody rather than speed."
    ],
    sourceIds: ["phishnet-reba", "newyorker-2025"]
  }
];

export const TREY_CURRICULUM_WEEKS: TreyCurriculumWeek[] = [
  {
    week: 1,
    title: "Diatonic Machinery",
    goal: "Make groups of four and thirds automatic in two positions.",
    dailyBlocks: [
      "5 min: one key, groups of four, no tempo increase until clean.",
      "5 min: descending thirds chain with chord-tone accents.",
      "5 min: free improv using only those two devices."
    ],
    repertoireTargets: ["YEM clean-line listening", "Reba composed-to-jam transition"],
    passCriteria: [
      "Play both cells in three keys at 90 bpm.",
      "Start on scale degrees 1, 2, 3, and 5 without hesitation.",
      "Record one 60-second chorus with no more than two timing slips."
    ],
    sourceIds: ["guitarworld-improv", "phishnet-yem", "phishnet-reba"]
  },
  {
    week: 2,
    title: "Harmony First",
    goal: "Use arpeggios as the skeleton and scales as decoration.",
    dailyBlocks: [
      "5 min: 1-3-5-7 arpeggio spines in I-IV-V.",
      "5 min: approach each chord tone from above and below.",
      "5 min: two-bar call, two-bar response."
    ],
    repertoireTargets: ["Divided Sky melody discipline", "YEM composed-section clarity"],
    passCriteria: [
      "Name each chord tone while playing at 72 bpm.",
      "Resolve three improvised phrases to 3, 5, and 7.",
      "Leave a full bar of silence without losing the form."
    ],
    sourceIds: ["newyorker-2025", "phishnet-divided-sky", "phishnet-yem"]
  },
  {
    week: 3,
    title: "Controlled Dissonance",
    goal: "Make chromatic and diminished material sound intentional.",
    dailyBlocks: [
      "5 min: chromatic minor-third cell slowly with metronome.",
      "5 min: diminished doorway, resolve after two cycles.",
      "5 min: Stash tension/release over a static dominant vamp."
    ],
    repertoireTargets: ["Stash", "David Bowie-style tension zones"],
    passCriteria: [
      "Resolve outside phrases on beat one five times.",
      "Play diminished cells in four roots.",
      "Record a tension phrase where the release is obvious."
    ],
    sourceIds: ["guitarworld-improv", "phishnet-stash"]
  },
  {
    week: 4,
    title: "Modal Color",
    goal: "Hear and control the major/minor third pivot over b7-centered grooves.",
    dailyBlocks: [
      "5 min: Mixolydian cell, Dorian cell, then toggle.",
      "5 min: one-chord vamp with only three allowed target notes.",
      "5 min: build a 16-bar solo using one motif."
    ],
    repertoireTargets: ["YEM jam segment", "one-chord Phish groove listening"],
    passCriteria: [
      "Switch between 3 and b3 without moving tempo.",
      "Keep a two-bar rhythmic motif through four repeats.",
      "Record a solo that uses fewer notes in the second half."
    ],
    sourceIds: ["guitarworld-improv", "newyorker-2025", "phishnet-yem"]
  },
  {
    week: 5,
    title: "Peak And Release",
    goal: "Build to a high point with patience, not volume panic.",
    dailyBlocks: [
      "5 min: Reba peak ladder with planned highest note.",
      "5 min: Divided Sky sustain with timed silence.",
      "5 min: two takes, compare which one breathes more."
    ],
    repertoireTargets: ["Reba", "Divided Sky"],
    passCriteria: [
      "Hold a sustained note with controlled vibrato for four beats.",
      "Play a 90-second build with one clear peak.",
      "Use silence as a counted event, not a pause in thinking."
    ],
    sourceIds: ["phishnet-reba", "phishnet-divided-sky", "newyorker-2025"]
  },
  {
    week: 6,
    title: "Integration",
    goal: "Turn the devices into musical choices under practice-room pressure.",
    dailyBlocks: [
      "5 min: random vocabulary card, one key only.",
      "5 min: same card in a new key and fretboard region.",
      "5 min: record a mini-jam with one deliberate quote of the device."
    ],
    repertoireTargets: ["YEM", "Stash", "Reba", "Divided Sky"],
    passCriteria: [
      "Use five vocabulary cards in one 10-minute practice.",
      "Identify which device appeared in your own recording.",
      "Write one new original lick from each source device."
    ],
    sourceIds: ["guitarworld-improv", "newyorker-2025", "phishnet-yem", "phishnet-stash", "phishnet-reba"]
  }
];

export const TREY_LISTENING_ASSIGNMENTS: TreyListeningAssignment[] = [
  {
    title: "YEM: composed precision into funk release",
    focus: "Listen for the shift from intricate composed material to a groove where the guitar can lead, answer, or get out of the way.",
    whatToMark: ["first clean arpeggio-like run", "first rhythmic motif", "moment Trey stops leading"],
    sourceIds: ["phishnet-yem"]
  },
  {
    title: "Stash: dominant pressure",
    focus: "Mark how long the band can stay tense before the release lands.",
    whatToMark: ["first outside note", "longest unresolved zone", "release note or chord"],
    sourceIds: ["phishnet-stash"]
  },
  {
    title: "Reba: patient ascent",
    focus: "Track the dynamic arc from pretty restraint to the peak.",
    whatToMark: ["first register lift", "single highest emotional point", "post-peak landing"],
    sourceIds: ["phishnet-reba"]
  },
  {
    title: "Divided Sky: melody and silence",
    focus: "Study how melody, pause, and audience tension function as part of the composition.",
    whatToMark: ["pause length", "release note", "vibrato width on sustained notes"],
    sourceIds: ["phishnet-divided-sky"]
  }
];

export const TREY_TONE_NOTES: TreyToneNote[] = [
  {
    label: "Dual overdrive stack",
    confidence: "VERIFIED",
    note: "Recent rig reporting lists two Analogman-modded Tube Screamers in Trey's gain section; use your two TS pedals as low-gain/more-gain stages for this curriculum.",
    sourceIds: ["treys-guitar-rig-2024"]
  },
  {
    label: "Compression before patient lines",
    confidence: "VERIFIED",
    note: "Recent rig reporting lists a Ross Compressor in the gain/overdrive group; use compression to even clean runs, not to hide weak fretting.",
    sourceIds: ["treys-guitar-rig-2024"]
  },
  {
    label: "Effects are secondary to phrasing",
    confidence: "INFERRED",
    note: "Whammy, wah, vibe, delay, and Boomerang are documented in rig sources, but the first six weeks should stay mostly dry so timing, note choice, and release are exposed.",
    sourceIds: ["treys-guitar-rig-signal", "treys-guitar-rig-2024"]
  }
];

export function transposeTreyPattern(rootPitchClass: number, intervalPattern: number[]): string[] {
  return intervalPattern.map((interval) => getDisplayName(modPitchClass(rootPitchClass + interval)));
}

export function getTreySourceReferences(sourceIds: TreySourceId[]): TreySourceReference[] {
  const sourceSet = new Set(sourceIds);
  return TREY_SOURCE_REFERENCES.filter((source) => sourceSet.has(source.id));
}
