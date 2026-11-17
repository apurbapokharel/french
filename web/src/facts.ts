export const LAST_CHECKED = "2026-11-16";

export interface Source {
  label: string;
  url: string;
}

export const SOURCES = {
  crs: {
    label: "IRCC: Comprehensive Ranking System (CRS) criteria",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score/crs-criteria.html",
  },
  categories: {
    label: "IRCC: Express Entry category-based selection",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations/category-based-selection.html",
  },
  languageTests: {
    label: "IRCC: Express Entry language test results",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html",
  },
  consultation: {
    label: "IRCC: 2026 consultation on Express Entry reforms",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/transparency/consultations/2026-consultation-express-entry.html",
  },
  tefFormat: {
    label: "CCI Paris Île-de-France: TEF Canada, take the test",
    url: "https://www.lefrancaisdesaffaires.fr/en/candidate/test-evaluation-francais/tef-canada/examination/",
  },
  tefResults: {
    label: "CCI Paris Île-de-France: TEF Canada, understand your results",
    url: "https://www.lefrancaisdesaffaires.fr/en/candidate/test-evaluation-francais/tef-canada/results/",
  },
  tcfFormat: {
    label: "France Éducation international: TCF Canada",
    url: "https://www.france-education-international.fr/test/tcf-canada",
  },
  studyHours: {
    label: "Alliance Française Leeds: how long does it take to reach the next level?",
    url: "https://afleeds.org.uk/faq",
  },
} satisfies Record<string, Source>;

export interface ScoreRow {
  nclc: string;
  speaking: string;
  listening: string;
  reading: string;
  writing: string;
}

export const TEF_TABLE: ScoreRow[] = [
  { nclc: "10", speaking: "393–450", listening: "316–360", reading: "263–300", writing: "393–450" },
  { nclc: "9", speaking: "371–392", listening: "298–315", reading: "248–262", writing: "371–392" },
  { nclc: "8", speaking: "349–370", listening: "280–297", reading: "233–247", writing: "349–370" },
  { nclc: "7", speaking: "310–348", listening: "249–279", reading: "207–232", writing: "310–348" },
  { nclc: "6", speaking: "271–309", listening: "217–248", reading: "181–206", writing: "271–309" },
  { nclc: "5", speaking: "226–270", listening: "181–216", reading: "151–180", writing: "226–270" },
  { nclc: "4", speaking: "181–225", listening: "145–180", reading: "121–150", writing: "181–225" },
];

export const TCF_TABLE: ScoreRow[] = [
  { nclc: "10+", speaking: "16–20", listening: "549–699", reading: "549–699", writing: "16–20" },
  { nclc: "9", speaking: "14–15", listening: "523–548", reading: "524–548", writing: "14–15" },
  { nclc: "8", speaking: "12–13", listening: "503–522", reading: "499–523", writing: "12–13" },
  { nclc: "7", speaking: "10–11", listening: "458–502", reading: "453–498", writing: "10–11" },
  { nclc: "6", speaking: "7–9", listening: "398–457", reading: "406–452", writing: "7–9" },
  { nclc: "5", speaking: "6", listening: "369–397", reading: "375–405", writing: "6" },
  { nclc: "4", speaking: "4–5", listening: "331–368", reading: "342–374", writing: "4–5" },
];

export interface Milestone {
  id: string;
  cefr: string;
  nclc: string;
  prValue: string;
  hours: string;
  available: boolean;
}

export const MILESTONES: Milestone[] = [
  { id: "M1", cefr: "A1", nclc: "Below 4", prValue: "No CRS points. The foundation for everything after.", hours: "60–100", available: true },
  { id: "M2", cefr: "A2", nclc: "4", prValue: "No CRS points. Everyday survival French.", hours: "160–200", available: false },
  { id: "M3", cefr: "B1", nclc: "5–6", prValue: "Up to 4 CRS points (1 per skill) for French as a second language.", hours: "360–400", available: false },
  {
    id: "M4",
    cefr: "B2",
    nclc: "7",
    prValue:
      "12 CRS points (3 per skill), up to 50 bonus points for French, and eligibility for French-language Express Entry draws.",
    hours: "560–650",
    available: false,
  },
];
