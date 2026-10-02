import { players } from "./data";
import { Category, Player, Question } from "./types";

export const STAT_SEASON = "2025–26";
const playedInSeason = (p:Player) => p.seasonGames > 0;

export const categories: Category[] = [
  {key:"ppg",label:"2025–26 PPG",season:STAT_SEASON,prompt:`Who averaged the most points per game in the ${STAT_SEASON} season?`,format:n=>n.toFixed(1),eligibility:playedInSeason},
  {key:"apg",label:"2025–26 APG",season:STAT_SEASON,prompt:`Who averaged the most assists per game in the ${STAT_SEASON} season?`,format:n=>n.toFixed(1),eligibility:playedInSeason},
  {key:"rpg",label:"2025–26 RPG",season:STAT_SEASON,prompt:`Who averaged the most rebounds per game in the ${STAT_SEASON} season?`,format:n=>n.toFixed(1),eligibility:playedInSeason},
  {key:"threesMade",label:"2025–26 3PM",season:STAT_SEASON,prompt:`Who made the most three-pointers in the ${STAT_SEASON} season?`,format:n=>String(n),eligibility:playedInSeason},
  {key:"fgPct",label:"2025–26 FG%",season:STAT_SEASON,prompt:`Who had the highest field-goal percentage in the ${STAT_SEASON} season?`,format:n=>n.toFixed(1)+"%",eligibility:playedInSeason},
  {key:"threePct",label:"2025–26 3PT%",season:STAT_SEASON,prompt:`Who had the highest three-point percentage in the ${STAT_SEASON} season?`,format:n=>n.toFixed(1)+"%",eligibility:playedInSeason},
  {key:"careerPoints",label:"CAREER PTS",prompt:"Who has the most career points?",format:n=>n.toLocaleString()},
  {key:"careerAssists",label:"CAREER AST",prompt:"Who has the most career assists?",format:n=>n.toLocaleString()},
  {key:"careerRebounds",label:"CAREER REB",prompt:"Who has the most career rebounds?",format:n=>n.toLocaleString()},
  {key:"seasonsPlayed",label:"CAREER SEASONS",prompt:"Who has played the most NBA seasons?",format:n=>String(n)},
  {key:"allStars",label:"CAREER ALL-STARS",prompt:"Who has the most NBA All-Star selections?",format:n=>String(n),eligibility:p=>p.allStars>0},
  {key:"allNBA",label:"CAREER ALL-NBA",prompt:"Who has the most All-NBA selections?",format:n=>String(n),eligibility:p=>p.allNBA>0},
  {key:"championships",label:"CAREER TITLES",prompt:"Who has won the most NBA championships?",format:n=>String(n),eligibility:p=>p.championships>0},
  {key:"mvps",label:"CAREER MVP",prompt:"Who has won the most NBA MVP awards?",format:n=>String(n),eligibility:p=>p.mvps>0},
  {key:"draftPick",label:"DRAFT",prompt:"Who was selected highest in the NBA Draft?",format:n=>"#"+n,lowerWins:true},
  {key:"draftYear",label:"DRAFT",prompt:"Who entered the NBA earliest?",format:n=>String(n),lowerWins:true}
];

export function multiplierForStreak(streak:number) {
  if (streak >= 30) return 5;
  if (streak >= 20) return 3;
  if (streak >= 10) return 2;
  if (streak >= 5) return 1.5;
  return 1;
}

export function pointsForCorrect(streakAfterAnswer:number) {
  return Math.round(100 * multiplierForStreak(streakAfterAnswer));
}

export function difficultyWindow(streak:number) {
  if (streak >= 30) return 0.08;
  if (streak >= 16) return 0.16;
  if (streak >= 6) return 0.32;
  return 1;
}

function valueOf(p:Player,c:Category){ return Number(p[c.key]); }

function shuffle<T>(arr:T[]):T[] {
  return [...arr].sort(()=>Math.random()-.5);
}

export function buildQuestion(
  streak:number,
  recentIds:string[]=[],
  recentPlayerIds:string[]=[]
):Question {
  for (let attempt=0;attempt<160;attempt++) {
    const category = categories[Math.floor(Math.random()*categories.length)];
    let pool = players.filter(p=>!category.eligibility || category.eligibility(p));
    if (pool.length < 4) continue;

    const freshPool=pool.filter(p=>!recentPlayerIds.includes(p.id));
    if (freshPool.length>=4) pool=freshPool;

    const anchor = pool[Math.floor(Math.random()*pool.length)];
    const vals = pool.map(p=>valueOf(p,category));
    const range = Math.max(...vals)-Math.min(...vals) || 1;
    const window = difficultyWindow(streak);

    let candidates = pool.filter(p => Math.abs(valueOf(p,category)-valueOf(anchor,category))/range <= window);
    if (candidates.length < 4) candidates = pool;

    const picked = shuffle(candidates).slice(0,4);
    const matchupKey = category.key+":"+picked.map(p=>p.id).sort().join("-");
    if (recentIds.includes(matchupKey)) continue;

    const sorted = [...picked].sort((a,b)=>
      category.lowerWins ? valueOf(a,category)-valueOf(b,category) : valueOf(b,category)-valueOf(a,category)
    );

    if (valueOf(sorted[0],category) === valueOf(sorted[1],category)) continue;

    return {
      id: matchupKey,
      category,
      players: shuffle(picked),
      correctPlayerId: sorted[0].id
    };
  }
  throw new Error("Unable to generate a valid question");
}

export function evaluateAnswer(q:Question, playerId:string) {
  return q.correctPlayerId === playerId;
}