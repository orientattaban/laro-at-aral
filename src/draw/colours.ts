// Colours used for things drawn in code.
// Rule: colour is never the only clue. Every colour also has its own pattern,
// so a child who cannot tell red from green can still tell them apart.

export type PatternKind = 'dots' | 'stripes' | 'waves' | 'checks';

export interface DrawColour {
  fill: string;
  dark: string;
  pattern: PatternKind;
}

export const COLOURS: Record<string, DrawColour> = {
  pula: { fill: '#d9483b', dark: '#9c2a21', pattern: 'dots' },
  asul: { fill: '#3f82d6', dark: '#24558f', pattern: 'stripes' },
  dilaw: { fill: '#f4c531', dark: '#b98a10', pattern: 'waves' },
  berde: { fill: '#55a455', dark: '#2f6d33', pattern: 'checks' },
};

export const PALETTE = {
  cream: '#fdf3d7',
  corn: '#f2b63c',
  cornDark: '#b9772a',
  leaf: '#5a9e4b',
  leafDark: '#356b2d',
  clay: '#c8623a',
  sky: '#a8dbe8',
  ink: '#5b3a22',
  white: '#fffdf6',
};
