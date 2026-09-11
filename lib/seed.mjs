import { readFileSync } from 'node:fs';
import { paths } from './paths.mjs';

// Personal results live in profile.json inside the data directory, never in the
// repository — so this file, and anything built from it, can be published
// without publishing your grades. Missing or unreadable means an empty profile,
// which is a working dashboard with nothing filled in.
const PROFILE = (() => {
  try { return JSON.parse(readFileSync(paths.profile, 'utf8')); }
  catch { return {}; }
})();

// Seed content for a fresh install: subjects + A Level spec topics.
// Everything here is editable in the app afterwards — this is only the starting point.

// Bump this whenever reference data changes (calendar, unis, milestones, IGCSE,
// subject targets). Anything the user authored is never touched by a reseed.
export const SCHEMA = 9;

// The default line-up. The spec topics further down are keyed to these ids, so
// keep the ids if you want the topic list; `subjects` in profile.json replaces
// the whole array if you take different subjects, and `subjectTargets` changes
// only the grades you are aiming for.
const DEFAULT_SUBJECTS = [
  { id: 'maths',   name: 'Maths',            short: 'Ma',  slot: 1, target: 'A', weeklyHours: 5, active: true },
  { id: 'fmaths',  name: 'Further Maths',    short: 'FM',  slot: 2, target: 'A', weeklyHours: 5, active: true },
  { id: 'physics', name: 'Physics',          short: 'Phy', slot: 3, target: 'A', weeklyHours: 4, active: true },
  { id: 'cs',      name: 'Computer Science', short: 'CS',  slot: 4, target: 'A', weeklyHours: 4, active: true },
  { id: 'german',  name: 'German',           short: 'De',  slot: 5, target: 'A', weeklyHours: 1, active: true, locked: true },
];
export const SUBJECTS = applyTargets(PROFILE.subjects ?? DEFAULT_SUBJECTS);

function applyTargets(list) {
  const t = PROFILE.subjectTargets || {};
  return list.map((s) => (t[s.id] ? { ...s, target: t[s.id] } : s));
}

// [subjectId, unit, name, year] — the REAL spec: Pearson Edexcel International A
// Level (unit-coded: P1/P2/S1/M1..., FP1/FP2/M2, WPH11-16) for Maths, Further
// Maths, Physics and German; Cambridge International 9618 (2027-2029 syllabus,
// numbered 1-20) for Computer Science. year 1 = AS units, year 2 = A2 units.
const T = [
  ['maths','P1 (WMA11)','Algebraic expressions and surds',1],
  ['maths','P1 (WMA11)','Quadratics',1],
  ['maths','P1 (WMA11)','Equations and inequalities',1],
  ['maths','P1 (WMA11)','Graphs and transformations',1],
  ['maths','P1 (WMA11)','Straight line graphs',1],
  ['maths','P1 (WMA11)','Circles',1],
  ['maths','P1 (WMA11)','Trigonometric ratios and graphs',1],
  ['maths','P1 (WMA11)','Radians',1],
  ['maths','P1 (WMA11)','Differentiation from first principles',1],
  ['maths','P1 (WMA11)','Differentiation — rules and applications',1],
  ['maths','P1 (WMA11)','Integration — indefinite and definite',1],
  ['maths','P2 (WMA12)','Algebraic methods and proof',1],
  ['maths','P2 (WMA12)','Functions and mappings',1],
  ['maths','P2 (WMA12)','Sequences and series',1],
  ['maths','P2 (WMA12)','Arithmetic and geometric series',1],
  ['maths','P2 (WMA12)','Binomial expansion',1],
  ['maths','P2 (WMA12)','Exponentials and logarithms',1],
  ['maths','P2 (WMA12)','Trigonometric identities and equations',1],
  ['maths','P2 (WMA12)','Differentiation of exponentials and logs',1],
  ['maths','P2 (WMA12)','Integration — areas and the trapezium rule',1],
  ['maths','P2 (WMA12)','Numerical methods',1],
  ['maths','S1 (WST01)','Representation and summary of data',1],
  ['maths','S1 (WST01)','Measures of location and spread',1],
  ['maths','S1 (WST01)','Probability',1],
  ['maths','S1 (WST01)','Correlation',1],
  ['maths','S1 (WST01)','Regression',1],
  ['maths','S1 (WST01)','Discrete random variables',1],
  ['maths','S1 (WST01)','The Normal distribution',1],
  ['maths','P3 (WMA13)','Algebraic fractions and partial fractions',2],
  ['maths','P3 (WMA13)','Functions — composite and inverse',2],
  ['maths','P3 (WMA13)','Further trigonometry — compound and double angles',2],
  ['maths','P3 (WMA13)','Trigonometric modelling',2],
  ['maths','P3 (WMA13)','Exponential growth and decay',2],
  ['maths','P3 (WMA13)','Differentiation — chain, product and quotient',2],
  ['maths','P3 (WMA13)','Implicit and parametric differentiation',2],
  ['maths','P3 (WMA13)','Integration by substitution and by parts',2],
  ['maths','P3 (WMA13)','Numerical methods — iteration and Newton-Raphson',2],
  ['maths','P4 (WMA14)','Proof by contradiction',2],
  ['maths','P4 (WMA14)','Binomial series expansion',2],
  ['maths','P4 (WMA14)','Coordinate geometry — parametric equations',2],
  ['maths','P4 (WMA14)','Differentiation — rates of change',2],
  ['maths','P4 (WMA14)','Integration — volumes of revolution',2],
  ['maths','P4 (WMA14)','Differential equations',2],
  ['maths','P4 (WMA14)','Vectors in two and three dimensions',2],
  ['maths','M1 (WME01)','Mathematical models in mechanics',2],
  ['maths','M1 (WME01)','Vectors in mechanics',2],
  ['maths','M1 (WME01)','Kinematics — constant acceleration',2],
  ['maths','M1 (WME01)','Dynamics of a particle',2],
  ['maths','M1 (WME01)','Statics and friction',2],
  ['maths','M1 (WME01)','Moments',2],
  ['fmaths','FP1 (WFM01)','Complex numbers',1],
  ['fmaths','FP1 (WFM01)','Argand diagrams',1],
  ['fmaths','FP1 (WFM01)','Roots of quadratic equations',1],
  ['fmaths','FP1 (WFM01)','Numerical solution of equations',1],
  ['fmaths','FP1 (WFM01)','Coordinate systems — parabola and hyperbola',1],
  ['fmaths','FP1 (WFM01)','Matrix algebra',1],
  ['fmaths','FP1 (WFM01)','Transformations using matrices',1],
  ['fmaths','FP1 (WFM01)','Series and summation',1],
  ['fmaths','FP1 (WFM01)','Proof by mathematical induction',1],
  // D1 confirmed as your second unit — its opening chapter really is
  // "Algorithms", sat 19 Jan 2027 (WDM11), which is why year is 1 here.
  ['fmaths','D1 (WDM11)','Algorithms — general algorithms, sorting, bin packing',1],
  ['fmaths','D1 (WDM11)','Algorithms on graphs — minimum spanning tree (Kruskal, Prim)',1],
  ['fmaths','D1 (WDM11)','Algorithms on graphs II — shortest path (Dijkstra), route inspection',1],
  ['fmaths','D1 (WDM11)','Critical path analysis — precedence networks, float, scheduling',1],
  ['fmaths','D1 (WDM11)','Linear programming — formulation and graphical solution',1],
  ['fmaths','M2 (WME02)','Kinematics of a particle moving in a straight line or plane',2],
  ['fmaths','M2 (WME02)','Centres of mass',2],
  ['fmaths','M2 (WME02)','Work, energy and power',2],
  ['fmaths','M2 (WME02)','Collisions',2],
  ['fmaths','M2 (WME02)','Statics of rigid bodies',2],
  ['physics','Unit 1 (WPH11)','Rectilinear motion and graphs',1],
  ['physics','Unit 1 (WPH11)','Scalars and vectors',1],
  ['physics','Unit 1 (WPH11)','Forces and Newton’s laws',1],
  ['physics','Unit 1 (WPH11)','Projectile motion',1],
  ['physics','Unit 1 (WPH11)','Work, energy and power',1],
  ['physics','Unit 1 (WPH11)','Conservation of momentum',1],
  ['physics','Unit 1 (WPH11)','Density, upthrust and viscous drag',1],
  ['physics','Unit 1 (WPH11)','Hooke’s law and elastic energy',1],
  ['physics','Unit 1 (WPH11)','Stress, strain and the Young modulus',1],
  ['physics','Unit 2 (WPH12)','Wave properties and behaviour',1],
  ['physics','Unit 2 (WPH12)','Reflection, refraction and total internal reflection',1],
  ['physics','Unit 2 (WPH12)','Superposition, interference and diffraction',1],
  ['physics','Unit 2 (WPH12)','Stationary waves',1],
  ['physics','Unit 2 (WPH12)','The photoelectric effect and photons',1],
  ['physics','Unit 2 (WPH12)','Wave-particle duality and atomic spectra',1],
  ['physics','Unit 2 (WPH12)','Current, charge and drift velocity',1],
  ['physics','Unit 2 (WPH12)','Resistance and resistivity',1],
  ['physics','Unit 2 (WPH12)','Series and parallel circuits',1],
  ['physics','Unit 2 (WPH12)','EMF and internal resistance',1],
  ['physics','Unit 2 (WPH12)','Potential dividers',1],
  ['physics','Unit 3 (WPH13)','Experimental techniques and measurement',1],
  ['physics','Unit 3 (WPH13)','Uncertainties and error analysis',1],
  ['physics','Unit 3 (WPH13)','Graphical analysis of experimental data',1],
  ['physics','Unit 3 (WPH13)','Planning and evaluating an experiment',1],
  ['physics','Unit 4 (WPH14)','Momentum in two dimensions',2],
  ['physics','Unit 4 (WPH14)','Circular motion',2],
  ['physics','Unit 4 (WPH14)','Electric fields and Coulomb’s law',2],
  ['physics','Unit 4 (WPH14)','Capacitance and capacitor discharge',2],
  ['physics','Unit 4 (WPH14)','Magnetic fields and forces',2],
  ['physics','Unit 4 (WPH14)','Electromagnetic induction',2],
  ['physics','Unit 4 (WPH14)','Particle accelerators and detectors',2],
  ['physics','Unit 4 (WPH14)','The standard model and particle interactions',2],
  ['physics','Unit 5 (WPH15)','Specific heat capacity and internal energy',2],
  ['physics','Unit 5 (WPH15)','Ideal gases and kinetic theory',2],
  ['physics','Unit 5 (WPH15)','Nuclear decay and radioactivity',2],
  ['physics','Unit 5 (WPH15)','Nuclear fission and fusion',2],
  ['physics','Unit 5 (WPH15)','Simple harmonic motion',2],
  ['physics','Unit 5 (WPH15)','Damping and resonance',2],
  ['physics','Unit 5 (WPH15)','Gravitational fields',2],
  ['physics','Unit 5 (WPH15)','Stellar evolution and the Hertzsprung-Russell diagram',2],
  ['physics','Unit 5 (WPH15)','Doppler effect, redshift and the expanding universe',2],
  ['physics','Unit 6 (WPH16)','Advanced experimental techniques',2],
  ['physics','Unit 6 (WPH16)','Analysis of complex data sets',2],
  ['physics','Unit 6 (WPH16)','Evaluating experimental design',2],
  ['cs','1 Information representation','Data representation',1],
  ['cs','1 Information representation','Multimedia — graphics and sound',1],
  ['cs','1 Information representation','Compression',1],
  ['cs','2 Communication','Networks including the internet',1],
  ['cs','3 Hardware','Computers and their components',1],
  ['cs','3 Hardware','Logic gates and logic circuits',1],
  ['cs','4 Processor fundamentals','CPU architecture',1],
  ['cs','4 Processor fundamentals','Assembly language',1],
  ['cs','4 Processor fundamentals','Bit manipulation',1],
  ['cs','5 System software','Operating systems',1],
  ['cs','5 System software','Language translators',1],
  ['cs','6 Security and integrity','Data security',1],
  ['cs','6 Security and integrity','Data integrity',1],
  ['cs','7 Ethics and ownership','Ethics and ownership',1],
  ['cs','8 Databases','Database concepts',1],
  ['cs','8 Databases','Database management systems',1],
  ['cs','8 Databases','DDL and DML',1],
  ['cs','9 Algorithms','Computational thinking skills',1],
  ['cs','9 Algorithms','Algorithms',1],
  ['cs','10 Data types and structures','Data types and records',1],
  ['cs','10 Data types and structures','Arrays',1],
  ['cs','10 Data types and structures','Files',1],
  ['cs','10 Data types and structures','Abstract data types',1],
  ['cs','11 Programming','Programming basics',1],
  ['cs','11 Programming','Constructs',1],
  ['cs','11 Programming','Structured programming',1],
  ['cs','12 Software development','Program development life cycle',1],
  ['cs','12 Software development','Program design',1],
  ['cs','12 Software development','Testing and maintenance',1],
  ['cs','13 Data representation (A2)','User-defined data types',2],
  ['cs','13 Data representation (A2)','File organisation and access',2],
  ['cs','13 Data representation (A2)','Floating-point representation',2],
  ['cs','14 Communication (A2)','Protocols',2],
  ['cs','14 Communication (A2)','Circuit and packet switching',2],
  ['cs','15 Hardware and virtual machines','Processors, parallel processing and virtual machines',2],
  ['cs','15 Hardware and virtual machines','Boolean algebra and logic circuits',2],
  ['cs','16 System software (A2)','Purposes of an operating system',2],
  ['cs','16 System software (A2)','Translation software',2],
  ['cs','17 Security (A2)','Encryption, protocols and digital signatures',2],
  ['cs','18 Artificial intelligence','Artificial intelligence',2],
  ['cs','19 Computational thinking (A2)','Algorithms',2],
  ['cs','19 Computational thinking (A2)','Recursion',2],
  ['cs','20 Further programming','Programming paradigms',2],
  ['cs','20 Further programming','File processing and exception handling',2],
  ['german','Theme 1 — Society','Family and relationships',1],
  ['german','Theme 1 — Society','Digital world and media',1],
  ['german','Theme 1 — Society','Youth culture',1],
  ['german','Theme 2 — Culture','Music and festivals',1],
  ['german','Theme 2 — Culture','Film and television',1],
  ['german','Theme 2 — Culture','Regional identity',1],
  ['german','Grammar','Cases and declension',1],
  ['german','Grammar','Tenses and word order',1],
  ['german','Grammar','Adjective endings',1],
  ['german','Grammar','Subjunctive (Konjunktiv)',1],
  ['german','Theme 3 — Immigration','Migration to Germany',2],
  ['german','Theme 3 — Immigration','Integration and multiculturalism',2],
  ['german','Theme 3 — Immigration','Reactions and far-right politics',2],
  ['german','Theme 4 — History','Division and the Berlin Wall',2],
  ['german','Theme 4 — History','Reunification',2],
  ['german','Theme 4 — History','The Federal Republic since 1990',2],
  ['german','Skills','Literary text study',2],
  ['german','Skills','Film study',2],
  ['german','Skills','Translation into German',2],
  ['german','Skills','Translation into English',2],
  ['german','Skills','Speaking — independent research',2],
];

// A generic three-term year, so a fresh install has a shape to look at. Your own
// school's term dates and closures belong in profile.json under `school.calendar`,
// which replaces this wholesale — they are not in this repository.
const DEFAULT_CALENDAR = {
  lastDay: '2027-06-30',
  terms: [
    { name: 'Term 1', start: '2026-09-01', end: '2026-12-18' },
    { name: 'Term 2', start: '2027-01-05', end: '2027-03-26' },
    { name: 'Term 3', start: '2027-04-12', end: '2027-06-30' },
  ],
  holidays: [
    { start: '2026-10-26', end: '2026-10-30', label: 'Autumn half term' },
    { start: '2026-12-21', end: '2027-01-04', label: 'Christmas break' },
    { start: '2027-02-15', end: '2027-02-19', label: 'Spring half term' },
    { start: '2027-03-29', end: '2027-04-09', label: 'Easter break' },
    { start: '2027-05-31', end: '2027-06-04', label: 'Summer half term' },
  ],
};
export const CALENDAR = PROFILE.school?.calendar ?? DEFAULT_CALENDAR;

// University targets. Requirements verified against the official pages in
// September 2026 — they change, so every entry carries its source link.
export const UNIS = [
  {
    id: 'eth', name: 'ETH Zürich', city: 'Zurich, Switzerland', status: 'dream',
    programmes: ['Mechanical Engineering (BSc Maschineningenieurwissenschaften)',
                 'Electrical Engineering & Information Technology (BSc)',
                 'Computer Science (BSc Informatik)'],
    language: { lang: 'German', level: 'C1', deadline: '31 March of application year',
      note: 'Every Bachelor programme is taught in German, and a C1 certificate is due by 31 March (ETH calls that deadline fixed). As a native speaker raised in Germany this is a formality, not a barrier — ETH waives the certificate for German mother tongue, and a Goethe C2 covers you outright if they want paper. Teaching being in German is an advantage here, not an obstacle.',
      met: true },
    entry: 'A Levels do not usually grant direct admission. Expect the ETH entrance examination — reduced (4 subjects) or comprehensive (8 subjects) depending on your exact certificate. ETH only confirms which after you apply.',
    requirements: [
      'At least 6 IGCSEs and 3 A Levels — you already clear the IGCSE half.',
      'A Level grades of at least B, B, C, with Maths or a natural science among them.',
      'Breadth across six areas: first language, second language, maths, a natural science, a humanity, plus an elective. Your IGCSEs cover all six.',
    ],
    exam: {
      when: 'Third and fourth weeks of January, at the ETH main building. The 2027 sitting is 18–28 January, so yours would be January 2028.',
      register: '15 September – 15 October the autumn before.',
      fee: 'CHF 550 reduced (4 subjects) · CHF 800 comprehensive (8 subjects).',
      format: 'Written papers Monday to Wednesday, orals across the following week.',
      syllabus: 'Set to the Swiss Matura syllabus, not the A Level one — so it is extra preparation, not revision you are doing anyway.',
      warning: 'It falls about four months BEFORE your A Levels, in the middle of Year 13.',
      subjects: 'The science core is mathematics, physics and chemistry — the three ETH publishes no restricted syllabus list for.',
      passRate: 0.30,
      passNote: 'Roughly 30% of candidates pass; you need about a 60% average. ETH does not publish official figures, so treat this as the commonly reported range, not gospel.',
    },
    acceptance: { bachelor: '25–30%', international: 'International students are only 20% of the Bachelor intake — ETH Bachelors are mostly Swiss.',
      note: 'ETH publishes no official acceptance rate; these are third-party estimates. For you the number that matters is the entrance-exam pass rate, not the headline.' },
    dataNote: 'No Bachelor in Data Science — the route is BSc Informatik or Mathematics, then the MSc.',
    link: 'https://ethz.ch/en/studies/bachelor/application/non-swiss-matriculation-certificate/admission-prerequisites.html',
  },
  {
    id: 'tum', name: 'TU München', city: 'Munich, Germany', status: 'backup',
    programmes: ['Mechanical Engineering (BSc)', 'Electrical Engineering & IT (BSc)',
                 'Informatics (BSc)', 'Management & Technology (BSc, English-taught)'],
    language: { lang: 'German', level: 'C1', deadline: '15 July (winter semester)',
      note: 'Most engineering Bachelors are German-taught (C1 via TestDaF 4 or DSH-2) — no obstacle for a native speaker. The German-taught route is also the wider choice; English-taught options are the minority.',
      met: true },
    entry: 'A Levels accepted as a school-leaving qualification. Around AAA is the indicative benchmark, with strong Maths and Physics expected.',
    link: 'https://www.tum.de/en/studies/application',
  },
  {
    id: 'de', name: 'Germany — other', city: 'RWTH Aachen, KIT, TU Berlin…', status: 'backup',
    programmes: ['Mechanical Engineering', 'Electrical Engineering', 'Computer Science', 'Data Science'],
    language: { lang: 'German', level: 'C1', deadline: 'usually 15 July',
      note: 'German-taught Bachelors need C1 (TestDaF/DSH) — a formality for you. It opens up nearly every engineering faculty in the country.',
      met: true },
    entry: 'A Levels normally count as a Hochschulzugangsberechtigung with Maths plus two sciences. Most applications go through uni-assist.',
    link: 'https://www.uni-assist.de/en/',
  },
];

// Loaded from profile.json. `maps` links a result to the A Level subjects it
// forms a baseline for.
export const IGCSE = PROFILE.igcse ?? [];


// How much harder a subject sits than its IGCSE feeder, in A Level percentage
// points. Further Maths is taken by a self-selected cohort and examined harder,
// so the same student lands below their Maths grade.
export const SUBJECT_DIFFICULTY = { maths: 0, fmaths: -5, physics: 0, cs: 0, german: 0 };

// Rough IGCSE → A Level expectation, as a percentage to seed the projection
// before real papers exist. A heuristic for planning, not a prediction.
export const IGCSE_BASELINE = { '9': 86, '8': 77, '7': 69, '6': 60, '5': 52, '4': 45,
                                'A*': 86, 'A': 77, 'B': 69, 'C': 60, 'D': 52 };

// The fixed dates an ETH application hangs off, for a Year 12 starting Sept 2026.
// Your IAL is modular — units are sat and banked as you finish them, not all at
// the end — so real unit exam dates sit alongside the ETH milestones here.
const DEFAULT_MILESTONES = [
  // Verified against Pearson's own FINAL January 2027 timetable PDF (fetched
  // 9 Sept 2026) — real dates, not estimates. Your first exam session.
  { date: '2027-01-08', label: 'P1 exam — Maths (WMA11)', note: 'Friday, morning, 1h 30m. Your first A Level exam.' },
  { date: '2027-01-11', label: 'Unit 1 exam — Physics (WPH11)', note: 'Monday, afternoon, 1h 30m. Mechanics and Materials.' },
  { date: '2027-01-19', label: 'D1 exam — Further Maths (WDM11)', note: 'Tuesday, afternoon, 1h 30m. Decision Mathematics 1.' },
  { date: '2027-09-15', label: 'Entrance-exam registration opens', note: 'Window is 15 Sep – 15 Oct. Miss it and you wait a year.' },
  { date: '2027-10-14', tag: 'uk', label: 'TMUA October sitting (approx.)', note: 'Only if you keep the UK applications. Booking opens around June through UAT-UK, and you get one attempt per cycle.' },
  { date: '2027-10-15', label: 'Entrance-exam registration closes', note: 'Hard deadline.' },
  { date: '2027-11-01', tag: 'mit', label: 'MIT Early Action deadline', note: 'Only if you keep MIT. Essays, two teacher letters and the Maker Portfolio all due together.' },
  { date: '2027-12-01', label: 'ETH applications open', note: 'Apply in the first week. Nothing is gained by waiting and the portal gets slower near the deadline.' },
  { date: '2028-01-15', tag: 'uk', label: 'UCAS deadline (approx.)', note: 'The equal-consideration date for Imperial and Warwick — mid-January, not October. Aim to send it in October anyway so it stays clear of the entrance exam.' },
  { date: '2028-01-18', label: 'ETH entrance examination', note: 'Approximate — ETH confirms exact dates. Swiss Matura syllabus, four months before your final A Level session.' },
  { date: '2028-03-31', label: 'ETH application + language certificate due', note: 'ETH calls this fixed and non-negotiable.' },
  { date: '2028-05-15', label: 'Final exam series begins (approx.)', note: 'The last of several modular sittings — most units by this point are already banked.' },
  { date: '2028-07-15', label: 'TUM application deadline', note: 'Winter semester intake.' },
  { date: '2028-08-17', label: 'A Level results day (approx.)', note: 'Usually the third Thursday of August. Upload to ETH and TUM the same morning.' },
];
// Which units you are entered for is yours — `milestones` in profile.json wins.
export const MILESTONES = PROFILE.milestones ?? DEFAULT_MILESTONES;

/* ================================================================== the route
   The application campaign, as one plan: every minimum requirement, every fixed
   date, and the portfolio that has to exist alongside the grades.

   Two constraints shape all of it — nothing here needs travel, and nothing here
   costs money unless it carries a cost tag. This is reference data: it is
   replaced on a schema bump. Your ticks live in `routeDone` and survive.        */
export const ROUTE = {
  thesis: 'Two jobs only: meet every minimum requirement, and build a portfolio that makes the grades mean something.',
  rules: [
    ['No travel.', 'Every project runs from home, from school or online.'],
    ['Free by default.', 'Anything that costs money carries a price tag.'],
    ['One application.', 'The same CV, portfolio and write-ups are reused everywhere.'],
  ],

  phases: [
    { id: 'p1', station: 'Alcúdia', when: 'Sep – Oct 2026', end: '2026-10-31',
      why: 'Find out which ETH door you are going through. Almost everything else in this plan hangs off that one answer, and it costs an email.',
      tasks: [
        { id: 'r1', crit: 1, tags: ['eth'], t: 'Email ETH admissions with your exact subjects and ask two things.',
          n: 'One: do Maths, Further Maths, Physics and Computer Science give you direct admission, or the entrance examination? Two: does your German IGCSE plus native-speaker status cover the language and second-language requirement? The Uni tab currently assumes the entrance exam, which is the harsher of the two doors. A written answer reshapes your whole Year 13.' },
        { id: 'r2', crit: 1, tags: ['eth', 'de'], cost: 'entry fee', t: 'Only if ETH says you need a language A Level: ask the school which board they can enter you for, and what it costs.',
          n: 'Do not sign up for an extra A Level before the answer to r1 arrives. It may be an entire subject you do not need.' },
        { id: 'r3', tags: ['eth'], t: 'If the entrance exam applies, put chemistry into the Plan from summer 2027 onwards.',
          n: 'ETH examines maths, physics and chemistry. You stopped chemistry at IGCSE, and the Uni tab already counts that against your odds — this is the task that fixes it.' },
        { id: 'r4', crit: 1, tags: ['uk', 'mit'], t: 'Decide with your parents whether to keep the UK and MIT applications, using the costs on the Requirements tab.',
          n: 'Untick them in Progress if not. That hides their tasks and gives the hours back to grades and projects.' },
        { id: 'r5', tags: ['uk'], t: 'Check the Pearson test-centre locator for a UAT-UK centre in Palma.',
          n: 'Search "UAT-UK", then "Palma". The TMUA can only be sat at a Pearson centre — not at home and not at school. A centre on the mainland means a day trip; no realistic centre means the UK route is not worth its cost.' },
        { id: 'r6', tags: ['port'], t: 'Create your GitHub account with a profile README: who you are, what you build, links to the projects.' },
        { id: 'r7', tags: ['port'], t: 'Publish this dashboard as your first repository.',
          n: 'Move the password and any keys out of the code and into environment variables first. Say plainly in the README where Claude Code helped, and make sure you can explain every part of it — you will be asked.' },
        { id: 'r8', tags: ['skill'], t: 'Start Harvard CS50P, four to five hours a week. Free on edX.' },
        { id: 'r9', tags: ['port'], t: 'Email Jannek at MallorcaWeek about VillaWatt. A no means you run it in your own home instead.' },
        { id: 'r10', tags: ['grades'], t: 'Log your first past paper on the Papers tab.',
          n: 'Three papers in a subject and the dashboard stops guessing your A Level from your IGCSE. Until then every prediction on the Requirements tab is an estimate built on 2025 results.' },
      ] },

    { id: 'p2', station: 'Palma', when: 'Nov 2026 – Feb 2027', end: '2027-02-28',
      why: 'Get Grid Watch collecting before Christmas. It is the one thing here that cannot be rushed later — every month it runs makes it worth more.',
      tasks: [
        { id: 's1', crit: 1, tags: ['port'], t: 'December: Grid Watch hourly collector live on GitHub Actions.',
          n: 'A small Python script on a free schedule, saving Balearic electricity and weather data into your repo. Started in December, it has fifteen months of history by the ETH deadline. Started next summer, it has six.' },
        { id: 's2', crit: 1, tags: ['grades'], t: 'January unit exams: P1 on the 8th, Physics Unit 1 on the 11th, D1 on the 19th.',
          n: 'Three banked unit grades, four months in. These are the first hard evidence any university sees about you, and unlike mocks they are permanent.' },
        { id: 's3', crit: 1, tags: ['skill'], t: 'Finish CS50P by the end of December and publish the final project.' },
        { id: 's4', tags: ['port', 'skill'], t: 'Enter Bundeswettbewerb Informatik round 1 — free, German, and open to you as a German citizen abroad.',
          n: 'Round 1 runs roughly September to November and is done at home, in your own time. Check this year’s dates on the BwInf site. A placing here is worth more to a German or Swiss faculty than another side project.' },
        { id: 's5', tags: ['port'], t: 'January: live chart page for Grid Watch on GitHub Pages.' },
        { id: 's6', tags: ['skill'], t: 'Learn enough electronics for VillaWatt: Ohm’s law, voltage dividers, reading a datasheet.' },
        { id: 's7', tags: ['port'], cost: '≈ €25', t: 'Order the VillaWatt parts: an ESP32, an SCT-013 clip-on current sensor, a DHT22.' },
        { id: 's8', tags: ['skill'], t: 'February: start Andrew Ng’s Machine Learning Specialization. Audit it for free.' },
        { id: 's9', tags: ['eth'], t: 'Choose your one ETH programme. Electrical Engineering & IT sits closest to AI, hardware and energy together.' },
      ] },

    { id: 'p3', station: 'Barcelona', when: 'Mar – Jun 2027', end: '2027-06-30',
      why: 'Grades season. Year 12 results set your predictions, and predictions set which offers are even possible. Projects tick over in the background — start nothing new.',
      tasks: [
        { id: 't1', crit: 1, tags: ['grades', 'uk', 'mit'], t: 'Year 12 summer exams. These become your UCAS predicted grades and MIT’s school report.' },
        { id: 't2', tags: ['port'], t: 'Install VillaWatt in the villa, or in your own home.',
          n: 'Anything inside the fuse box is an electrician’s job. The clip-on sensor is designed to go around a cable without breaking it — that part is yours.' },
        { id: 't3', tags: ['port'], t: 'Grid Watch: first demand forecast, published against a naive baseline.',
          n: 'The baseline is "same hour last week". Showing your model beating it by a stated margin is real; showing an accuracy figure with nothing to compare it to is not.' },
        { id: 't4', tags: ['port'], t: 'SwingSense: 200+ labelled swings with the free phyphox app — or skip the phone and use the Garmin history you already have.',
          n: 'You already own years of training data from the race-coach dashboard. Same pipeline, same machine learning, no new recording work.' },
        { id: 't5', tags: ['port', 'skill'], t: 'Enter Bundeswettbewerb Mathematik. Free, done at home, deadline around 1 March, open to German students abroad.' },
        { id: 't6', tags: ['mit'], cost: '≈ $100+', t: 'Sit the SAT once in spring, if MIT is still in.',
          n: 'Check College Board for a Mallorca centre before you plan anything else around it.' },
        { id: 't7', tags: ['eth', 'de'], t: 'Sit A Level German in June, if the school allows it and ETH said you need it. That makes Year 13 lighter.' },
      ] },

    { id: 'p4', station: 'Lyon', when: 'Jul – Aug 2027', end: '2027-08-31',
      why: 'The biggest uninterrupted build window you get. Turn data into results, and results into writing you can reuse in every application.',
      tasks: [
        { id: 'u1', crit: 1, tags: ['port'], t: 'VillaWatt: eight weeks of data turned into one finding with a number on it.',
          n: 'For example: cooling running eleven hours a week in an empty house. One measured number beats a page of description.' },
        { id: 'u2', crit: 1, tags: ['eth'], t: 'If the entrance exam applies, start chemistry and Swiss-Matura maths and physics now.',
          n: 'The exam is in January, on a syllabus that is not yours. Four months of evenings starting in September is not enough, and it collides with UCAS and MIT.' },
        { id: 'u3', tags: ['port'], t: 'SwingSense: classifier trained and tested on swings it has never seen, dataset published, small web demo.' },
        { id: 'u4', tags: ['port'], t: 'Give the Grid Watch dataset a DOI through Zenodo. Free, one evening, and it makes the data citable.' },
        { id: 'u5', tags: ['port'], t: 'Get one pull request merged into a project you actually use.' },
        { id: 'u6', crit: 1, tags: ['port', 'uk', 'mit'], t: 'One written post per project: problem, data, method, result, what you would do next.',
          n: 'Your personal statement and MIT essays get assembled from these. Written in August they are a summary; written in October they are a panic.' },
        { id: 'u7', tags: ['eth', 'de'], t: 'Get the native-German exemption confirmed in writing by both ETH and TUM.' },
        { id: 'u8', tags: ['uk'], t: 'TMUA practice: two or three official past papers a week. The official papers are free.' },
        { id: 'u9', tags: ['port'], cost: '≈ €5', t: 'Optional: run SwingSense on an ESP32 with an MPU6050, so the model runs on the device itself.' },
      ] },

    { id: 'p5', station: 'Genève', when: 'Sep – Nov 2027', end: '2027-11-30',
      why: 'Three deadlines land inside six weeks, and the entrance-exam registration is one of them. This is the phase where a missed date costs a year.',
      tasks: [
        { id: 'v1', crit: 1, tags: ['eth'], cost: 'CHF 550–800', t: 'Register for the ETH entrance exam between 15 September and 15 October, if it applies to you.',
          n: 'There is no late entry. Missing this window means applying a year later, and the fee depends on whether you sit four subjects or eight.' },
        { id: 'v2', crit: 1, tags: ['uk'], cost: '£133', t: 'Book the TMUA October sitting at the centre you found.',
          n: 'Booking needs a UAT-UK account and opens around June. You get one attempt per application cycle, so do not spend it on practice — the official practice papers are free.' },
        { id: 'v3', crit: 1, tags: ['mit'], t: 'MIT Early Action by 1 November: essays, two teacher letters, school report, Maker Portfolio.',
          n: 'Ask the teachers in September, not October. Request the fee waiver if the fee is a burden — MIT states it plainly and it is not held against you.' },
        { id: 'v4', tags: ['port'], t: 'Grid Watch milestone: publish "A year of Balearic electricity data" as a short report on your site.' },
        { id: 'v5', tags: ['uk'], t: 'Submit UCAS. The real deadline is mid-January, but October keeps it clear of the entrance exam.' },
        { id: 'v6', crit: 1, tags: ['port', 'uk', 'mit', 'de'], t: 'Make the one-page portfolio PDF.',
          n: 'Nobody opens GitHub on your behalf. One page, five projects, one line and one number each, one link. It goes into UCAS, the MIT Maker Portfolio and the TUM CV unchanged.' },
      ] },

    { id: 'p6', station: 'Bern', when: 'Dec 2027 – Mar 2028', end: '2028-03-31',
      why: 'The ETH window, and the exam itself. Get the paperwork done in December so January is nothing but revision.',
      tasks: [
        { id: 'w1', crit: 1, tags: ['eth'], cost: 'CHF 150', t: 'Submit the ETH application in the first week of December. The window opens on the 1st.' },
        { id: 'w2', tags: ['eth'], t: 'Upload passport, photo, a CV on ETH’s own German template, and school reports from the last three years.' },
        { id: 'w3', crit: 1, tags: ['eth'], t: 'The ETH entrance examination, mid-to-late January. Written papers Monday to Wednesday, orals the following week.' },
        { id: 'w4', crit: 1, tags: ['eth', 'de'], t: 'If ETH never confirmed the exemption, the C1 or C2 certificate must be uploaded by 31 March. No extensions.' },
        { id: 'w5', tags: ['de'], cost: '≈ €75', t: 'Request the uni-assist preliminary documentation (VPD) for TUM and the backups. Start in January — it takes weeks.' },
        { id: 'w6', tags: ['grades'], t: 'Mocks. Every offer you hold by this point is conditional on the final grades.' },
      ] },

    { id: 'p7', station: 'Zürich HB', when: 'Apr – Aug 2028', end: '2028-08-31',
      why: 'German applications, the last units, results.',
      tasks: [
        { id: 'x1', crit: 1, tags: ['grades', 'eth'], t: 'A Level finals: at least A in Maths, Physics and German.' },
        { id: 'x2', tags: ['de'], t: 'Apply to TUM Electrical Engineering & IT when TUMonline opens, around mid-May.',
          n: 'Ask whether the A Level results can follow in August. They usually can, and it decides whether the July deadline is a problem.' },
        { id: 'x3', tags: ['de'], t: 'Two or three backups: KIT, RWTH Aachen, TU Darmstadt. Do the free online self-assessments first where they are required.' },
        { id: 'x4', tags: ['eth', 'de'], t: 'Results day, around mid-August: upload to ETH and TUM that same morning.' },
      ] },
  ],

  /* Minimum requirements, per destination. `req` ties an item to a live
     prediction in the dashboard — [subject, minimum grade]. */
  reqs: [
    { id: 'eth', name: 'ETH Zürich', prog: 'BSc Electrical Engineering & IT (German)',
      verdict: 'good', verdictLabel: 'First choice', keep: 'eth',
      items: [
        { id: 'm1', t: 'A Level Maths at A or above', req: ['maths', 'A'] },
        { id: 'm2', t: 'A Level Physics at A or above', req: ['physics', 'A'] },
        { id: 'm3', t: 'A Level Further Maths at A or above', req: ['fmaths', 'A'],
          n: 'Not formally required, but it is the subject that makes the entrance-exam maths survivable.' },
        { id: 'm4', t: 'Breadth across six areas: two languages, maths, a natural science, a humanity, an elective',
          n: 'Your IGCSEs cover all six on paper. Item m6 is what confirms it.' },
        { id: 'm5', t: 'Native-German exemption confirmed, or a C1/C2 certificate by 31 March' },
        { id: 'm6', t: 'Written confirmation of which route applies: direct admission or the entrance examination',
          n: 'The single most valuable unknown in this plan. Everything from chemistry revision to CHF 800 depends on it.' },
        { id: 'm7', t: 'If the exam applies: registered 15 Sep – 15 Oct, then passed at roughly 60%' },
        { id: 'm8', t: 'Application submitted between 1 December and 31 March' },
      ],
      money: 'Application CHF 150. The entrance exam is a further CHF 550 to 800 if it applies. Tuition for foreign students roughly tripled in 2025 to about CHF 2,200 a semester, which is still low by international standards; Zürich living costs are the real expense. No portfolio is assessed here — ETH admits on the certificate and the exam alone.' },

    { id: 'tum', name: 'TU München', prog: 'BSc Electrical Engineering & IT (German)',
      verdict: 'good', verdictLabel: 'Strong second', keep: 'de',
      items: [
        { id: 'm9', t: 'uni-assist preliminary documentation (VPD)' },
        { id: 'm10', t: 'A Levels recognised as Abitur-equivalent: Maths plus two sciences',
          n: 'Your IGCSE German and Spanish cover the language side of the rule.' },
        { id: 'm11', t: 'Maths at A or above', req: ['maths', 'A'] },
        { id: 'm12', t: 'Physics at A or above', req: ['physics', 'A'] },
        { id: 'm13', t: 'Application in TUMonline before the deadline' },
        { id: 'm14', t: 'Final A Level certificate uploaded' },
      ],
      money: 'uni-assist is about €75 for the first university and less for each additional one. No tuition fee for EU citizens — only a semester contribution of roughly €150.' },

    { id: 'de', name: 'German backups', prog: 'KIT · RWTH Aachen · TU Darmstadt',
      verdict: 'good', verdictLabel: 'Safety net', keep: 'de',
      items: [
        { id: 'm15', t: 'Online self-assessment completed where the university requires it. Free.' },
        { id: 'm16', t: 'Applications submitted by mid-July' },
      ],
      money: 'The same uni-assist documents are reused, so each extra university is a few euros. No tuition.' },

    { id: 'uk', name: 'Imperial + Warwick', prog: 'Imperial Computing · Warwick CS',
      verdict: 'mid', verdictLabel: 'Optional, expensive', keep: 'uk',
      items: [
        { id: 'm17', t: 'One UCAS application and one personal statement, covering both' },
        { id: 'm18', t: 'TMUA sat once — both universities accept the same score' },
        { id: 'm19', t: 'Predicted A*A*A with the A* in Maths', req: ['maths', 'A*'] },
        { id: 'm20', t: 'Further Maths at A* as the second A*', req: ['fmaths', 'A*'] },
      ],
      money: 'UCAS is about £30. The TMUA is £133 outside the UK and only sittable at a Pearson centre. Choosing Computing at Imperial rather than Electronic & Information Engineering means one admissions test instead of two. Studying there is roughly £45,000 a year in tuition alone, with no UK student loan available to you — this is the line that decides whether the whole branch is worth keeping.' },

    { id: 'mit', name: 'MIT', prog: 'Course 6-2, EECS',
      verdict: 'reach', verdictLabel: 'Long shot', keep: 'mit',
      items: [
        { id: 'm21', t: 'SAT score, spring or autumn 2027' },
        { id: 'm22', t: 'Short essays, assembled from your project write-ups' },
        { id: 'm23', t: 'Two teacher letters — one maths or science, one humanities — plus the school report' },
        { id: 'm24', t: 'Maker Portfolio: optional in general, obvious in your case' },
        { id: 'm25', t: 'Submitted by 1 November, Early Action' },
      ],
      money: 'The SAT is around $100 with the international fee. MIT will waive the application fee on request. If you were admitted, MIT meets full demonstrated financial need for international students too — so the cost of applying is the only cost you have to plan for.' },
  ],

  /* The portfolio. Two flagships that connect to each other, three supports. */
  projects: [
    { id: 'grid', flag: 1, kind: 'Flagship — data, AI, energy', name: 'Grid Watch Balearics',
      cost: '€0', place: 'Your laptop', proves: 'Data engineering, automation, forecasting',
      pitch: 'A bot that collects the islands’ electricity demand and generation every hour from Red Eléctrica’s free public data, plus weather from Open-Meteo. It saves everything into your repository, charts it live, and forecasts tomorrow’s demand while publishing its own accuracy every day.',
      why: 'It runs by itself for fifteen months before you apply, so the repository shows a growing open dataset and a long, honest commit history rather than a weekend. The tourist-season angle — how summer visitors bend an island’s power curve — is local knowledge nobody else in the pile has.',
      steps: [
        ['g1', 'Python script that downloads one day of data to CSV'],
        ['g2', 'GitHub Actions runs it hourly, on the free tier'],
        ['g3', 'Live chart page on GitHub Pages'],
        ['g4', 'Naive baseline forecast — same hour last week — then a model that beats it'],
        ['g5', 'Dashboard publishes forecast against reality, and its own error, daily'],
        ['g6', 'Data dictionary and a README explaining every column'],
        ['g7', 'Written report: what actually drives Balearic demand'],
        ['g8', 'Zenodo release, so the dataset has a DOI and can be cited'],
      ] },

    { id: 'villa', flag: 1, kind: 'Flagship — hardware, AI, energy', name: 'VillaWatt',
      cost: '≈ €25', place: 'MallorcaWeek villa, or your own home', proves: 'Embedded systems, sensors, real-world data',
      pitch: 'An ESP32 with a clip-on current sensor and a temperature sensor, logging a single house’s power use and indoor climate. It flags waste — cooling running in an empty house — and sets the house against the island-wide picture from Grid Watch.',
      why: 'This is the hardware half of one story. The two flagships answer each other: one watches an island, one watches a room, and the second explains the first.',
      steps: [
        ['v1', 'Breadboard prototype reading current and temperature'],
        ['v2', 'Safe install — an electrician does anything inside the fuse box'],
        ['v3', 'Readings pushed every minute to the repo or a free database'],
        ['v4', 'Eight weeks of continuous data'],
        ['v5', 'Waste detection, checked against when the house was actually occupied'],
        ['v6', 'Write-up with a measured saving in kWh and euros, and photographs'],
      ] },

    { id: 'swing', kind: 'Project — machine learning on the edge', name: 'SwingSense',
      cost: '€0 (≈ €5 optional)', place: 'Golf practice, or your existing Garmin history', proves: 'Machine learning on sensor data',
      pitch: 'Motion data — from your phone through the free phyphox app, or from the Garmin history you already own — labelled, used to train a classifier, then published as a dataset with a small web demo.',
      why: 'Machine learning on real physical signals, grown out of something you actually do. That makes it easy to talk about under interview pressure, which is exactly when invented interests fall apart.',
      steps: [
        ['s1', '200+ labelled samples recorded, or exported from Garmin'],
        ['s2', 'Classifier trained and tested on data it has never seen'],
        ['s3', 'Dataset and notebook published'],
        ['s4', 'Web demo: upload a recording, get a prediction'],
      ] },

    { id: 'os', kind: 'Project — credibility', name: 'Open-source contribution',
      cost: '€0', place: 'Online', proves: 'You can work inside someone else’s codebase',
      pitch: 'Fix a bug or improve the documentation in a project you used while building the rest — ESPHome, a Python library, anything you genuinely depend on. A merged pull request shows publicly on your profile forever.',
      why: 'Almost no school-age applicant has one. It proves you can read code you did not write, which is most of the job and none of the syllabus.',
      steps: [
        ['o1', 'Pick a project you actually used; find a "good first issue"'],
        ['o2', 'One pull request merged'],
      ] },

    { id: 'dash', kind: 'Starter repository', name: 'A Level Dashboard',
      cost: '€0', place: 'Already built', proves: 'You ship tools you then rely on',
      pitch: 'This dashboard, cleaned up and published.',
      why: 'It turns work you have already done into visible evidence immediately, and it is the only project here you use every single day.',
      steps: [
        ['d1', 'Secrets out of the code, README with screenshots'],
        ['d2', 'An honest note on AI assistance — and you can explain every part of it'],
      ] },
  ],

  /* Where a portfolio actually gains altitude. Most applicants stop at level 2. */
  ladder: [
    ['It works', 'The code runs and the README explains it. This is the floor, not an achievement.'],
    ['It ran on real data', 'Months of it, collected by you, from the real world. Most applicants never get here.'],
    ['Someone else used it', 'A named person who is not you or your family, and what it did for them.'],
    ['It is externally recognised', 'A citable DOI, a competition placing, a merged pull request, a published dataset other people download.'],
  ],

  /* Concrete ways to climb it. Everything here is free or nearly free, remote,
     and doable from Mallorca. */
  boosters: [
    { id: 'b1', tier: 4, name: 'Give the dataset a DOI', cost: '€0', effort: 'One evening', when: 'Summer 2027',
      who: ['eth', 'de', 'mit'],
      what: 'Connect the Grid Watch repository to Zenodo and cut a release. Zenodo mints a permanent DOI and the dataset becomes formally citable.',
      why: 'A seventeen-year-old with a citable dataset is a different category of applicant from one with a GitHub link. It costs nothing and takes an evening, which is the best ratio on this page.' },

    { id: 'b2', tier: 4, name: 'Bundeswettbewerb Informatik', cost: '€0', effort: '2–3 weekends', when: 'Sep – Nov, annually',
      who: ['eth', 'de'],
      what: 'Germany’s national informatics competition. Round 1 is done at home over several weeks, and German citizens abroad can enter.',
      why: 'A national placing is external proof of ability, which is the one thing a self-built portfolio structurally cannot provide. German and Swiss faculties know exactly what it means.' },

    { id: 'b3', tier: 4, name: 'Bundeswettbewerb Mathematik', cost: '€0', effort: '2–3 weekends', when: 'Deadline ≈ 1 March',
      who: ['eth', 'de', 'uk'],
      what: 'The same idea for maths: a handful of hard problems, worked at home over months, submitted by post or upload.',
      why: 'It is the closest free thing to a signal that you can do the ETH entrance exam, and the preparation is not separate from your revision — it is harder revision.' },

    { id: 'b4', tier: 3, name: 'Find one real user', cost: '€0', effort: 'A few conversations', when: 'From summer 2027',
      who: ['uk', 'mit'],
      what: 'Get one named person who is not family using something you built — the villa owner, a teacher, the golf club — and put their name and one sentence in the README.',
      why: 'It moves a project from "school exercise" to "product". Interviewers ask what happened when someone else used it; almost nobody can answer.' },

    { id: 'b5', tier: 4, name: 'British Physics Olympiad', cost: 'small school fee', effort: 'Practice papers', when: 'November, annually',
      who: ['uk', 'mit'],
      what: 'Your school registers and runs it. Open to international schools, and the Senior Physics Challenge sits at a level worth attempting in Year 13.',
      why: 'It is graded by someone outside your school, and the physics it stretches is the same physics ETH will examine you on.' },

    { id: 'b6', tier: 3, name: 'Kaggle, once, properly', cost: '€0', effort: '2 weeks', when: 'Summer 2027',
      who: ['uk', 'mit', 'de'],
      what: 'One competition, entered seriously, with a public notebook explaining your approach.',
      why: 'A public leaderboard position is a number someone else assigned you. Your own accuracy figures are not.' },

    { id: 'b7', tier: 3, name: 'Write, do not just build', cost: '€0', effort: '3 hours per project', when: 'Summer 2027',
      who: ['uk', 'mit', 'eth'],
      what: 'One proper post per project — around a thousand words, with one chart and one honest paragraph about what did not work.',
      why: 'It is the raw material for the personal statement and the MIT essays, so it is not extra work. And the paragraph on what failed is the part that reads as real.' },

    { id: 'b8', tier: 2, name: 'Make the repositories look professional', cost: '€0', effort: 'An afternoon each', when: 'Ongoing',
      who: ['uk', 'mit', 'de'],
      what: 'Tests, a CI badge that goes green, a licence, semantic commit messages, no dead code, no commented-out blocks.',
      why: 'Anyone technical who opens your repository decides within thirty seconds whether you are a student or an engineer. This is that thirty seconds.' },

    { id: 'b9', tier: 3, name: 'Teach it to someone', cost: '€0', effort: '1 hour a week', when: 'From spring 2027',
      who: ['uk', 'mit'],
      what: 'Run a short Python or Arduino club at school, or tutor two GCSE students through the year.',
      why: 'UK and US applications ask directly about leadership and communication. ETH does not care at all — so this is only worth the hour if you keep those branches.' },

    { id: 'b10', tier: 2, name: 'One page, printed', cost: '€0', effort: 'One evening', when: 'Autumn 2027',
      who: ['uk', 'mit', 'de'],
      what: 'A single-page PDF: five projects, one line and one number each, one link. Nothing else.',
      why: 'Admissions readers spend minutes on you, not hours, and none of those minutes are spent browsing a repository. The page is what they actually see.' },

    { id: 'b11', tier: 2, name: 'Reuse the data you already own', cost: '€0', effort: 'A weekend', when: 'Any time',
      who: ['uk', 'mit'],
      what: 'You already have years of Garmin training history behind the race-coach dashboard. That is a free, personal, long-horizon dataset most applicants would have to spend a year collecting.',
      why: 'It is the cheapest possible route to a project at level 2 of the ladder, because the hard part — the waiting — is already done.' },

    { id: 'b12', tier: 3, name: 'One online hackathon', cost: '€0', effort: '48 hours', when: 'Any holiday',
      who: ['uk', 'mit'],
      what: 'A remote hackathon, in a team, with a submitted project at the end.',
      why: 'It is evidence you can work with other people under a deadline — the one thing a portfolio of solo projects cannot show.' },
  ],

  standout: [
    'A README that opens with the problem and the result, not the install instructions',
    'A screenshot or a short GIF above the fold',
    'Instructions complete enough that a stranger can run it',
    'Real numbers: accuracy, hours of data collected, kWh saved',
    'A two-minute demo recorded on your phone',
    'A licence, and a commit history that shows months rather than a weekend',
  ],
};

// The two-week rota, transcribed from the printed timetable. This is
// reference data, not something you type in — it is restored on every
// schema bump so it cannot quietly disappear.
// The school day, as printed on the timetable.
// A plausible school day, not anyone's actual one. Your bell times go in
// profile.json under `school.periods`.
const DEFAULT_PERIODS = [
  { id: 'R',  start: '08:50', end: '09:00', label: 'Registration' },
  { id: '1',  start: '09:00', end: '10:00' },
  { id: '2',  start: '10:00', end: '11:00' },
  { id: 'B1', start: '11:00', end: '11:20', label: 'Break' },
  { id: '3',  start: '11:20', end: '12:20' },
  { id: '4',  start: '12:20', end: '13:20' },
  { id: 'L1', start: '13:20', end: '14:00', label: 'Lunch' },
  { id: '5',  start: '14:00', end: '15:00' },
  { id: '6',  start: '15:00', end: '16:00' },
];
export const PERIODS = PROFILE.school?.periods ?? DEFAULT_PERIODS;

// An empty two-week rota: the right shape, none of anyone's lessons or rooms.
// Fill yours in on the Timetable tab, or put it in profile.json under
// `school.timetable` so a reseed restores it instead of wiping it.
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DEFAULT_TIMETABLE = {
  A: Object.fromEntries(DAYS.map((d) => [d, []])),
  B: Object.fromEntries(DAYS.map((d) => [d, []])),
};
export const TIMETABLE = PROFILE.school?.timetable ?? DEFAULT_TIMETABLE;

export function seedTopics() {
  return T.map(([subjectId, unit, name, year], i) => ({
    id: 't' + String(i + 1).padStart(3, '0'),
    subjectId, unit, name, year,
    confidence: 0,
    lastStudied: null,
    studyCount: 0,
    started: false,     // school has begun teaching it
    finished: false,    // school has finished teaching it
    taught: false,      // kept as an alias for `finished`
    notes: '',
    links: [],
  }));
}

// Rows in TIMETABLE name a period; the times and ids come from the period table
// so they can never drift apart.
function hydrateTimetable(periods) {
  const P = Object.fromEntries(periods.map((p) => [p.id, p]));
  const out = {};
  // profile.json is hand-edited, so _comment keys turn up anywhere. Skip them
  // and anything that is not the shape we expect rather than throwing on boot.
  for (const [wk, days] of Object.entries(TIMETABLE)) {
    if (wk.startsWith('_') || !days || typeof days !== 'object') continue;
    out[wk] = {};
    for (const [day, rows] of Object.entries(days)) {
      if (day.startsWith('_') || !Array.isArray(rows)) continue;
      out[wk][day] = rows.map((r, i) => ({
        id: `${wk}${day}${r.period}`,
        subjectId: r.subjectId,
        period: r.period,
        start: P[r.period]?.start || '',
        end: P[r.period]?.end || '',
        room: r.room || '',
        ...(r.title ? { title: r.title } : {}),
      }));
    }
  }
  return out;
}

export function seedState() {
  // Which year you are in and when your term starts are yours, so they come from
  // profile.json when it has them. The fallbacks line up with DEFAULT_CALENDAR.
  const firstDay = CALENDAR.terms?.[0]?.start ?? '2026-09-01';
  const me = {
    termStart: firstDay, weekAStart: firstDay,
    examYear: 2028, yearGroup: 12, examStart: '2028-05-15', form: '',
    ...(PROFILE.me || {}),
  };
  return {
    schema: SCHEMA,
    version: 1,
    profile: me,
    calendar: CALENDAR,
    unis: UNIS,
    milestones: MILESTONES,
    route: ROUTE,
    routeDone: {},
    routeOpts: { uk: true, mit: true },
    igcse: IGCSE,
    subjects: SUBJECTS,
    topics: seedTopics(),
    homework: [],
    sessions: [],
    papers: [],
    // Two-week rota. Term starts in week A, so the week containing weekAStart
    // is A and they alternate from there.
    timetable: hydrateTimetable(PERIODS),
    whiteboards: [],
    cards: [],
    settings: {
      boundaries: PROFILE.boundaries ?? { 'A*': 80, A: 70, B: 60, C: 50, D: 40, E: 30 },
      weeklyTargetHours: 20,
      periodsPerFortnight: 10,  // each A Level over the two-week rota
      periods: PERIODS,
    },
  };
}
