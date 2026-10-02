export type Player = {
  id: string;
  name: string;
  team: string;
  position: string;
  ppg: number;
  apg: number;
  rpg: number;
  threesMade: number;
  fgPct: number;
  threePct: number;
  careerPoints: number;
  careerAssists: number;
  careerRebounds: number;
  seasonsPlayed: number;
  allStars: number;
  allNBA: number;
  championships: number;
  mvps: number;
  draftPick: number;
  draftYear: number;
};

export type CategoryKey = Exclude<keyof Player, "id"|"name"|"team"|"position">;

export type Category = {
  key: CategoryKey;
  label: string;
  prompt: string;
  format: (n:number)=>string;
  lowerWins?: boolean;
  eligibility?: (p:Player)=>boolean;
};

export type Question = {
  id: string;
  category: Category;
  players: Player[];
  correctPlayerId: string;
};