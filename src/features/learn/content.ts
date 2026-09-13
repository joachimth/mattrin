/**
 * Indhold til "Lær"-området: kort teori, regler, eksempler, typiske fejl
 * og en øvelse der starter direkte i Session.
 */
export interface LearnExample {
  task: string;
  text: string;
}

export interface LearnTopic {
  id: string;
  name: string;
  blurb: string;
  theory: string[];
  rules: { rule: string; body: string }[];
  example: { task: string; text: string; steps: string[] };
  typicalErrors: string[];
  exercise: string;
}

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: "algebra",
    name: "Algebra",
    blurb: "Led, parenteser, fortegn og brøker.",
    theory: [
      "Et led er en 'klump' adskilt af plus og minus. I 3x² − 5x + 2 er 3x², −5x og 2 led.",
      "Ens led har samme variable og samme potens — kun de kan lægges sammen: 4a + 3a = 7a, men 4a + 3a² kan ikke reduceres.",
      "En brøklinje er en parentes i forklædning: alt over stregen regnes som ét samlet udtryk.",
    ],
    rules: [
      { rule: "Distributiv lov", body: "a(b + c) = ab + ac. Faktoren ganges med hvert led i parentesen." },
      { rule: "Minus foran parentes", body: "−(a − b) = −a + b. Minusset vender fortegnet på ALLE led." },
      { rule: "Fællesnævner", body: "Brøker med forskellige nævnere lægges sammen ved at omskrive til det mindste fælles multiplum." },
    ],
    example: {
      task: "Reducer: (4a+b)/2 - (2a-3b)/3",
      text: "Fællesnævneren er 6. Hver tæller ganges op, parenteserne foldes ud med omtanke for minusset, og til sidst reduceres ens led.",
      steps: ["Fællesnævner: 6", "3(4a+b)/6 − 2(2a−3b)/6", "(12a+3b−4a+6b)/6", "(8a+9b)/6"],
    },
    typicalErrors: [
      "Fortegn: −(2a − 3b) er −2a + 3b, ikke −2a − 3b.",
      "Kun at gange nævneren — tælleren skal ganges med det samme tal.",
      "At reducere led som 4a + 3a².",
    ],
    exercise: "Reducer: (3a+b)/2 - (a-2b)/3",
  },
  {
    id: "ligninger",
    name: "Ligninger",
    blurb: "Lineære og andengradsligninger.",
    theory: [
      "En ligning er en vægt: begge sider er lige meget værd. Du må gøre hvad som helst — bare det sker på begge sider.",
      "Målet er at isolere den ubekendte, så x står alene på den ene side.",
      "Andengradsligninger kan have 0, 1 eller 2 reelle løsninger — det afslører diskriminanten.",
    ],
    rules: [
      { rule: "Flyt led", body: "Et led flyttes ved at lægge dets modsatte til på begge sider. Over lighedstegnet skifter det fortegn." },
      { rule: "Isolering", body: "ax = b → x = b/a. Modoperationen modsat: gang ↔ division, plus ↔ minus." },
      { rule: "Diskriminanten", body: "d = (p/2)² − q for x² + px + q = 0. d > 0: to løsninger. d = 0: én. d < 0: ingen reelle." },
    ],
    example: {
      task: "3x + 7 = 22",
      text: "Træk 7 fra på begge sider, og divider derefter med 3.",
      steps: ["3x = 15", "x = 5", "Kontrol: 3·5 + 7 = 22 ✓"],
    },
    typicalErrors: [
      "At gøre det på kun den ene side af lighedstegnet.",
      "Fortegn ved flytning over lighedstegnet.",
      "At glemme at halvere p, før man kvadrerer i d-formlen.",
    ],
    exercise: "4x + 6 = 30",
  },
  {
    id: "funktioner",
    name: "Funktioner",
    blurb: "Hældning, nulpunkter og grafer.",
    theory: [
      "En lineær funktion f(x) = ax + b har hældning a og skærer y-aksen i b.",
      "Nulpunkter findes ved at sætte f(x) = 0 og løse ligningen.",
      "En andengradsfunktion f(x) = ax² + bx + c har en parabel som graf.",
    ],
    rules: [
      { rule: "Hældning", body: "a fortæller hvor stejl grafen er: a > 0 vokser, a < 0 falder." },
      { rule: "Nulpunkter", body: "Løs f(x) = 0. For parabler: faktorisér eller brug d-formlen." },
    ],
    example: {
      task: "Find nulpunkterne for f(x) = x^2 - 5x + 6",
      text: "Sæt f(x) = 0, faktorisér, og aflæs nulpunkterne.",
      steps: ["x² − 5x + 6 = 0", "(x − 2)(x − 3) = 0", "x = 2 og x = 3"],
    },
    typicalErrors: ["At forveksle f(2) (funktionsværdi) med nulpunktet."],
    exercise: "Find nulpunkterne for f(x) = x^2 - 7x + 12",
  },
  {
    id: "trigonometri",
    name: "Trigonometri",
    blurb: "Sinus, cosinus og tangens i rette trekanter.",
    theory: [
      "I en ret vinkel trekant forholder sig sinus, cosinus og tangens til modstående, hosliggende katete og hypotenusen.",
      "Husk tangens som forholdet mellem de to kateter.",
    ],
    rules: [
      { rule: "sin", body: "sin A = modstående / hypotenuse." },
      { rule: "cos", body: "cos A = hosliggende / hypotenuse." },
      { rule: "tan", body: "tan A = modstående / hosliggende." },
    ],
    example: {
      task: "sin A = 0,5 — hvor stor er A?",
      text: "Brug den omvendte sinusfunktion.",
      steps: ["A = arcsin(0,5)", "A = 30°"],
    },
    typicalErrors: ["At bytte om på modstående og hosliggende katete."],
    exercise: "Hvad er 15% af 240?",
  },
  {
    id: "differentialregning",
    name: "Differentialregning",
    blurb: "Hvor hurtigt ændrer noget sig?",
    theory: [
      "Den afledte f'(x) angiver hældningen på grafen i hvert punkt — det øjeblikkelige ændringsrate.",
      "For polynomier bruges potensreglen på hvert led separat.",
    ],
    rules: [
      { rule: "Potensreglen", body: "(xⁿ)' = n·xⁿ⁻¹. Koefficienten ganges med eksponenten, eksponenten sænkes." },
      { rule: "Konstanter", body: "Derivér en konstant → 0. En konstant ændrer sig ikke." },
    ],
    example: {
      task: "Differentier f(x) = 3x^3 + 2x",
      text: "Potensreglen på hvert led.",
      steps: ["(3x³)' = 9x²", "(2x)' = 2", "f'(x) = 9x² + 2"],
    },
    typicalErrors: ["At glemme at gange koefficienten med den gamle eksponent.", "At behandle konstantleddet som om det var et x-led."],
    exercise: "Differentier f(x) = 2x^4 + 5x",
  },
  {
    id: "statistik",
    name: "Statistik",
    blurb: "Gennemsnit, median og spredning.",
    theory: [
      "Gennemsnittet er summen divideret med antallet af observationer.",
      "Medianen er midterste observation når data er sorteret.",
      "Procent og gennemsnit hænger ofte sammen i opgaver.",
    ],
    rules: [
      { rule: "Gennemsnit", body: "x̄ = (sum af observationer) / antal." },
      { rule: "Median", body: "Sortér. Midterste værdi (eller gennemsnit af de to midterste)." },
    ],
    example: {
      task: "Gennemsnittet af 4, 7 og 10?",
      text: "Læg sammen og divider med 3.",
      steps: ["4 + 7 + 10 = 21", "21 / 3 = 7"],
    },
    typicalErrors: ["At tage gennemsnittet af gennemsnit uden at veje."],
    exercise: "Hvad er 12% af 350?",
  },
];
