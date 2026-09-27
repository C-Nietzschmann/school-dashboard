import { readProfile } from './paths.mjs';

// Personal results live in profile.json inside the data directory, never in the
// repository — so this file, and anything built from it, can be published
// without publishing your grades. Missing means an empty profile, which is a
// working dashboard with nothing filled in.
const PROFILE = readProfile();

// Seed content for a fresh install: subjects + A Level spec topics.
// Everything here is editable in the app afterwards — this is only the starting point.

// Bump this whenever reference data changes (calendar, unis, milestones, IGCSE,
// subject targets). Anything the user authored is never touched by a reseed.
export const SCHEMA = 10;

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
   An EXAMPLE university plan, so a fresh install shows what the Route tab does.
   Everything in it is invented. Your real plan is yours: import it in Files →
   Route plan (or through the connector's route.import) and it lives in your
   data, never in this repository. See lib/route.mjs for what the tab does with it. */
export const EXAMPLE_ROUTE = {
  _example: true,
  version: 2,
  name: 'Route to university (example)',
  note: 'An invented example plan. Import your own in Files → Route plan.',
  story: 'I build small tools that turn real-world data into decisions.',
  context: 'Example student: Year 12, taking Maths, Further Maths, Physics and Computer Science, aiming for an engineering degree.',
  phases: [
    { id: 'p1', station: 'Start', when: 'Sep – Dec 2026', start: '2026-09-01', end: '2026-12-31',
      why: 'Find out exactly what your first-choice course asks for, and set up a place to show your work.',
      tasks: [
        { id: 'x-a1', text: 'Read the entry requirements for your first-choice course, subject by subject.', note: 'Write down the exact grades and subjects it asks for.', tags: ['uni'], critical: true, cost: null },
        { id: 'x-a2', text: 'Create a GitHub account with a profile README.', note: null, tags: ['port'], critical: false, cost: null },
        { id: 'x-a3', text: 'Decide with your family which optional applications to keep.', note: null, tags: ['uk'], critical: false, cost: null },
      ] },
    { id: 'p2', station: 'Build', when: 'Jan – Jun 2027', start: '2027-01-01', end: '2027-06-30',
      why: 'Grades first; one project quietly collecting data in the background.',
      tasks: [
        { id: 'x-b1', text: 'Year 12 exams: aim for your predicted grades.', note: null, tags: ['grades'], critical: true, cost: null },
        { id: 'x-b2', text: 'Start the weather-logger project.', note: null, tags: ['port'], critical: false, cost: '≈ €10' },
        { id: 'x-b3', text: 'Ask two teachers which of your grades they would predict today.', note: null, tags: ['grades'], critical: false, cost: null },
      ] },
    { id: 'p3', station: 'Apply', when: 'Jul 2027 – Jan 2028', start: '2027-07-01', end: '2028-01-31',
      why: 'Applications, written from the work you already have.',
      tasks: [
        { id: 'x-c1', text: 'Submit your applications before the deadline.', note: null, tags: ['uni'], critical: true, cost: null },
        { id: 'x-c2', text: 'Write up your project: problem, data, method, result.', note: null, tags: ['port'], critical: false, cost: null },
      ] },
  ],
  courses: [
    { id: 'x-k1', phase: 'p1', core: true, name: 'Introduction to programming in Python', by: 'An online course', url: 'https://example.org/python', cert: 'free', certNote: null, when: 'Autumn 2026', feeds: 'Everything' },
    { id: 'x-k2', phase: 'p2', core: false, name: 'Intro to data visualisation', by: 'An online course', url: 'https://example.org/dataviz', cert: 'none', certNote: null, when: 'Spring 2027', feeds: 'The project' },
  ],
  earn: [
    { id: 'earn-tutoring', name: 'Tutoring younger students', pitch: 'Teach what you are good at over video call.', why: 'It pays, and it is something real to say about communication.',
      sites: [], steps: [
        { id: 'x-n1', phase: 'p1', text: 'Write a one-paragraph offer and ask your school who needs help' },
        { id: 'x-n2', phase: 'p2', text: 'First regular student' },
      ] },
  ],
  projects: [
    { id: 'proj-logger', name: 'Weather logger', mini: false, cost: '≈ €10', kind: 'Flagship: data + hardware', start: 'p2',
      pitch: 'A small sensor logging temperature every ten minutes, compared with the forecast.', why: 'Months of real data you collected yourself.',
      steps: [
        { id: 'x-g1', text: 'Sensor reading on a breadboard', phase: null },
        { id: 'x-g2', text: 'Logging every ten minutes, for a month', phase: null },
        { id: 'x-g3', text: 'Write-up: how wrong is the forecast?', phase: null },
      ] },
    { id: 'proj-sim', name: 'Physics simulation', mini: true, cost: '€0', kind: 'Mini project (2 weeks)', start: null,
      pitch: 'A projectile with air resistance, plotted against the textbook formula.', why: 'Doubles as revision.',
      steps: [{ id: 'x-y1', text: 'Simulation and plot', phase: 'p2' }] },
  ],
  deadlines: [
    { date: '2027-06-01', label: 'Year 12 exams', approx: true, tag: 'grades' },
    { date: '2027-10-15', label: 'Optional applications (your target)', approx: false, tag: 'uk' },
    { date: '2028-01-15', label: 'Application deadline', approx: true, tag: 'uni' },
  ],
  unis: [
    { id: 'uni-first', name: 'First-choice university', prog: 'BSc Engineering', verdict: 'Main target', keep: 'uni', money: 'Check the application fee and tuition on the official site.',
      items: [
        { id: 'uni-first-1', text: 'Maths at grade A or above', req: ['maths', 'A'] },
        { id: 'uni-first-2', text: 'Physics at grade A or above', req: ['physics', 'A'] },
        { id: 'uni-first-3', text: 'Application submitted on time' },
      ] },
  ],
  examWindows: [{ from: '2027-05-01', to: '2027-06-20', label: 'Year 12 exams' }],
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
    // True when every value below is an invented default — either no profile was
    // found, or the one found is still the shipped example. upgrade() uses this
    // to refuse to overwrite real school data it already holds.
    generic: Object.keys(PROFILE).length === 0 || PROFILE._example === true,
    profile: me,
    calendar: CALENDAR,
    unis: UNIS,
    milestones: MILESTONES,
    route: EXAMPLE_ROUTE,
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
    // written by the companion app (companion.html)
    attachments: [],     // uploads: Drive link, subject, topic, assignment
    attempts: [],        // marked work, question by question
    tests: [],           // upcoming tests and unit tests, and their results
    packs: [],           // question packs written in Claude chat, each with its to-do
    dayPlans: {},        // the option you picked for each free period
    appOps: [],          // ids of changes already applied, so resends are harmless
    rev: 0,
    settings: {
      boundaries: PROFILE.boundaries ?? { 'A*': 80, A: 70, B: 60, C: 50, D: 40, E: 30 },
      weeklyTargetHours: 20,
      periodsPerFortnight: 10,  // each A Level over the two-week rota
      periods: PERIODS,
    },
  };
}
