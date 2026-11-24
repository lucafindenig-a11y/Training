// Übungskatalog mit Merkmalen, Anleitungen und Quellenangaben.
//
// Herkunft der Inhalte: Die Texte sind eigene, gekürzte deutsche Zusammenfassungen der jeweils
// verlinkten Quelle (abgerufen am SOURCES_CHECKED). Bereiche, Equipment und Level folgen den
// Angaben der Quelle (ACE: Beginner/Intermediate/Advanced → Einsteiger/Fortgeschritten/Erfahren).
// „Arme“ aus den ACE-Angaben ist bei Druckübungen als Trizeps, bei Zugübungen als Bizeps eingeordnet.
// Wo eine Quelle keine Fehler ausdrücklich nennt, sind „Typische Fehler“ aus ihren
// Ausführungshinweisen abgeleitet (mistakesDerived) oder bleiben leer.
// Die Zuordnung zu Push/Pull/Beine usw. (splits) und die Startwerte (defaults) sind
// redaktionelle Vorschläge zum Einordnen – keine Angaben der Quellen.

export const SOURCES_CHECKED = '2026-11-24';

export const SOURCES = {
  ace: {
    name: 'American Council on Exercise (ACE) – Exercise Library',
    url: 'https://www.acefitness.org/resources/everyone/exercise-library/',
  },
  concept2: {
    name: 'Concept2 – Indoor Rowing Technique',
    url: 'https://www.concept2.com/training/rowing-technique',
  },
};

export const MUSCLES = {
  brust: 'Brust',
  schultern: 'Schultern',
  trizeps: 'Trizeps',
  bizeps: 'Bizeps',
  ruecken: 'Rücken',
  bauch: 'Bauch & Rumpf',
  gesaess: 'Gesäß & Hüfte',
  oberschenkel: 'Oberschenkel',
  waden: 'Waden',
  ganzkoerper: 'Ganzkörper',
};

export const TYPES = { kraft: 'Kraft', cardio: 'Cardio', mobility: 'Mobility' };

export const EQUIPMENT = {
  keins: 'Ohne Equipment',
  langhantel: 'Langhantel',
  kurzhantel: 'Kurzhanteln',
  kettlebell: 'Kettlebell',
  kabelzug: 'Kabelzug / Band',
  maschine: 'Maschine',
  bank: 'Bank',
  klimmzugstange: 'Klimmzugstange',
  schlingentrainer: 'Schlingentrainer',
  gymnastikball: 'Gymnastikball',
  bosu: 'BOSU-Ball',
  rudergeraet: 'Rudergerät',
};

export const LEVELS = { einsteiger: 'Einsteiger', fortgeschritten: 'Fortgeschritten', erfahren: 'Erfahren' };

// Schwerpunkte für Trainingstage und welche Übungsgruppen dazu passen.
export const FOCUS = {
  push: { label: 'Push', hint: 'Brust, Schultern, Trizeps', splits: ['push'] },
  pull: { label: 'Pull', hint: 'Rücken, Bizeps, hintere Schulter', splits: ['pull'] },
  beine: { label: 'Beine', hint: 'Oberschenkel, Gesäß, Waden', splits: ['beine'] },
  oberkoerper: { label: 'Oberkörper', hint: 'Push- und Pull-Übungen', splits: ['push', 'pull'] },
  unterkoerper: { label: 'Unterkörper', hint: 'Bein- und Gesäßübungen', splits: ['beine'] },
  ganzkoerper: { label: 'Ganzkörper', hint: 'Übungen für mehrere große Bereiche', splits: ['ganzkoerper'] },
  core: { label: 'Core', hint: 'Bauch & Rumpf', splits: ['core'] },
  cardio: { label: 'Cardio', hint: 'Ausdauer & Intervalle', splits: ['cardio'] },
  mobility: { label: 'Mobility', hint: 'Beweglichkeit & Dehnen', splits: ['mobility'] },
};

const ace = (n, slug, title) => ({ key: 'ace', url: `https://www.acefitness.org/resources/everyone/exercise-library/${n}/${slug}/`, title });

function E(id, name, o) {
  return {
    id, name, aliases: [], muscles: [], equipment: ['keins'], types: ['kraft'], level: null,
    splits: [], compound: false, unit: 'wdh', defaults: { sets: 3, reps: '10-12', rest: 60, notes: '' },
    start: '', steps: [], cues: [], mistakes: [], mistakesDerived: false, variations: [], related: [], source: null,
    ...o,
    defaults: { sets: 3, reps: '10-12', rest: 60, notes: '', ...(o.defaults ?? {}) },
  };
}

export const EXERCISES = [
  // ---------------- Push: Brust, Schultern, Trizeps ----------------
  E('bankdruecken', 'Bankdrücken (Langhantel)', {
    aliases: ['Bankdrücken', 'Bench Press', 'Langhantel-Bankdrücken', 'Flachbankdrücken'],
    muscles: ['brust', 'schultern', 'trizeps'], equipment: ['langhantel', 'bank'], level: 'einsteiger',
    splits: ['push', 'ganzkoerper'], compound: true, defaults: { reps: '6-10', rest: 120 },
    start: 'Rücklings auf eine Flachbank legen und die Stange etwas breiter als schulterbreit greifen. Füße fest auf den Boden, Hüfte und Rücken an die Bank drücken und die Stange aus der Ablage heben.',
    steps: [
      'Die Stange zur Brust absenken; die Ellbogen bewegen sich dabei seitlich nach außen.',
      'Stoppen, wenn die Ellbogen knapp unter Bankhöhe sind.',
      'Die Füße in den Boden drücken und die Stange gerade nach oben in die Ausgangsposition drücken.',
    ],
    cues: ['Füße, Hüfte und Rücken behalten während der ganzen Übung Kontakt zu Boden und Bank.'],
    mistakes: ['Hüfte oder Rücken lösen sich von der Bank.', 'Die Stange deutlich tiefer absenken als bis knapp unter Bankhöhe der Ellbogen.'],
    mistakesDerived: true,
    related: ['kh-bankdruecken', 'enges-bankdruecken', 'kh-schraegbank'],
    source: ace(5, 'chest-press', 'Chest Press (Langhantel, Flachbank)'),
  }),
  E('kh-bankdruecken', 'Kurzhantel-Bankdrücken', {
    aliases: ['Kurzhantel Bankdrücken', 'KH-Bankdrücken', 'Dumbbell Bench Press', 'Dumbbell Chest Press'],
    muscles: ['brust', 'schultern', 'trizeps'], equipment: ['kurzhantel', 'bank'], level: 'fortgeschritten',
    splits: ['push', 'ganzkoerper'], compound: true, defaults: { reps: '8-12', rest: 90 },
    start: 'Mit zwei Kurzhanteln rücklings auf eine Flachbank legen, Füße flach auf dem Boden, Wirbelsäule neutral. Wenn möglich, eine Person zum Sichern dazunehmen.',
    steps: [
      'Die Hanteln nach oben drücken, bis die Ellbogen gestreckt sind – etwa auf Augenhöhe oder knapp darunter.',
      'Langsam Richtung Brustmitte absenken; die Hanteln wandern dabei etwas nach außen Richtung Achseln.',
      'Ohne Abfedern wieder nach oben drücken.',
    ],
    cues: ['Kontakt zu Bank und Boden halten.', 'Handgelenke gerade halten.', 'Eng geführte Ellbogen betonen laut Quelle den Trizeps, seitlich geöffnete Ellbogen die Brust.'],
    mistakes: ['Hohlkreuz – der untere Rücken hebt deutlich von der Bank ab.', 'Die Hanteln in der unteren Position abfedern.', 'Abgeknickte Handgelenke.'],
    related: ['bankdruecken', 'kh-schraegbank', 'brustpresse'],
    source: ace(19, 'chest-press', 'Chest Press (Kurzhanteln)'),
  }),
  E('kh-schraegbank', 'Schrägbankdrücken (Kurzhantel)', {
    aliases: ['Schrägbankdrücken', 'Schrägbank', 'Incline Dumbbell Press', 'Incline Chest Press'],
    muscles: ['brust', 'schultern'], equipment: ['kurzhantel', 'bank'], level: 'einsteiger',
    splits: ['push'], compound: true, defaults: { reps: '8-12', rest: 90 },
    start: 'Die Bank auf 45–60 Grad einstellen. Mit zwei Kurzhanteln rücklings anlehnen, Füße fest auf dem Boden, Wirbelsäule neutral.',
    steps: [
      'Die Hanteln nach oben drücken, bis sie bei gestreckten Ellbogen etwa über Augenhöhe oder etwas höher sind.',
      'Langsam Richtung obere Brust absenken, leicht nach außen Richtung Achseln; die Ellbogen bleiben unter den Handgelenken.',
      'Zurück in die Ausgangsposition drücken.',
    ],
    cues: ['Kontakt zu Bank und Boden halten.', 'Handgelenke gerade halten.', 'Eine sichernde Person wird empfohlen.'],
    mistakes: ['Hohlkreuz.', 'Die Hanteln unten abfedern.', 'Abgeknickte Handgelenke.'],
    related: ['kh-bankdruecken', 'bankdruecken'],
    source: ace(25, 'incline-chest-press', 'Incline Chest Press'),
  }),
  E('liegestuetz', 'Liegestütz', {
    aliases: ['Liegestütze', 'Liegestützen', 'Push-up', 'Pushup', 'Push-ups'],
    muscles: ['brust', 'schultern', 'trizeps'], level: 'fortgeschritten',
    splits: ['push', 'ganzkoerper'], compound: true, defaults: { reps: '8-15', rest: 90 },
    start: 'Auf einer Matte knien, die Füße hinter dem Körper zusammenführen und die Handflächen schulterbreit flach aufsetzen. In den Stütz gehen: Schultern über den Händen, Körper von Kopf bis Knöchel in einer Linie, Rumpf angespannt.',
    steps: [
      'Den Körper als Einheit absenken, bis Brust oder Kinn den Boden berühren; die Ellbogen gehen dabei nach außen.',
      'Den Rumpf fest halten und über die Arme wieder hochdrücken, bis die Ellbogen gestreckt sind.',
    ],
    cues: ['Den Kopf in Verlängerung der Wirbelsäule halten.'],
    mistakes: ['Der untere Rücken hängt durch.', 'Die Hüfte schiebt sich nach oben.'],
    variations: ['Hände nach vorn drehen und die Ellbogen eng am Körper führen: mehr Trizeps-Einsatz und laut Quelle möglicherweise weniger Belastung für die Schultern.'],
    related: ['kh-bankdruecken', 'plank', 'bankdruecken'],
    source: ace(41, 'push-up', 'Push-up'),
  }),
  E('kabel-fliegende', 'Fliegende am Kabelzug (stehend)', {
    aliases: ['Kabelzug Fliegende', 'Fliegende Kabel', 'Cable Fly', 'Standing Chest Fly', 'Cable Crossover'],
    muscles: ['brust'], equipment: ['kabelzug'], level: 'fortgeschritten',
    splits: ['push'], defaults: { reps: '10-15', rest: 60 },
    start: 'Zwei Kabelrollen etwas über Schulterhöhe einstellen, in jede Hand einen Griff nehmen und nach vorn treten. Die Arme sind seitlich ausgestreckt, die Ellbogen leicht gebeugt.',
    steps: [
      'Beide Hände langsam vor dem Körper zusammenführen.',
      'Eine Sekunde halten.',
      'Langsam in die Ausgangsposition zurückkehren.',
    ],
    cues: ['Langsam arbeiten – beim Zusammenführen und beim Zurückgehen.'],
    mistakes: ['Schnelles, schwungvolles Zurückgehen statt einer langsamen Rückkehr.', 'Keine kurze Pause vor dem Körper.'],
    mistakesDerived: true,
    related: ['brustpresse', 'kh-bankdruecken'],
    source: ace(160, 'standing-chest-fly', 'Standing Chest Fly'),
  }),
  E('brustpresse', 'Brustpresse (Maschine)', {
    aliases: ['Brustpresse', 'Chest Press Maschine', 'Seated Chest Press', 'Maschinen-Brustpresse'],
    muscles: ['brust'], equipment: ['maschine'], level: 'einsteiger',
    splits: ['push'], compound: true, defaults: { reps: '10-12', rest: 90 },
    start: 'Den Sitz so einstellen, dass die Griffe auf Höhe der Brustmitte sind. Rücken an die Lehne, Griffe ganz umfassen, Handgelenke gerade, Füße auf Boden oder Fußstütze. Bauch anspannen, ohne den unteren Rücken ins Polster zu pressen, Schulterblätter nach hinten unten ziehen.',
    steps: [
      'Ausatmen und nach vorn drücken, bis die Ellbogen gestreckt, aber nicht durchgedrückt sind.',
      'Die Schulterblätter bleiben dabei an der Rückenlehne.',
      'Die Ellbogen langsam beugen und zurückkehren.',
    ],
    mistakes: ['Den unteren Rücken in die Lehne pressen oder ins Hohlkreuz gehen.', 'Die Schultern nach vorn rollen, statt die Schulterblätter an der Lehne zu lassen.', 'Die Ellbogen am Ende durchdrücken.'],
    variations: ['Einarmig drücken.', 'Ohne Rückenlehne sitzen – dann muss der Rumpf mehr stabilisieren.'],
    related: ['bankdruecken', 'kh-bankdruecken'],
    source: ace(188, 'seated-chest-press', 'Seated Chest Press'),
  }),
  E('schulterdruecken-lh', 'Schulterdrücken stehend (Langhantel)', {
    aliases: ['Military Press', 'Overhead Press', 'Schulterdrücken Langhantel', 'Standing Shoulder Press'],
    muscles: ['schultern', 'trizeps'], equipment: ['langhantel'], level: 'erfahren',
    splits: ['push'], compound: true, defaults: { reps: '6-10', rest: 120 },
    start: 'Die Stange im Ständer etwa auf Schulterhöhe ablegen. Etwas breiter als schulterbreit greifen und so unter die Stange gehen, dass sie oben auf den Schultern liegt; die Ellbogen zeigen nach vorn.',
    steps: [
      'Mit der Stange zurücktreten; der Rücken bleibt gerade und aufrecht.',
      'Die Stange senkrecht über den Kopf drücken.',
      'Langsam zurück auf die Schultern absenken und wiederholen.',
    ],
    cues: ['Rücken während der ganzen Bewegung gerade und aufrecht halten.'],
    mistakes: ['Ins Hohlkreuz ausweichen statt aufrecht zu bleiben.', 'Die Stange schnell statt langsam auf die Schultern zurückfallen lassen.'],
    mistakesDerived: true,
    related: ['schulterdruecken-kh', 'seitheben'],
    source: ace(71, 'standing-shoulder-press', 'Standing Shoulder Press'),
  }),
  E('schulterdruecken-kh', 'Schulterdrücken sitzend (Kurzhantel)', {
    aliases: ['Schulterdrücken', 'Kurzhantel Schulterdrücken', 'Seated Overhead Press', 'Dumbbell Shoulder Press'],
    muscles: ['schultern', 'trizeps'], equipment: ['kurzhantel', 'bank'], level: 'fortgeschritten',
    splits: ['push', 'ganzkoerper'], compound: true, defaults: { reps: '8-12', rest: 90 },
    start: 'Aufrecht auf eine Bank mit Lehne setzen: Hinterkopf, Schultern und Gesäß an der Lehne, Füße flach. Die Hanteln auf Schulterhöhe bringen, Handflächen nach vorn, etwa schulterbreit; Schulterblätter nach hinten unten ziehen.',
    steps: [
      'Die Hanteln nach oben drücken, bis die Ellbogen gestreckt sind; die Ellbogen bleiben dabei etwas vor dem Körper.',
      'Langsam absenken, indem du die Ellbogen beugst und die Hanteln aktiv nach unten führst.',
    ],
    cues: ['Körperkontakt zur Bank halten.', 'Handgelenke gerade halten.'],
    mistakes: ['Hohlkreuz.', 'Abgeknickte Handgelenke.', 'Den Kontakt zur Bank verlieren.'],
    related: ['schulterdruecken-lh', 'seitheben'],
    source: ace(45, 'seated-overhead-press', 'Seated Overhead Press'),
  }),
  E('seitheben', 'Seitheben (Kurzhantel)', {
    aliases: ['Seitheben', 'Seitliches Heben', 'Lateral Raise'],
    muscles: ['schultern'], equipment: ['kurzhantel'], level: 'einsteiger',
    splits: ['push'], defaults: { reps: '12-15', rest: 60 },
    start: 'Stehen, die Hanteln seitlich an den Oberschenkeln, Handflächen zueinander, Ellbogen gestreckt oder leicht gebeugt. Schrittstellung oder Füße etwas weiter als hüftbreit; Rumpf anspannen, Schulterblätter nach hinten unten.',
    steps: [
      'Die Hanteln mit führenden Ellbogen seitlich nach oben anheben.',
      'Ab etwa 60–70 Grad die Hanteln leicht nach oben drehen, bis die Arme auf Schulterhöhe sind.',
      'Langsam absenken und die Hanteln ab 60–70 Grad wieder leicht zurückdrehen.',
    ],
    cues: ['Oberkörper aufrecht, Handgelenke gerade.', 'Die leichte Drehung kann laut Quelle das Risiko verringern, dass in der Schulter etwas eingeklemmt wird (Impingement).'],
    mistakes: ['Den Oberkörper nicht aufrecht halten (Hohlkreuz).', 'Abgeknickte Handgelenke.'],
    related: ['schulterdruecken-kh', 'reverse-fly'],
    source: ace(26, 'lateral-raise', 'Lateral Raise'),
  }),
  E('trizeps-pushdown', 'Trizepsdrücken am Kabel', {
    aliases: ['Trizepsdrücken', 'Trizeps Kabel', 'Triceps Pushdown', 'Triceps Pressdown', 'Pushdown'],
    muscles: ['trizeps'], equipment: ['kabelzug'], level: 'einsteiger',
    splits: ['push'], defaults: { reps: '10-15', rest: 60 },
    start: 'Füße hüftbreit, Hüfte und Rücken gerade und aufrecht, Knie leicht gebeugt. Das Kabel ganz oben einstellen, ein Seil als Griff nehmen und mit beiden Händen fassen.',
    steps: [
      'Die Ellbogen eng an die Körperseiten nehmen.',
      'Die Hände nach unten Richtung Boden drücken, bis die Arme gestreckt sind.',
      'Die Ellbogen beugen und zurück in die Ausgangsposition.',
    ],
    cues: ['Die Ellbogen bleiben eng am Körper.'],
    mistakes: ['Die Ellbogen lösen sich vom Körper und wandern nach vorn.', 'Den Oberkörper nicht aufrecht halten.'],
    mistakesDerived: true,
    related: ['trizeps-ueberkopf', 'enges-bankdruecken'],
    source: ace(3, 'triceps-pressdown', 'Triceps Pressdown'),
  }),
  E('trizeps-ueberkopf', 'Trizepsstrecken über Kopf (Kurzhantel)', {
    aliases: ['Trizepsstrecken', 'Overhead Triceps Extension', 'Triceps Extension', 'French Press Kurzhantel'],
    muscles: ['trizeps'], equipment: ['kurzhantel'], level: 'fortgeschritten',
    splits: ['push'], defaults: { reps: '10-12', rest: 60 },
    start: 'Schrittstellung, eine Kurzhantel mit beiden Händen halten. Rumpf anspannen, Schulterblätter nach hinten unten, Kopf und Hals in Linie mit der Wirbelsäule.',
    steps: [
      'Die Hantel über den Kopf drücken, bis die Oberarme senkrecht und die Ellbogen gestreckt, aber nicht durchgedrückt sind.',
      'Die Ellbogen beugen und die Hantel hinter den Kopf absenken – bis etwa 90 Grad oder bis die Oberarme nach hinten ausweichen würden.',
      'Die Oberarme bleiben senkrecht, die Ellbogen etwa schulterbreit; wieder nach oben strecken.',
    ],
    cues: ['Kopf, Rumpf, Oberarme, Handgelenke und Füße bleiben ruhig.'],
    mistakes: ['Mit der Hantel den Hinterkopf berühren.', 'Die Oberarme bewegen sich mit oder die Ellbogen gehen weit auseinander.'],
    related: ['trizeps-pushdown'],
    source: ace(74, 'triceps-extension', 'Triceps Extension'),
  }),
  E('enges-bankdruecken', 'Enges Bankdrücken', {
    aliases: ['Close Grip Bench Press', 'Enges Bankdrücken Langhantel'],
    muscles: ['trizeps', 'brust'], equipment: ['langhantel', 'bank'], level: 'fortgeschritten',
    splits: ['push'], compound: true, defaults: { reps: '6-10', rest: 120 },
    start: 'Rücklings auf eine Hantelbank legen. Die Stange so greifen, dass die Hände in Linie mit den Schultern sind; die Ellbogen zeigen Richtung Füße.',
    steps: [
      'Die Stange aus der Ablage nehmen und zur Brust absenken; die Ellbogen bleiben dabei nah an den Rippen.',
      'Füße in den Boden und Hüfte in die Bank drücken und die Stange zurück in die Ausgangsposition drücken.',
    ],
    cues: ['Die Ellbogen nah an den Rippen führen.'],
    mistakes: ['Die Ellbogen weit nach außen abspreizen.'],
    mistakesDerived: true,
    related: ['bankdruecken', 'trizeps-pushdown'],
    source: ace(311, 'close-grip-bench-press', 'Close-grip Bench Press'),
  }),

  // ---------------- Pull: Rücken, Bizeps, hintere Schulter ----------------
  E('klimmzug', 'Klimmzüge', {
    aliases: ['Klimmzug', 'Pull-up', 'Pull-ups', 'Pullups'],
    muscles: ['ruecken', 'bizeps'], equipment: ['klimmzugstange'], level: 'fortgeschritten',
    splits: ['pull', 'ganzkoerper'], compound: true, defaults: { reps: '5-8', rest: 120 },
    start: 'Unter die Stange stellen und sie mit vollem Griff fassen, die Handflächen zeigen vom Körper weg. Bauch anspannen, ein Bein über das andere kreuzen, Handgelenke gerade, Schulterblätter nach hinten unten ziehen.',
    steps: [
      'Ausatmen und hochziehen: Ellbogen beugen und Richtung Körperseiten nach unten führen; der Körper bleibt senkrecht.',
      'Hochziehen, bis das Kinn auf Höhe der Stange bzw. der Hände ist.',
      'Kurz halten und langsam bis zur vollständigen Armstreckung absenken.',
    ],
    cues: ['Schulter- und Handgelenksposition auch beim Absenken beibehalten.'],
    mistakes: ['Schwung holen oder mit dem Körper pendeln.'],
    variations: ['Schwerer: Zusatzgewicht mit einem Gewichtsgürtel.', 'Enger Obergriff: verlagert die Arbeit laut Quelle vom breiten Rückenmuskel stärker auf den oberen Rücken.'],
    related: ['latziehen', 'trx-rudern'],
    source: ace(191, 'pull-ups', 'Pull-ups'),
  }),
  E('latziehen', 'Latziehen', {
    aliases: ['Latzug', 'Lat-Ziehen', 'Lat Pulldown', 'Latziehen Maschine'],
    muscles: ['ruecken'], equipment: ['maschine'], level: 'einsteiger',
    splits: ['pull', 'ganzkoerper'], compound: true, defaults: { reps: '8-12', rest: 90 },
    start: 'Hinsetzen, das Polster fest auf den Oberschenkeln. Bauch anspannen, die Stange mit beiden Händen greifen, Schulterblätter nach hinten unten, leicht zurücklehnen (höchstens etwa 30 Grad), Kopf in Verlängerung der Wirbelsäule.',
    steps: [
      'Ausatmen und die Bewegung mit dem Absenken der Schulterblätter beginnen; dann die Stange zur oberen bis mittleren Brust ziehen – die Ellbogen bewegen sich zu den Körperseiten.',
      'Stoppen, wenn die Stange nahe der Brust ist oder die Ellbogen beginnen, nach hinten zu wandern.',
      'Kurz halten und langsam zurückführen, bis die Ellbogen gestreckt sind und die Schulterblätter leicht nach oben gehen.',
    ],
    mistakes: ['Hohlkreuz.', 'Sich während des Ziehens weiter nach hinten lehnen.', 'Weiterziehen, obwohl die Ellbogen schon nach hinten wandern – laut Quelle zum Schutz der Schulter vermeiden.'],
    variations: ['Im Stehen: Schrittstellung, Knie leicht gebeugt, Gewicht auf dem hinteren Bein; nicht in der Hüfte nach vorn beugen.'],
    related: ['klimmzug', 'kabelrudern'],
    source: ace(158, 'seated-lat-pulldown', 'Seated Lat Pulldown'),
  }),
  E('lh-rudern', 'Langhantelrudern vorgebeugt', {
    aliases: ['Langhantelrudern', 'Vorgebeugtes Rudern', 'Rudern vorgebeugt', 'Bent-over Row'],
    muscles: ['ruecken', 'schultern', 'bizeps'], equipment: ['langhantel'], level: 'erfahren',
    splits: ['pull'], compound: true, defaults: { reps: '6-10', rest: 120 },
    start: 'Die Stange im Obergriff fassen, Handgelenke, Ellbogen und Schultern in einer Linie. Die Stange aus dem Ständer nehmen, in der Hüfte nach vorn beugen, Rücken gerade, Knie leicht gebeugt.',
    steps: [
      'Die Stange Richtung Boden sinken lassen, bis die Ellbogen ganz gestreckt sind.',
      'Die Stange mit flachem Rücken Richtung Bauchnabel ziehen.',
      'Langsam in die Ausgangsposition absenken.',
    ],
    cues: ['Der Rücken bleibt während der ganzen Übung gerade und flach.'],
    mistakes: ['Rundrücken beim Ziehen oder Absenken.'],
    mistakesDerived: true,
    related: ['kh-rudern', 'kabelrudern'],
    source: ace(12, 'bent-over-row', 'Bent-Over Row'),
  }),
  E('kh-rudern', 'Einarmiges Kurzhantelrudern', {
    aliases: ['Kurzhantelrudern', 'Rudern einarmig', 'Single-arm Row', 'One Arm Row'],
    muscles: ['ruecken'], equipment: ['kurzhantel', 'bank'], level: 'fortgeschritten',
    splits: ['pull', 'ganzkoerper'], compound: true, defaults: { reps: '8-12', rest: 90, notes: 'je Seite' },
    start: 'Hantel in die rechte Hand. Linkes Knie und linke Hand auf die Bank – Hand unter der Schulter, Knie unter der Hüfte. Rumpf anspannen, Rücken flach, Kopf in Linie, Schulterblätter nach hinten unten; der rechte Arm hängt Richtung Boden, ohne den Oberkörper zu drehen.',
    steps: [
      'Ausatmen und die Hantel nach oben ziehen: Ellbogen beugen, den Oberarm nah am Körper nach hinten führen – so weit, wie es ohne Drehung des Oberkörpers geht.',
      'Einatmen und langsam absenken; der Rücken bleibt flach, die Schulter zurückgezogen.',
      'Nach den Wiederholungen die Seite wechseln.',
    ],
    cues: ['Ein Spiegel hilft, eine Drehung des Oberkörpers zu bemerken.'],
    mistakes: ['Den Oberkörper aufdrehen oder die Haltung der Wirbelsäule verändern, um die Hantel höher zu bekommen.'],
    related: ['lh-rudern', 'kabelrudern'],
    source: ace(126, 'single-arm-row', 'Single-arm Row'),
  }),
  E('kabelrudern', 'Rudern am Kabel (sitzend)', {
    aliases: ['Kabelrudern', 'Rudern sitzend', 'Rudern', 'Seated Row', 'Seated Cable Row'],
    muscles: ['ruecken', 'bizeps'], equipment: ['kabelzug'], level: 'einsteiger',
    splits: ['pull', 'ganzkoerper'], compound: true, defaults: { reps: '10-12', rest: 90 },
    start: 'An einer Kabelzugstation mit schmalem Griff hinsetzen, Füße auf Boden oder Fußstütze, Knie gebeugt, Rücken gerade.',
    steps: [
      'Den Griff halten, die Brust anheben und die Ellbogen langsam nah an den Rippen nach hinten ziehen, bis der Griff die Vorderseite des Bauchs berührt.',
      'Eine Sekunde halten.',
      'Die Arme langsam strecken und zurück in die Ausgangsposition.',
    ],
    cues: ['Den Rücken gerade halten.'],
    mistakes: ['Mit rundem Rücken ziehen.', 'Ohne Pause zurückschnellen lassen statt langsam zu strecken.'],
    mistakesDerived: true,
    related: ['latziehen', 'kh-rudern'],
    source: ace(48, 'seated-row', 'Seated Row'),
  }),
  E('trx-rudern', 'Rudern am Schlingentrainer', {
    aliases: ['TRX Rudern', 'TRX Back Row', 'Schlingentrainer Rudern'],
    muscles: ['ruecken', 'bizeps', 'bauch'], equipment: ['schlingentrainer'], level: 'erfahren',
    splits: ['pull'], compound: true, defaults: { reps: '8-12', rest: 90 },
    start: 'Die Griffe halten und zum Befestigungspunkt schauen, Schrittstellung mit beiden Füßen vorn. Rumpf anspannen, Schulterblätter nach hinten unten.',
    steps: [
      'Zurücklehnen und das Gewicht auf das hintere Bein verlagern; Ellbogen gestreckt auf Brusthöhe, Handflächen zeigen zueinander.',
      'Ausatmen, die Ellbogen beugen und den Körper zu den Händen ziehen; die Ellbogen bleiben nah an den Rippen.',
      'Einatmen und mit festem Rumpf kontrolliert zurück, bis die Ellbogen gestreckt sind.',
    ],
    cues: ['Laut Quelle erst üben, wenn du den unteren Rücken sicher stabilisieren kannst.'],
    mistakes: ['Die Schultern nach vorn rollen lassen.', 'Unterer Rücken oder Hüfte hängen durch.'],
    variations: ['Schwerer: weiter vom Befestigungspunkt weg stellen bzw. die Gurte verlängern.', 'Variante „High-Back-Row“: die Ellbogen beim Ziehen auf Schulterhöhe anheben.'],
    related: ['kabelrudern', 'klimmzug'],
    source: ace(84, 'trx-reg-back-row', 'TRX® Back Row'),
  }),
  E('reverse-fly', 'Reverse Flys am Kabelzug', {
    aliases: ['Reverse Fly', 'Reverse Flys', 'Rear Delt Fly'],
    muscles: ['schultern', 'ruecken'], equipment: ['kabelzug'], level: 'fortgeschritten',
    splits: ['pull'], defaults: { reps: '12-15', rest: 60 },
    start: 'Zwei Kabelrollen etwa auf oder knapp unter Schulterhöhe einstellen. Mit jeder Hand den Griff der gegenüberliegenden Rolle fassen, sodass die Arme vor dem Körper gekreuzt sind.',
    steps: [
      'Rücken gerade halten und die Füße in den Boden drücken.',
      'Beide Arme auseinanderführen, bis sie eine gerade Linie bilden.',
      'Kurz halten und langsam zurück in die Ausgangsposition.',
    ],
    cues: ['Rücken gerade, Füße fest am Boden.'],
    mistakes: ['Mit rundem Rücken arbeiten.', 'Schnell zurückgehen statt langsam.'],
    mistakesDerived: true,
    related: ['seitheben', 'kabelrudern'],
    source: ace(353, 'reverse-fly', 'Reverse Fly'),
  }),
  E('lh-curl', 'Bizeps-Curls (Langhantel)', {
    aliases: ['Langhantel Curls', 'Bizeps Curls', 'Bizepscurls', 'Barbell Curl', 'Bicep Curl'],
    muscles: ['bizeps'], equipment: ['langhantel'], level: 'fortgeschritten',
    splits: ['pull'], defaults: { reps: '8-12', rest: 60 },
    start: 'Die Langhantel mit beiden Händen im Untergriff etwa schulterbreit halten; Handgelenke, Ellbogen und Schultern in einer Linie.',
    steps: [
      'Die Hantel durch Beugen der Ellbogen Richtung Schultern heben; die Ellbogen bleiben dabei an der Körperseite.',
      'Langsam in die Ausgangsposition absenken.',
    ],
    cues: ['Brust und Oberkörper bleiben ruhig – nur die Arme bewegen sich.'],
    mistakes: ['Mit dem Oberkörper Schwung holen.', 'Die Ellbogen vom Körper lösen.'],
    mistakesDerived: true,
    related: ['kh-curl', 'hammer-curl'],
    source: ace(70, 'bicep-curl', 'Bicep Curl'),
  }),
  E('kh-curl', 'Bizeps-Curls sitzend (Kurzhantel)', {
    aliases: ['Kurzhantel Curls', 'Bizeps Curls Kurzhantel', 'Seated Biceps Curl', 'Dumbbell Curl'],
    muscles: ['bizeps'], equipment: ['kurzhantel', 'bank'], level: 'einsteiger',
    splits: ['pull'], defaults: { reps: '10-12', rest: 60 },
    start: 'Auf eine Bank mit Lehne setzen: Kopf, Schultern und Gesäß an der Lehne, Füße flach. Zwei Kurzhanteln im Untergriff halten (Daumen umschließen den Griff), Arme hängen seitlich, Schulterblätter nach hinten unten.',
    steps: [
      'Ausatmen und beide Ellbogen gleichzeitig beugen, um die Hanteln Richtung Brust zu heben – ohne Hohlkreuz und ohne die Ellbogen nach vorn zu schieben.',
      'Einatmen und langsam zurück in die Ausgangsposition.',
    ],
    cues: ['Handgelenke gerade halten – wähle eine Hantelposition, bei der das für dich möglich ist.'],
    mistakes: ['Hohlkreuz.', 'Die Schultern hochziehen.', 'Abgeknickte Handgelenke.'],
    variations: ['Die Handflächen während des Hebens nach außen bzw. oben drehen und die Ellbogen etwas nach vorn wandern lassen, um den Bizeps stärker zu betonen (laut Quelle arbeitet dann die vordere Schulter etwas mit).'],
    related: ['lh-curl', 'hammer-curl'],
    source: ace(44, 'seated-biceps-curl', 'Seated Biceps Curl'),
  }),
  E('hammer-curl', 'Hammer-Curls', {
    aliases: ['Hammer Curls', 'Hammer Curl', 'Hammercurls'],
    muscles: ['bizeps'], equipment: ['kurzhantel'], level: 'fortgeschritten',
    splits: ['pull'], defaults: { reps: '10-12', rest: 60 },
    start: 'Stehen, Kurzhanteln im Neutralgriff (Handflächen zum Körper), Arme gestreckt neben den Oberschenkeln. Schrittstellung, Rumpf anspannen, Schulterblätter nach hinten unten, Kopf in Linie mit der Wirbelsäule.',
    steps: [
      'Ausatmen und einen oder beide Ellbogen beugen, bis die Hantel vor der Schulter ist; der Oberkörper bleibt aufrecht, die Ellbogen bleiben an ihrem Platz.',
      'Einatmen und bis zur vollständigen Streckung absenken; der Neutralgriff bleibt.',
      'Beim abwechselnden Curl die Seite wechseln.',
    ],
    cues: ['Handgelenke gerade halten.'],
    mistakes: ['Hohlkreuz.', 'Die Ellbogen nach vorn schieben.', 'Die Schultern hochziehen.'],
    variations: ['Abwechselnd: Ein Arm arbeitet, der andere bleibt in der Ausgangsposition.'],
    related: ['kh-curl', 'lh-curl'],
    source: ace(10, 'hammer-curl', 'Hammer Curl'),
  }),

  // ---------------- Beine & Gesäß ----------------
  E('kniebeuge', 'Kniebeuge (Langhantel)', {
    aliases: ['Kniebeuge', 'Kniebeugen', 'Langhantel Kniebeuge', 'Back Squat', 'Squat'],
    muscles: ['oberschenkel', 'gesaess'], equipment: ['langhantel'], level: 'erfahren',
    splits: ['beine', 'ganzkoerper'], compound: true, defaults: { reps: '6-10', rest: 120 },
    start: 'Die Stange im Ständer knapp unter Schulterhöhe ablegen. Darunter gehen, sodass sie hinter dem Nacken auf dem oberen Rücken liegt; Griff breiter als schulterbreit. Brust oben, Schulterblätter zusammengezogen.',
    steps: [
      'Aufrichten, die Stange aus dem Ständer heben und zurücktreten.',
      'Die Füße etwas weiter als schulterbreit aufstellen.',
      'In die Hüfte nach hinten setzen – Rücken gerade, Brust oben – und absenken, bis die Hüfte unter den Knien ist.',
      'Aus der tiefsten Position über die Füße drücken und die Hüfte nach vorn bringen, bis du wieder stehst.',
    ],
    cues: ['Der Rücken bleibt während der ganzen Bewegung gerade.'],
    mistakes: ['Rundrücken beim Absenken oder Aufrichten.'],
    mistakesDerived: true,
    related: ['kniebeuge-kg', 'beinpresse'],
    source: ace(11, 'back-squat', 'Back Squat'),
  }),
  E('kniebeuge-kg', 'Kniebeuge ohne Gewicht', {
    aliases: ['Kniebeuge Körpergewicht', 'Squats ohne Gewicht', 'Bodyweight Squat', 'Air Squat'],
    muscles: ['oberschenkel', 'gesaess', 'waden', 'bauch'], level: 'einsteiger',
    splits: ['beine', 'ganzkoerper'], compound: true, defaults: { reps: '12-15', rest: 60 },
    start: 'Füße etwas weiter als hüftbreit, Zehen leicht nach außen, Arme an den Seiten. Schultern nach hinten unten, Rumpf anspannen, Brust oben, Blick leicht nach oben, Gewicht Richtung Fersen.',
    steps: [
      'Rumpf anspannen und die Hüfte nach hinten schieben, als wolltest du eine Wand hinter dir berühren.',
      'Erst nach hinten, dann nach unten absenken; die Knie bewegen sich kontrolliert nach vorn.',
      'Absenken, bis die Oberschenkel (fast) parallel zum Boden sind, die Fersen sich zu heben beginnen oder der Oberkörper rund wird.',
      'Hüfte und Knie strecken und aufstehen; die Fersen bleiben flach, die Knie über dem zweiten Zeh. Beim Absenken einatmen, beim Aufrichten ausatmen.',
    ],
    cues: ['Gewicht gleichmäßig zwischen Ballen und Fersen verteilen.', 'Die Knie zeigen über den zweiten Zeh.'],
    mistakes: ['Die Füße bewegen sich.', 'Die Sprunggelenke knicken nach innen oder außen.', 'Der untere Rücken rundet sich deutlich.'],
    related: ['kniebeuge', 'squat-jumps', 'ausfallschritte'],
    source: ace(135, 'bodyweight-squat', 'Bodyweight Squat'),
  }),
  E('beinpresse', 'Beinpresse', {
    aliases: ['Beinpresse Maschine', 'Leg Press', 'Seated Leg Press'],
    muscles: ['oberschenkel', 'gesaess'], equipment: ['maschine'], level: 'einsteiger',
    splits: ['beine', 'ganzkoerper'], compound: true, defaults: { reps: '10-12', rest: 120 },
    start: 'Hinsetzen, Rücken und Steißbein an der Lehne. Die Füße so auf die Platte stellen, dass die Knie etwa 90 Grad gebeugt sind, Fersen flach. Bauch anspannen und den unteren Rücken ruhig halten.',
    steps: [
      'Ausatmen und die Platte wegdrücken – Gesäß, vordere und hintere Oberschenkelmuskeln arbeiten, die Fersen bleiben auf der Platte.',
      'Hüfte und Knie strecken, bis die Knie gestreckt, aber nicht durchgedrückt sind.',
      'Kurz halten und die Platte langsam und kontrolliert zurückkommen lassen.',
    ],
    mistakes: ['Die Knie am Ende durchdrücken.', 'Das Gesäß vom Sitz abheben.', 'Den unteren Rücken runden.', 'Die Oberschenkel so weit heranführen, dass sie gegen den Brustkorb drücken.'],
    variations: ['Einbeinig: jedes Bein einzeln drücken.'],
    related: ['kniebeuge', 'kniebeuge-kg'],
    source: ace(154, 'seated-leg-press', 'Seated Leg Press'),
  }),
  E('kreuzheben', 'Kreuzheben', {
    aliases: ['Kreuzheben Langhantel', 'Deadlift'],
    muscles: ['ganzkoerper', 'gesaess', 'oberschenkel', 'ruecken'], equipment: ['langhantel'], level: 'erfahren',
    splits: ['beine', 'pull', 'ganzkoerper'], compound: true, defaults: { reps: '5-8', rest: 150 },
    start: 'Hinter die Stange stellen, Füße etwa schulterbreit, Zehen leicht nach außen, Schienbeine fast an der Stange. Etwas nach hinten setzen, Rücken gerade, Brust angehoben; die Stange im Kreuzgriff fassen (eine Hand im Ober-, eine im Untergriff).',
    steps: [
      'Die Stange fest greifen, in die Hüfte sinken und die Füße in den Boden drücken.',
      'Mit flachem Rücken die Hüfte nach vorn schieben, bis du aufrecht stehst – Schultern zurück, Beine gestreckt.',
      'Zum Absenken das Gewicht in die Hüfte nach hinten verlagern, den Rücken gerade halten und die Knie beugen.',
    ],
    cues: ['Richtig ausgeführt leisten laut Quelle Gesäß und Oberschenkelrückseite die Arbeit – nicht der untere Rücken.'],
    mistakes: ['Die Last mit dem unteren Rücken statt mit Gesäß und Beinen heben.', 'Rundrücken beim Heben oder Absenken.'],
    mistakesDerived: true,
    related: ['rumaenisches-kreuzheben', 'kniebeuge', 'kb-swing'],
    source: ace(6, 'deadlift', 'Deadlift'),
  }),
  E('rumaenisches-kreuzheben', 'Rumänisches Kreuzheben', {
    aliases: ['Rumänisches Kreuzheben Langhantel', 'Romanian Deadlift', 'RDL'],
    muscles: ['gesaess', 'oberschenkel', 'ruecken'], equipment: ['langhantel'], level: 'fortgeschritten',
    splits: ['beine', 'ganzkoerper'], compound: true, defaults: { reps: '8-10', rest: 120 },
    start: 'Die Langhantel mit beiden Händen vor den Oberschenkeln halten; Knie leicht gebeugt, Rücken gerade.',
    steps: [
      'Die Hüfte nach hinten schieben und die Stange Richtung Boden absenken, bis du Spannung an der Rückseite der Beine spürst.',
      'Zum Aufrichten die Fersen in den Boden drücken und die Knie nach hinten ziehen; die Stange bleibt nah am Körper.',
    ],
    cues: ['Die Knie bleiben leicht gebeugt, der Rücken gerade.'],
    mistakes: ['Rundrücken beim Absenken.', 'Die Stange entfernt sich vom Körper.'],
    mistakesDerived: true,
    related: ['kreuzheben', 'beinbeuger', 'glute-bridge'],
    source: ace(317, 'romanian-deadlift', 'Romanian Deadlift'),
  }),
  E('ausfallschritte', 'Ausfallschritte vorwärts', {
    aliases: ['Ausfallschritte', 'Ausfallschritt', 'Forward Lunge', 'Lunges'],
    muscles: ['oberschenkel', 'gesaess', 'bauch'], level: 'fortgeschritten',
    splits: ['beine', 'ganzkoerper'], compound: true, defaults: { reps: '8-12', rest: 90, notes: 'je Bein' },
    start: 'Mit geschlossenen Füßen stehen. Die Schulterblätter nach hinten unten ziehen, ohne ins Hohlkreuz zu gehen, und den Rumpf anspannen.',
    steps: [
      'Einen Fuß anheben und auf dem Standbein balancieren, ohne seitlich zu kippen.',
      'Nach vorn treten, zuerst mit der Ferse aufsetzen und das Gewicht auf den vorderen Fuß verlagern; der hintere Fuß bleibt stehen.',
      'Die Hüfte nach unten sinken lassen (nicht nach vorn schieben), bis der vordere Oberschenkel etwa parallel zum Boden ist; der Rücken bleibt flach.',
      'Über das vordere Bein abdrücken und zurück in die Ausgangsposition.',
    ],
    cues: ['Durch das Absenken der Hüfte steuerst du, wie weit das vordere Schienbein nach vorn wandert.'],
    mistakes: ['Der Oberkörper kippt oder schwankt seitlich.', 'Der hintere Fuß verrutscht.', 'Die Hüfte wird nach vorn geschoben statt abgesenkt.'],
    variations: ['Leichter: zuerst den sicheren Einbeinstand üben.', 'Schwerer: Ausfallschritte mit Armbewegungen oder in verschiedene Richtungen.'],
    related: ['ausfallschritte-rueckwaerts', 'kniebeuge-kg'],
    source: ace(94, 'forward-lunge', 'Forward Lunge'),
  }),
  E('ausfallschritte-rueckwaerts', 'Rückwärts-Ausfallschritte (Langhantel)', {
    aliases: ['Rückwärts Ausfallschritte', 'Rückwärtsausfallschritt', 'Reverse Lunge'],
    muscles: ['oberschenkel', 'gesaess'], equipment: ['langhantel'], level: 'fortgeschritten',
    splits: ['beine'], compound: true, defaults: { reps: '8-10', rest: 90, notes: 'je Bein' },
    start: 'Die Stange im Ständer etwa auf Schulterhöhe. Darunter gehen, sodass sie hinter dem Nacken auf dem oberen Rücken liegt; Griff etwas breiter als schulterbreit. Mit der Stange aufrichten, Füße etwa hüftbreit.',
    steps: [
      'Mit dem linken Bein einen Schritt nach hinten machen.',
      'Sobald der Fuß steht, in die rechte Hüfte zurückschieben und das linke Knie langsam Richtung Boden senken; die Brust bleibt oben.',
      'Über den rechten Fuß drücken, das rechte Knie gedanklich nach hinten ziehen und das linke Bein nach vorn zurück in den Stand bringen.',
    ],
    cues: ['Die Brust während der ganzen Bewegung oben halten.'],
    mistakes: ['Den Oberkörper nach vorn fallen lassen.'],
    mistakesDerived: true,
    related: ['ausfallschritte', 'kniebeuge'],
    source: ace(319, 'reverse-lunge', 'Reverse Lunge'),
  }),
  E('beinbeuger', 'Beinbeugen liegend (Kabel oder Band)', {
    aliases: ['Beinbeuger', 'Beincurl', 'Leg Curl', 'Hamstring Curl'],
    muscles: ['oberschenkel'], equipment: ['kabelzug'], level: 'einsteiger',
    splits: ['beine'], defaults: { reps: '10-15', rest: 60, notes: 'je Bein' },
    start: 'Bäuchlings auf eine Matte legen, eine Manschette am Knöchel, das Kabel bzw. Band ist vom Körper weg befestigt. Füße hüftbreit, Rumpf anspannen, den Fuß leicht anziehen.',
    steps: [
      'Ausatmen und das Knie beugen, um die Ferse Richtung Gesäß zu bringen; der Oberschenkel bleibt auf der Matte. Stoppen, sobald sich Hüfte oder unterer Rücken mitbewegen.',
      'Einatmen und das Bein langsam zurück in die Ausgangsposition senken.',
    ],
    cues: ['Bauchspannung hilft, Hüfte und unteren Rücken ruhig zu halten.'],
    mistakes: ['Die Hüfte anheben.', 'Ins Hohlkreuz gehen.'],
    variations: ['Schwerer: die Ferse näher ans Gesäß führen (größerer Bewegungsumfang) oder mehr Widerstand wählen.'],
    related: ['rumaenisches-kreuzheben', 'hamstring-dehnung'],
    source: ace(131, 'prone-lying-hamstrings-curl', 'Prone (Lying) Hamstrings Curl'),
  }),
  E('glute-bridge', 'Glute Bridge auf dem Gymnastikball', {
    aliases: ['Glute Bridge', 'Hip Bridge', 'Beckenheben Ball'],
    muscles: ['gesaess', 'oberschenkel', 'bauch'], equipment: ['gymnastikball'], level: 'fortgeschritten',
    splits: ['beine'], defaults: { reps: '10-12', rest: 60 },
    start: 'Rücklings liegen, Knie gebeugt, die Füße liegen oben auf einem Gymnastikball.',
    steps: [
      'Über die Fersen drücken und die Hüfte durch Anspannen des Gesäßes anheben; der Ball bleibt ruhig.',
      'Oben eine gerade Linie von den Knien bis zum Kopf halten; das Gewicht liegt auf Schultern und oberem Rücken.',
      'Die Hüfte langsam zum Boden absenken; der Ball bleibt ruhig.',
    ],
    cues: ['Der Ball sollte sich während der Übung nicht bewegen.'],
    mistakes: ['Der Ball rollt weg oder wackelt.', 'Oben keine gerade Linie von den Knien bis zum Kopf.'],
    mistakesDerived: true,
    related: ['rumaenisches-kreuzheben', 'beinbeuger'],
    source: ace(66, 'glute-bridge', 'Glute Bridge'),
  }),
  E('wadenheben', 'Wadenheben an der Wand', {
    aliases: ['Wadenheben', 'Wadenheben stehend', 'Calf Raise', 'Standing Calf Raise'],
    muscles: ['waden'], level: 'einsteiger',
    splits: ['beine'], defaults: { reps: '12-20', rest: 45 },
    start: 'Etwa 15–30 cm vor einer Wand stehen, Füße hüftbreit, Blick nach vorn. Die Handflächen auf Brust- oder Schulterhöhe an die Wand legen.',
    steps: [
      'Die Fersen langsam vom Boden heben; die Knie bleiben gestreckt, die Füße zeigen gerade nach vorn. Kurz halten.',
      'Die Fersen langsam wieder absenken.',
    ],
    cues: ['Explosive Varianten erst, wenn die Technik sicher sitzt.'],
    mistakes: ['Die Knie beugen sich.', 'Die Füße drehen sich ein oder aus.', 'Ohne kurzes Halten oben und zu schnell arbeiten.'],
    mistakesDerived: true,
    variations: ['Schwerer: einbeinig.', 'Füße leicht nach innen oder außen gedreht, um die innere bzw. äußere Wadenmuskulatur zu betonen.'],
    related: ['waden-dehnung'],
    source: ace(73, 'standing-calf-raises-wall', 'Standing Calf Raises – Wall'),
  }),
  E('squat-jumps', 'Sprungkniebeugen (Squat Jumps)', {
    aliases: ['Squat Jumps', 'Jump Squats', 'Strecksprünge'],
    muscles: ['oberschenkel', 'gesaess'], types: ['kraft', 'cardio'], level: 'einsteiger',
    splits: ['beine', 'cardio'], compound: true, defaults: { reps: '8-10', rest: 60 },
    start: 'Füße hüftbreit, Arme an den Seiten, Schultern nach hinten unten ohne Hohlkreuz, Rumpf angespannt.',
    steps: [
      'Die Hüfte nach hinten und unten schieben – Hüft- und Kniebeugung, bis die Fersen gleich abheben würden; Rücken flach, Blick nach vorn.',
      'Nur kurz verharren und dann nach oben springen; Sprung-, Knie- und Hüftgelenke strecken sich, die Füße bleiben waagerecht.',
      'Weich auf dem Mittelfuß landen, zu den Fersen abrollen und die Hüfte nach hinten unten schieben, um den Aufprall abzufangen; Oberkörper leicht vorgeneigt, Rücken flach.',
    ],
    cues: ['Erst Kniebeuge und Landung lernen, mit kleinen Sprüngen beginnen und erst danach explosiv springen.'],
    mistakes: ['Bei der Landung die Knie durchstrecken – laut Quelle kann das zu Knieverletzungen führen.', 'Bei der Landung schieben sich die Unterschenkel stark nach vorn.'],
    variations: ['Schwerer: die Arme in der Abwärtsbewegung nach hinten und beim Sprung nach vorn oben schwingen oder die Knie im Sprung zur Brust ziehen.'],
    related: ['kniebeuge-kg', 'burpee'],
    source: ace(116, 'squat-jumps', 'Squat Jumps'),
  }),

  // ---------------- Core ----------------
  E('plank', 'Unterarmstütz (Plank)', {
    aliases: ['Plank', 'Planke', 'Unterarmstütz', 'Front Plank'],
    muscles: ['bauch', 'ruecken'], level: 'fortgeschritten', unit: 'sek',
    splits: ['core', 'ganzkoerper'], defaults: { reps: '20-40', rest: 60 },
    start: 'Bäuchlings auf der Matte liegen, Ellbogen nah am Körper unter den Schultern, Handflächen auf dem Boden. Beine strecken, Fußspitzen anziehen und den Rumpf fest anspannen.',
    steps: [
      'Den ganzen Körper langsam von der Matte abheben – Rumpf und Beine bleiben steif, die Schultern über den Ellbogen.',
      'Weiteratmen und die Position halten (laut Quelle mindestens 5 Sekunden).',
      'Mit festem Rumpf und gestreckten Knien sanft zurück auf die Matte.',
    ],
    cues: ['Bei Schmerzen im unteren Rücken laut Quelle aufhören und ärztlich abklären lassen.'],
    mistakes: ['Der untere Rücken hängt durch (Hohlkreuz).', 'Die Hüfte schiebt sich nach oben.', 'Die Knie beugen sich.', 'Die Schultern werden hochgezogen.'],
    related: ['seitstuetz', 'dead-bug', 'liegestuetz'],
    source: ace(32, 'front-plank', 'Front Plank'),
  }),
  E('seitstuetz-knie', 'Seitstütz auf den Knien', {
    aliases: ['Seitstütz Knie', 'Seitlicher Unterarmstütz Knie', 'Side Plank modified'],
    muscles: ['bauch', 'gesaess'], level: 'einsteiger', unit: 'sek',
    splits: ['core'], defaults: { sets: 2, reps: '15-30', rest: 45, notes: 'je Seite' },
    start: 'Auf die rechte Seite legen, das linke Bein auf dem rechten, Knie angenehm gebeugt. Auf den rechten Unterarm stützen, Ellbogen 90 Grad direkt unter der Schulter; Kopf in Linie mit der Wirbelsäule, Hüfte und unteres Knie auf der Matte.',
    steps: [
      'Ausatmen, Rumpf anspannen und die Hüfte von der Matte heben; das Knie bleibt am Boden, der Kopf in Linie.',
      'Einatmen und zurück in die Ausgangsposition senken.',
      'Die Seite wechseln.',
    ],
    mistakes: ['Der Kopf fällt aus der Linie mit der Wirbelsäule.', 'Der Ellbogen steht nicht unter der Schulter.'],
    mistakesDerived: true,
    variations: ['Schwerer: länger in der oberen Position halten.', 'Die Variante mit gestreckten Beinen ist in der Quelle als „Intermediate“ eingestuft (diese hier als „Beginner“).'],
    related: ['seitstuetz', 'plank'],
    source: ace(100, 'side-plank-modified', 'Side Plank – modified'),
  }),
  E('seitstuetz', 'Seitstütz', {
    aliases: ['Seitstütz', 'Seitlicher Unterarmstütz', 'Side Plank'],
    muscles: ['bauch', 'gesaess'], level: 'fortgeschritten', unit: 'sek',
    splits: ['core'], defaults: { sets: 2, reps: '20-40', rest: 45, notes: 'je Seite' },
    start: 'Auf die rechte Seite legen, Beine gestreckt, der linke Fuß liegt auf dem rechten. Der rechte Ellbogen steht direkt unter der Schulter, der Kopf in Linie mit der Wirbelsäule.',
    steps: [
      'Ausatmen, Rumpf anspannen und Hüfte und Knie von der Matte heben; Kontakt nur noch über Unterarm und Außenseite des rechten Fußes.',
      'Einatmen und zurück in die Ausgangsposition.',
      'Die Seite wechseln und wiederholen.',
    ],
    cues: ['Der Ellbogen bleibt unter der Schulter, der Kopf in Linie.'],
    mistakes: ['Der Ellbogen steht nicht unter der Schulter.', 'Der Kopf fällt aus der Linie mit der Wirbelsäule.'],
    mistakesDerived: true,
    variations: ['Schwerer: länger halten, das obere Bein anheben (nicht über die Waagerechte) oder zusätzlich das untere Bein vom Boden lösen.', 'Leichter: Seitstütz auf den Knien.'],
    related: ['seitstuetz-knie', 'plank'],
    source: ace(101, 'side-plank-with-straight-leg', 'Side Plank with Straight Leg'),
  }),
  E('crunch', 'Crunch', {
    aliases: ['Crunches', 'Bauchpresse'],
    muscles: ['bauch'], level: 'einsteiger',
    splits: ['core'], defaults: { reps: '12-15', rest: 45 },
    start: 'Rücklings auf der Matte, Knie gebeugt, Füße flach, Fersen etwa 30–45 cm vom Steißbein entfernt.',
    steps: [
      'Hände hinter den Kopf, Schulterblätter zusammenziehen und die Ellbogen zurücknehmen, ohne ins Hohlkreuz zu gehen; Kopf in Linie mit der Wirbelsäule.',
      'Ausatmen, Bauch anspannen, das Kinn leicht einziehen und den Oberkörper Richtung Oberschenkel einrollen – der Brustkorb bewegt sich zum Becken. Füße, Steißbein und unterer Rücken bleiben auf der Matte; anheben, bis der obere Rücken frei ist, kurz halten.',
      'Einatmen und langsam, kontrolliert wieder abrollen.',
    ],
    cues: ['Nacken und Schultern locker lassen.'],
    mistakes: ['Zu schnell arbeiten.', 'Die Hüftbeuger einsetzen – das kippt laut Quelle das Becken und belastet den unteren Rücken.'],
    related: ['dead-bug', 'plank'],
    source: ace(52, 'crunch', 'Crunch'),
  }),
  E('dead-bug', 'Dead Bug', {
    aliases: ['Deadbug', 'Toter Käfer', 'Supine Dead Bug'],
    muscles: ['bauch'], level: 'einsteiger',
    splits: ['core', 'ganzkoerper'], defaults: { reps: '8-10', rest: 45, notes: 'je Seite' },
    start: 'Rücklings liegen, Knie gebeugt, Füße flach etwa 30–45 cm vor dem Gesäß, Arme seitlich mit den Fingern nach oben. Schulterblätter nach hinten unten, ohne ins Hohlkreuz zu gehen oder die Hüfte zu heben.',
    steps: [
      'Den Bauch nach innen ziehen: Beckenboden sanft anspannen und den Bauchnabel Richtung Wirbelsäule ziehen, ohne Hüfte oder Brustkorb zu bewegen – dabei normal weiteratmen.',
      'Arme und Beine anheben: Knie über der Hüfte im 90-Grad-Winkel, Ellbogen über den Schultern, Hände zur Decke.',
      'Einatmen, die Bauchspannung halten und rechte Ferse und linke Hand langsam Richtung Boden senken (nur leicht antippen). Ausatmen, zurück und die Seite wechseln.',
    ],
    cues: ['Die Bauchspannung bleibt die ganze Zeit bestehen – weiteratmen.'],
    mistakes: ['Die Bauchspannung beim Absenken von Arm und Bein verlieren.', 'Den Atem anhalten.', 'Arm oder Ferse am Boden ablegen statt nur anzutippen.'],
    mistakesDerived: true,
    variations: ['Leichter: Hände über dem Kopf und Füße vor dem Gesäß am Boden ablegen; dann jeweils rechten Arm und linkes Bein gemeinsam anheben und absenken, Seiten abwechseln.'],
    related: ['bird-dog', 'crunch'],
    source: ace(147, 'supine-dead-bug', 'Supine Dead Bug'),
  }),
  E('bird-dog', 'Bird Dog', {
    aliases: ['Birddog', 'Bird-dog', 'Vierfüßlerstand diagonal'],
    muscles: ['bauch', 'ruecken', 'gesaess'], level: 'fortgeschritten',
    splits: ['core'], defaults: { reps: '8-10', rest: 45, notes: 'je Seite' },
    start: 'Auf der Matte knien, Knie und Füße hüftbreit, Zehen nach hinten. Hände schulterbreit unter den Schultern, Finger nach vorn, Knie unter der Hüfte. Rumpf anspannen, Wirbelsäule neutral.',
    steps: [
      'Ein Bein nach hinten strecken, bis es fast parallel zum Boden ist – ohne die Hüfte zu drehen; die Hüfte bleibt waagerecht.',
      'Gleichzeitig den gegenüberliegenden Arm nach vorn heben, bis er fast parallel zum Boden ist; die Schultern bleiben waagerecht, der Kopf in Linie.',
      'Zurück in die Ausgangsposition und mit der anderen Seite wiederholen.',
    ],
    cues: ['Am besten vor einem Spiegel üben; ein leichter Stab quer über Hüfte oder Schultern zeigt, ob du kippst.'],
    mistakes: ['Arm und Bein höher heben, als du den unteren Rücken stabil halten kannst – dann sinkt er durch.', 'Hüfte oder Schultern kippen oder drehen sich.'],
    related: ['dead-bug', 'plank', 'katze-kuh'],
    source: ace(14, 'bird-dog', 'Bird Dog'),
  }),

  // ---------------- Cardio & Ganzkörper ----------------
  E('kb-swing', 'Kettlebell Swing', {
    aliases: ['Kettlebell Swings', 'KB Swing', 'Swing'],
    muscles: ['ganzkoerper', 'gesaess', 'oberschenkel'], equipment: ['kettlebell'], types: ['kraft', 'cardio'], level: 'fortgeschritten',
    splits: ['ganzkoerper', 'cardio'], compound: true, defaults: { reps: '12-15', rest: 60 },
    start: 'Füße schulterbreit, Knie leicht gebeugt, die Kettlebell mit beiden Händen im Obergriff halten.',
    steps: [
      'Den Griff fest drücken, Rücken gerade, in die Hüfte sinken und die Kettlebell zwischen den Beinen unter der Hüfte nach hinten ziehen.',
      'Die Brust heben, die Hüfte schnell nach vorn schieben und die Knie nach hinten ziehen – die Kettlebell schwingt vor dem Körper bis auf Brusthöhe.',
      'Die Kettlebell zwischen die Beine zurückfallen lassen, in die Hüfte sinken und wiederholen.',
    ],
    cues: ['Die Kraft kommt aus Beinen und Hüfte – laut Quelle nicht aus den Schultern.'],
    mistakes: ['Die Kettlebell mit Schultern und Armen hochheben, statt sie aus der Hüfte zu schwingen.'],
    related: ['kreuzheben', 'rumaenisches-kreuzheben'],
    source: ace(391, 'swing', 'Swing (Kettlebell)'),
  }),
  E('mountain-climber', 'Mountain Climbers', {
    aliases: ['Mountain Climber', 'Bergsteiger'],
    muscles: ['ganzkoerper', 'gesaess', 'oberschenkel', 'bauch'], types: ['cardio', 'kraft'], level: 'erfahren', unit: 'sek',
    splits: ['cardio', 'core'], compound: true, defaults: { reps: '20-30', rest: 60 },
    start: 'Knien, Knie und Füße hüftbreit, Zehen nach hinten. Nach vorn lehnen, die Hände etwas vor den Schultern auf den Boden. Das linke Knie anwinkeln und den linken Fuß unter der Brust aufsetzen (Ferse leicht angehoben), das rechte Bein nach hinten strecken. Bauch anspannen, Schulterblätter nach hinten unten.',
    steps: [
      'Die Beine gleichzeitig wechseln: rechtes Knie nach vorn bringen, linkes Bein nach hinten strecken – beide Füße lösen sich kurz vom Boden.',
      'Der rechte Fuß landet unter der Brust, das linke Bein ist ganz gestreckt.',
      'Die Hände bleiben fest am Boden, der Bauch angespannt, die Schultern stabil – im Wechsel wiederholen.',
    ],
    cues: ['Das Gewicht gleichmäßig verteilen.'],
    mistakes: ['Das ganze Gewicht nach vorn auf den vorderen Fuß verlagern.'],
    variations: ['Leichter bei eingeschränkter Hüftbeweglichkeit: die Hände auf eine Stufe oder Plattform stützen.'],
    related: ['plank', 'burpee', 'squat-jumps'],
    source: ace(258, 'mountain-climbers', 'Mountain Climbers'),
  }),
  E('burpee', 'Burpee mit BOSU-Ball', {
    aliases: ['Burpee', 'Burpees', 'BOSU Burpee'],
    muscles: ['ganzkoerper'], equipment: ['bosu'], types: ['cardio', 'kraft'], level: 'erfahren',
    splits: ['cardio', 'ganzkoerper'], compound: true, defaults: { reps: '6-10', rest: 60 },
    start: 'In den Stütz gehen: der BOSU-Ball liegt mit der Kuppel nach unten direkt unter den Schultern, die Beine sind hinter dem Körper gestreckt.',
    steps: [
      'Die Füße nah an die Kuppel nach vorn springen (tiefe Hocke), den BOSU dabei festhalten und mit gestreckten Armen über den Kopf heben.',
      'Den BOSU wieder auf den Boden bringen und die Beine nach hinten in den Stütz springen.',
    ],
    related: ['squat-jumps', 'mountain-climber'],
    source: ace(306, 'burpee', 'Burpee'),
  }),
  E('rudergeraet', 'Rudergerät', {
    aliases: ['Rudern Gerät', 'Ruderergometer', 'Rowing', 'RowErg', 'Indoor Rowing'],
    muscles: ['ganzkoerper'], equipment: ['rudergeraet'], types: ['cardio'], level: null, unit: 'min',
    splits: ['cardio', 'ganzkoerper'], compound: true, defaults: { sets: 1, reps: '15-20', rest: 0 },
    start: 'Auslage („Catch“): Arme gestreckt, Kopf neutral, Schultern locker und nicht hochgezogen. Der Oberkörper ist aus der Hüfte nach vorn geneigt, die Schultern sind vor der Hüfte. Schienbeine senkrecht oder so nah daran wie angenehm – nicht darüber hinaus; die Fersen dürfen sich heben.',
    steps: [
      'Durchzug („Drive“): zuerst mit den Beinen drücken, dann den Oberkörper über die Senkrechte nach hinten schwingen und erst danach mit den Armen ziehen. Reihenfolge: Beine – Oberkörper – Arme; die Hände bewegen sich in einer geraden Linie.',
      'Endzug („Finish“): Oberkörper leicht zurückgelehnt und vom Rumpf gestützt, Beine gestreckt, Griff locker knapp unter den Rippen, Handgelenke gerade, Schultern tief.',
      'Freilauf („Recovery“): Arme strecken, aus der Hüfte nach vorn lehnen und erst wenn die Hände über den Knien sind, die Knie beugen und nach vorn rollen – im Grunde die Umkehrung des Durchzugs.',
    ],
    cues: ['Die Schultern während des ganzen Zugs tief und locker halten.', 'Laut Concept2 nicht zu hart ziehen, bis die Grundtechnik sitzt.'],
    mistakes: ['Die Reihenfolge vertauschen, z. B. zuerst mit den Armen ziehen.', 'Die Knie beugen, bevor die Hände über den Knien sind.', 'Die Schienbeine in der Auslage über die Senkrechte hinaus schieben.'],
    mistakesDerived: true,
    related: ['kb-swing'],
    source: { key: 'concept2', url: 'https://www.concept2.com/training/rowing-technique', title: 'Indoor Rowing Technique on the Concept2 RowErg' },
  }),

  // ---------------- Mobility ----------------
  E('katze-kuh', 'Katze-Kuh', {
    aliases: ['Katze Kuh', 'Katzenbuckel', 'Cat-Cow'],
    muscles: ['ruecken'], types: ['mobility'], level: 'einsteiger',
    splits: ['mobility'], defaults: { sets: 2, reps: '5', rest: 30, notes: 'jede Phase 10–15 s halten' },
    start: 'Im Vierfüßlerstand knien: Knie und Füße hüftbreit, Zehen nach hinten, Hände schulterbreit unter den Schultern, Knie unter der Hüfte; Wirbelsäule neutral.',
    steps: [
      'Den Rumpf anspannen, sodass die Wirbelsäule neutral bleibt – nicht durchhängen, nicht runden.',
      'Katze: ausatmen, Bauch anspannen, den Rücken Richtung Decke runden und den Kopf Richtung Brust sinken lassen; 10–15 Sekunden halten.',
      'Kuh: locker lassen, den Bauch Richtung Boden sinken lassen und die Schulterblätter zusammenführen; 10–15 Sekunden halten, dann zurück in die Ausgangsposition.',
    ],
    cues: ['Den Kopf in Verlängerung der Wirbelsäule mitbewegen.'],
    related: ['kindhaltung', 'bws-rotation', 'bird-dog'],
    source: ace(15, 'cat-cow', 'Cat-Cow'),
  }),
  E('kindhaltung', 'Kindhaltung', {
    aliases: ['Stellung des Kindes', 'Kind-Pose', "Child's Pose"],
    muscles: ['ruecken', 'gesaess', 'oberschenkel'], types: ['mobility'], level: 'einsteiger', unit: 'sek',
    splits: ['mobility'], defaults: { sets: 2, reps: '30-60', rest: 15 },
    start: 'Knien, die Knie unter der Hüfte und Richtung Mattenrand geöffnet, die großen Zehen berühren sich, Zehen zeigen nach hinten. Bauch anspannen, Schultern nach hinten unten; die Hände unter den Schultern auf dem Boden, Finger nach vorn.',
    steps: [
      'Einatmen und nach vorn lehnen, die Hände unter den Schultern.',
      'Ausatmen, in der Hüfte beugen und das Gesäß Richtung Fersen bringen; Rücken und Arme lang machen, Schultern weg von den Ohren. Brust zwischen den Oberschenkeln, Stirn am Boden – die Knie bei Bedarf weiter öffnen.',
      '5–10 langsame, tiefe Atemzüge halten (etwa 30 Sekunden bis 1 Minute).',
    ],
    cues: ['Die Wirbelsäule lang halten, während du tiefer gehst.'],
    variations: ['Die Arme neben dem Körper ablegen, Handflächen nach oben.'],
    related: ['katze-kuh', 'kobra'],
    source: ace(227, 'childs-pose', "Child's Pose"),
  }),
  E('hueftbeuger-dehnung', 'Kniende Hüftbeuger-Dehnung', {
    aliases: ['Hüftbeuger Dehnung', 'Hüftbeugerdehnung', 'Hip Flexor Stretch'],
    muscles: ['gesaess', 'oberschenkel'], types: ['mobility'], level: 'einsteiger', unit: 'sek',
    splits: ['mobility'], defaults: { sets: 2, reps: '30-45', rest: 15, notes: 'je Seite' },
    start: 'Mit dem linken Knie auf dem Boden (oder einer Matte) unter der linken Hüfte knien. Der rechte Fuß steht vorn, das rechte Knie über dem Sprunggelenk, die rechte Hüfte etwa 90 Grad gebeugt. Hände leicht auf dem rechten Oberschenkel, Wirbelsäule aufrecht.',
    steps: [
      'Die Schulterblätter nach hinten unten ziehen, ohne ins Hohlkreuz zu gehen; Rumpf anspannen, Becken waagerecht halten.',
      'Nach vorn in die rechte Hüfte lehnen; das linke Knie bleibt am Boden, das Becken kippt nicht nach vorn. Das linke Gesäß anspannen, um die Dehnung zu verstärken.',
      '30–45 Sekunden halten, 2–5 Wiederholungen, jedes Mal etwas tiefer; erst alle Wiederholungen auf einer Seite, dann wechseln.',
    ],
    cues: ['Bei Knieschmerzen ein Polster oder eine gefaltete Matte unter das Knie legen.'],
    mistakes: ['Das Becken kippt nach vorn oder dreht sich.', 'Die Bauchspannung lösen und ins Hohlkreuz ausweichen.'],
    variations: ['Schwerer: den linken Arm über den Kopf strecken und leicht zur rechten Seite neigen.'],
    related: ['hamstring-dehnung', 'hueftrotation-90-90'],
    source: ace(142, 'kneeling-hip-flexor-stretch', 'Kneeling Hip-flexor Stretch'),
  }),
  E('hamstring-dehnung', 'Dehnung der Oberschenkelrückseite (Rückenlage)', {
    aliases: ['Hamstring Dehnung', 'Hamstring-Dehnung', 'Beinbeuger Dehnung', 'Supine Hamstring Stretch'],
    muscles: ['oberschenkel', 'waden'], types: ['mobility'], level: 'einsteiger', unit: 'sek',
    splits: ['mobility'], defaults: { sets: 2, reps: '15-30', rest: 15, notes: 'je Bein' },
    start: 'Rücklings neben einer Wandkante oder einem Türrahmen liegen: ein Bein liegt an der Wand, das andere flach am Boden an der Kante vorbei. Hüfte am Boden, die Zehen des oberen Beins zeigen nach oben, Arme seitlich auf Schulterhöhe mit den Handflächen nach oben, Bauch angespannt.',
    steps: [
      'Ausatmen und das obere Bein durch Anspannen der Oberschenkelvorderseite langsam strecken; die Zehen Richtung Körper ziehen.',
      'Hüfte und unterer Rücken bleiben ruhig.',
      '15–30 Sekunden halten, locker lassen; 2–4 Wiederholungen, dann das Bein wechseln.',
    ],
    cues: ['Nur bis zu einem Spannungsgefühl dehnen, nicht wippen und langsam bewegen.'],
    mistakes: ['Wippen oder ruckartig dehnen.', 'Über das Spannungsgefühl hinaus dehnen.'],
    variations: ['Schwerer: das Becken nach vorn kippen (leichtes Hohlkreuz), um die Dehnung zu vertiefen.', 'Dynamisch: 5–10 Wiederholungen pro Bein, die Kippung jeweils 1–2 Sekunden halten.'],
    related: ['hueftbeuger-dehnung', 'waden-dehnung'],
    source: ace(235, 'supine-hamstrings-stretch', 'Supine Hamstrings Stretch'),
  }),
  E('hueftrotation-90-90', '90-90-Dehnung der Hüftrotatoren', {
    aliases: ['90/90 Dehnung', 'Hüftrotatoren Dehnung', '90-90 Hip Stretch'],
    muscles: ['gesaess', 'oberschenkel'], equipment: ['bank'], types: ['mobility'], level: 'einsteiger', unit: 'sek',
    splits: ['mobility'], defaults: { sets: 2, reps: '30-45', rest: 15, notes: 'je Seite' },
    start: 'Rücklings auf eine Matte legen, Unterschenkel und Fersen liegen auf einer Bank, Knie etwa 90 Grad, Füße hüftbreit, Sprunggelenke leicht angezogen. Den unteren Rücken flach zum Boden bringen, Arme seitlich mit den Handflächen nach oben und 30 Sekunden ruhig atmen.',
    steps: [
      'Den linken Unterschenkel zur Körpermitte drehen und den linken Fuß auf das rechte Knie legen; das linke Knie bleibt bei 90 Grad.',
      'Mit beiden Händen die Rückseite des rechten Oberschenkels fassen und Oberschenkel und Knie Richtung Brust ziehen; der rechte Fuß bleibt auf der Bank.',
      '30–45 Sekunden halten, dann das rechte Bein wieder auf der Bank ablegen. 2–5 Wiederholungen, dann die Seite wechseln.',
    ],
    cues: ['Bank oder Ball so wählen, dass Hüfte und Knie etwa 90 Grad gebeugt sind.'],
    variations: ['Schwerer: einen Gymnastikball statt der Bank nutzen und das rechte Knie Richtung Brust rollen.'],
    related: ['hueftbeuger-dehnung', 'kindhaltung'],
    source: ace(148, 'supine-90-90-hip-rotator-stretch', 'Supine 90-90 Hip Rotator Stretch'),
  }),
  E('bws-rotation', 'Brustwirbelsäulen-Rotation im Vierfüßlerstand', {
    aliases: ['BWS Rotation', 'Brustwirbelsäule Rotation', 'Thoracic Rotation', 'Quadruped Rotation'],
    muscles: ['ruecken'], types: ['mobility'], level: null,
    splits: ['mobility'], defaults: { sets: 2, reps: '10-12', rest: 15, notes: 'je Seite' },
    start: 'Im Vierfüßlerstand: Knie etwa hüftbreit, Hände schulterbreit.',
    steps: [
      'Die rechte Hand an den Hinterkopf legen; Arm und Oberkörper zeigen zum Boden.',
      'Vom Körper weg aufdrehen, während der Ellbogen nach oben Richtung Decke wandert.',
      'Zurück in die Ausgangsposition, wiederholen und dann die Seite wechseln.',
    ],
    cues: ['Laut Quelle 10–12 Wiederholungen oder 20–30 Sekunden pro Seite.'],
    related: ['katze-kuh', 'brust-dehnung'],
    source: { key: 'ace', url: 'https://www.acefitness.org/resources/pros/expert-articles/5203/top-exercises-to-gain-thoracic-mobility/', title: 'Top Exercises to Gain Thoracic Mobility (ACE-Fachartikel, Übung „Quadruped Rotation“)' },
  }),
  E('brust-dehnung', 'Brustdehnung im Stand', {
    aliases: ['Brustdehnung', 'Chest Stretch', 'Standing Chest Stretch'],
    muscles: ['brust', 'schultern'], types: ['mobility'], level: 'einsteiger', unit: 'sek',
    splits: ['mobility'], defaults: { sets: 2, reps: '15-30', rest: 15 },
    start: 'Stehen, Füße hüftbreit, Zehen nach vorn, Arme an den Seiten. Bauch anspannen, Schulterblätter nach hinten unten, ohne ins Hohlkreuz zu gehen.',
    steps: [
      'Ausatmen, die Brust leicht nach oben und vorn heben, die Schultern nach außen drehen und die Schulterblätter zusammenziehen.',
      '15–30 Sekunden halten, 2–4 Wiederholungen.',
    ],
    cues: ['Eine neutrale Haltung bewahren.'],
    mistakes: ['Die Brust gewaltsam nach vorn drücken.'],
    variations: ['Die Hände hinter dem Rücken verschränken (oder ein Handtuch halten) und nach außen drücken, ohne die Hüfte nach vorn zu schieben oder ins Hohlkreuz zu gehen – zielt laut Quelle auf den kleinen Brustmuskel und die vordere Schulter.'],
    related: ['bws-rotation', 'herabschauender-hund'],
    source: ace(209, 'standing-chest-stretch', 'Standing Chest Stretch'),
  }),
  E('waden-dehnung', 'Wadendehnung an der Wand', {
    aliases: ['Wadendehnung', 'Wadendehnung Wand', 'Calf Stretch'],
    muscles: ['waden'], types: ['mobility'], level: 'einsteiger', unit: 'sek',
    splits: ['mobility'], defaults: { sets: 2, reps: '15-30', rest: 15, notes: 'je Bein' },
    start: 'Mit Armlänge Abstand vor eine Wand stellen, Füße hüftbreit. Die Handflächen etwas über Schulterhöhe an die Wand, Rumpf anspannen, Schultern nach hinten unten. Das rechte Bein nach hinten in eine Schrittstellung setzen, beide Füße flach, Zehen nach vorn.',
    steps: [
      'Den Körper Richtung Wand bewegen; Becken und Wirbelsäule bleiben in Linie, die Hüfte kippt nicht nach vorn.',
      'Das vordere Knie beugen, das hintere Bein gestreckt lassen und die hintere Ferse in den Boden drücken; das Körpergewicht mit den Armen abstützen.',
      'Für mehr Dehnung näher an die Wand gehen. 15–30 Sekunden halten, 2–4 Wiederholungen, dann die Seite wechseln.',
    ],
    cues: ['Die Fersen bleiben am Boden; die Tiefe nach und nach steigern.'],
    mistakes: ['Die hintere Ferse hebt vom Boden ab.', 'Die Hüfte kippt nach vorn.'],
    variations: ['Das hintere Knie leicht beugen, um den Schollenmuskel (Soleus) zu betonen.'],
    related: ['wadenheben', 'hamstring-dehnung'],
    source: ace(152, 'standing-dorsi-flexion-calf-stretch', 'Standing Dorsi-Flexion (Calf Stretch)'),
  }),
  E('kobra', 'Kobra', {
    aliases: ['Kobra Dehnung', 'Cobra', 'Cobra Stretch'],
    muscles: ['bauch', 'ruecken'], types: ['mobility'], level: 'einsteiger', unit: 'sek',
    splits: ['mobility'], defaults: { sets: 2, reps: '15-30', rest: 15 },
    start: 'Bäuchlings liegen, die Hände unter den Schultern, Finger nach vorn. Beine gestreckt, Fußspitzen zeigen nach hinten.',
    steps: [
      'Ausatmen, die Hüfte in die Matte drücken und die Brust vom Boden heben, während die Hüfte ruhig bleibt – der untere Rücken wölbt sich, Brust und Bauch werden gedehnt.',
      '15–30 Sekunden halten.',
      'Locker lassen und den Oberkörper auf die Matte senken.',
    ],
    cues: ['Bei Schmerzen im unteren Rücken laut Quelle abbrechen und ärztlich abklären lassen.'],
    mistakes: ['Die Arme so weit strecken, dass die Hüfte von der Matte abhebt.'],
    variations: ['Leichter: die Arme nur so weit strecken, dass die Hüfte auf der Matte bleibt.'],
    related: ['kindhaltung', 'katze-kuh'],
    source: ace(16, 'cobra', 'Cobra'),
  }),
  E('herabschauender-hund', 'Herabschauender Hund', {
    aliases: ['Downward Dog', 'Downward-facing Dog'],
    muscles: ['ganzkoerper', 'ruecken', 'oberschenkel', 'waden'], types: ['mobility'], level: 'fortgeschritten',
    splits: ['mobility'], defaults: { sets: 2, reps: '5-8', rest: 30 },
    start: 'Knien, die Füße hinter dem Körper zusammenführen und die Handflächen schulterbreit flach aufsetzen, Finger nach vorn. In die Liegestützposition gehen, Schultern über den Händen; den Rumpf anspannen, damit der untere Rücken nicht durchhängt und die Hüfte nicht hochrutscht.',
    steps: [
      'Ausatmen und die Hüfte nach hinten oben schieben – ein umgedrehtes V mit gestreckten Armen und Beinen und flachem Rücken. Der Kopf ist zwischen den Schultern, die Fersen streben Richtung Boden.',
      'Bei Bedarf die Knie leicht beugen, um das V zu erreichen.',
      'Einatmen und mit gerader Körperlinie zurück in die Liegestützposition.',
    ],
    cues: ['Den Rumpf fest halten.'],
    mistakes: ['Den Rücken überstrecken bzw. ins Hohlkreuz gehen.'],
    variations: ['Leichter: die Knie leicht beugen.'],
    related: ['kobra', 'waden-dehnung', 'hamstring-dehnung'],
    source: ace(18, 'downward-facing-dog', 'Downward-facing Dog'),
  }),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

// Vergleichbarer Suchtext: Kleinbuchstaben, Umlaute vereinfacht, Satzzeichen entfernt.
export function fold(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ä|ae/g, 'a').replace(/ö|oe/g, 'o').replace(/ü|ue/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const BY_NAME = new Map();
for (const e of EXERCISES) {
  for (const n of [e.name, ...e.aliases]) {
    const k = fold(n);
    if (!BY_NAME.has(k)) BY_NAME.set(k, e);
  }
}

export function getExercise(id) {
  return BY_ID.get(id) ?? null;
}

export function findByName(name) {
  return BY_NAME.get(fold(name)) ?? null;
}

// Katalogeintrag zu einer Plan- oder Trainingsübung: über die gespeicherte ID, sonst über den Namen.
export function catalogFor(ex) {
  if (!ex) return null;
  return (ex.catalogId && getExercise(ex.catalogId)) || findByName(ex.name);
}

// Schwerpunkt aus dem Namen eines Trainingstags ableiten (z. B. „Push/Pull“ → push + pull).
export function inferFocus(name) {
  const n = ` ${fold(name)} `;
  const out = [];
  const add = (f) => !out.includes(f) && out.push(f);
  if (/ganzkorper|full ?body/.test(n)) add('ganzkoerper');
  if (/oberkorper|upper/.test(n)) add('oberkoerper');
  if (/unterkorper|lower/.test(n)) add('unterkoerper');
  if (/ push |drucken|brust/.test(n)) add('push');
  if (/ pull |ziehen|rucken/.test(n)) add('pull');
  if (/ legs? | beine? |beintag|beinen/.test(n)) add('beine');
  if (/ core | bauch|rumpf/.test(n)) add('core');
  if (/cardio|ausdauer|hiit|intervall|kondition/.test(n)) add('cardio');
  if (/mobil|dehn|stretch|yoga|beweglich/.test(n)) add('mobility');
  return out;
}

export function focusSplits(focus) {
  const s = new Set();
  for (const f of focus ?? []) for (const x of FOCUS[f]?.splits ?? []) s.add(x);
  return s;
}

export function matchesFocus(e, focus) {
  const splits = focusSplits(focus);
  return splits.size === 0 || e.splits.some((s) => splits.has(s));
}

// Vorschläge für einen Trainingstag: nur Übungen, die zum Schwerpunkt passen; Grundübungen zuerst.
export function suggestForFocus(focus, { excludeNames = [] } = {}) {
  const splits = focusSplits(focus);
  if (!splits.size) return [];
  const taken = new Set(excludeNames.map((n) => findByName(n)?.id ?? fold(n)));
  return EXERCISES
    .filter((e) => e.splits.some((s) => splits.has(s)) && !taken.has(e.id) && !taken.has(fold(e.name)))
    .sort((a, b) => Number(b.compound) - Number(a.compound));
}

export function filterExercises({ q = '', muscle = '', type = '', equipment = '', level = '', focus = [] } = {}) {
  const terms = fold(q).split(' ').filter(Boolean);
  return EXERCISES.filter((e) => {
    if (muscle && !e.muscles.includes(muscle)) return false;
    if (type && !e.types.includes(type)) return false;
    if (equipment && !e.equipment.includes(equipment)) return false;
    if (level && e.level !== level) return false;
    if (focus.length && !matchesFocus(e, focus)) return false;
    if (terms.length) {
      const hay = fold([e.name, ...e.aliases, ...e.muscles.map((m) => MUSCLES[m]), ...e.equipment.map((x) => EQUIPMENT[x])].join(' '));
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

export function sourceName(e) {
  return SOURCES[e?.source?.key]?.name ?? '';
}
