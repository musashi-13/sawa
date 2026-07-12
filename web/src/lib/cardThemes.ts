// ─────────────────────────────────────────────────────────────────────────────
// Card themes — the paper a task card is printed on. A theme varies the
// *paper* (background, ink, grain, watermark, chips, border); the semantic
// accents (clay task / gold bundle / red failed) and the deadline chip stay
// constant so meaning reads the same on every theme.
//
// Global for now (stored on `SawaData.cardTheme`). Structured as a table keyed
// by id so per-stream themes can slot in later without touching the card.
// ─────────────────────────────────────────────────────────────────────────────

export interface CardTheme {
  id: string;
  name: string;
  /** Card background (top card + first peek). */
  bg: string;
  /** Border for a normal task card. */
  border: string;
  /** Border for a bundle card. */
  borderBundle: string;
  /** Title ink. */
  ink: string;
  /** Description / muted ink. */
  inkSoft: string;
  /** Paper-grain line colour. */
  grain: string;
  /** 沢 watermark colour. */
  watermark: string;
  /** Effort / Daily chip background + text. */
  chipBg: string;
  chipInk: string;
  /** Delete (×) colour. */
  deleteInk: string;
  /** Representative colour for the picker swatch. */
  swatch: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: "parchment",
    name: "Parchment",
    bg: "linear-gradient(158deg,#E6DDC9 0%,#DBD0B6 55%,#CDC0A3 100%)",
    border: "rgba(120,92,50,0.18)",
    borderBundle: "#D8C9A8",
    ink: "#2B2722",
    inkSoft: "#6F6450",
    grain: "rgba(120,92,50,0.045)",
    watermark: "rgba(43,39,34,0.05)",
    chipBg: "rgba(120,92,50,0.14)",
    chipInk: "#8C6B3A",
    deleteInk: "#a89e89",
    swatch: "#DBD0B6",
  },
  {
    id: "sandstone",
    name: "Sandstone",
    bg: "linear-gradient(158deg,#EEE1C5 0%,#E2CFA8 55%,#CDB486 100%)",
    border: "rgba(120,92,50,0.22)",
    borderBundle: "#D8C398",
    ink: "#3A2E1C",
    inkSoft: "#7A6A4C",
    grain: "rgba(120,92,50,0.05)",
    watermark: "rgba(58,46,28,0.06)",
    chipBg: "rgba(120,92,50,0.16)",
    chipInk: "#7E6438",
    deleteInk: "#a89578",
    swatch: "#E2CFA8",
  },
  {
    id: "rose",
    name: "Rosewood",
    bg: "linear-gradient(158deg,#EFDED8 0%,#E7CBC2 55%,#DAB6AB 100%)",
    border: "rgba(150,90,80,0.22)",
    borderBundle: "#DDC3B8",
    ink: "#4A2E2A",
    inkSoft: "#86645C",
    grain: "rgba(120,70,60,0.05)",
    watermark: "rgba(74,46,42,0.06)",
    chipBg: "rgba(150,90,80,0.14)",
    chipInk: "#8C5A4E",
    deleteInk: "#b0968e",
    swatch: "#E7CBC2",
  },
  {
    id: "sage",
    name: "Sage",
    bg: "linear-gradient(158deg,#E0E4D2 0%,#CFD7BB 55%,#BAC69F 100%)",
    border: "rgba(100,120,80,0.22)",
    borderBundle: "#C6CFA8",
    ink: "#2E3A26",
    inkSoft: "#66735A",
    grain: "rgba(80,100,60,0.05)",
    watermark: "rgba(46,58,38,0.06)",
    chipBg: "rgba(90,110,70,0.14)",
    chipInk: "#5A6E3E",
    deleteInk: "#96a089",
    swatch: "#CFD7BB",
  },
  {
    id: "mist",
    name: "Mist",
    bg: "linear-gradient(158deg,#DFE2E7 0%,#CCD3DB 55%,#B5BFCB 100%)",
    border: "rgba(90,110,130,0.22)",
    borderBundle: "#C2CBD6",
    ink: "#2B3038",
    inkSoft: "#5E6875",
    grain: "rgba(70,90,110,0.05)",
    watermark: "rgba(43,48,56,0.06)",
    chipBg: "rgba(80,100,120,0.14)",
    chipInk: "#566476",
    deleteInk: "#93a0ac",
    swatch: "#CCD3DB",
  },
  {
    id: "ink",
    name: "Nightfall",
    bg: "linear-gradient(158deg,#3A362F 0%,#2F2B25 55%,#26221E 100%)",
    border: "rgba(200,180,140,0.16)",
    borderBundle: "rgba(184,145,90,0.45)",
    ink: "#EAE3D3",
    inkSoft: "#B7AC98",
    grain: "rgba(220,210,180,0.05)",
    watermark: "rgba(233,226,211,0.05)",
    chipBg: "rgba(220,200,160,0.12)",
    chipInk: "#C6B187",
    deleteInk: "#8a8172",
    swatch: "#2F2B25",
  },
];

export const DEFAULT_CARD_THEME_ID = "parchment";

export function getCardTheme(id: string | undefined): CardTheme {
  return (
    CARD_THEMES.find((t) => t.id === id) ??
    CARD_THEMES.find((t) => t.id === DEFAULT_CARD_THEME_ID)!
  );
}
