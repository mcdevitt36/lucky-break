import { players } from "./data";
import { Player } from "./types";

export type DailyCategory = {
  key: keyof Pick<Player, "ppg"|"apg"|"rpg"|"threesMade"|"fgPct"|"threePct"|"careerPoints"|"careerAssists"|"careerRebounds"|"seasonsPlayed"|"allStars"|"allNBA"|"championships"|"mvps"|"draftPick"|"draftYear">;
  family: "season"|"career"|"achievement"|"draft";
  label: string;
  prompt: string;
  lowerWins?: boolean;
  eligibility?: (p:Player)=>boolean;
  format: (n:number)=>string;
};

export type DailyChallenge = { id:string; date:string; category:DailyCategory; playerIds:string[]; correctPlayerIds:string[]; };
export type DailyResult = { date:string; challengeId:string; selections:string[]; correct:number; score:number; seconds:number; grid:string; completed:true; };

const seasonEligible=(p:Player)=>p.seasonGames>0;
const shootingEligible=(p:Player)=>p.seasonGames>=20;

export const dailyCategories:DailyCategory[]=[
  {key:"ppg",family:"season",label:"2025–26 PPG",prompt:"Of these 10 players, pick the five who averaged the most points per game in the 2025–26 season.",format:n=>n.toFixed(1)+" PPG",eligibility:seasonEligible},
  {key:"apg",family:"season",label:"2025–26 APG",prompt:"Of these 10 players, pick the five who averaged the most assists per game in the 2025–26 season.",format:n=>n.toFixed(1)+" APG",eligibility:seasonEligible},
  {key:"rpg",family:"season",label:"2025–26 RPG",prompt:"Of these 10 players, pick the five who averaged the most rebounds per game in the 2025–26 season.",format:n=>n.toFixed(1)+" RPG",eligibility:seasonEligible},
  {key:"threesMade",family:"season",label:"2025–26 3PM",prompt:"Of these 10 players, pick the five who made the most three-pointers in the 2025–26 season.",format:n=>n.toLocaleString()+" 3PM",eligibility:seasonEligible},
  {key:"fgPct",family:"season",label:"2025–26 FG%",prompt:"Of these 10 players, pick the five with the highest field-goal percentage in the 2025–26 season.",format:n=>n.toFixed(1)+"%",eligibility:shootingEligible},
  {key:"threePct",family:"season",label:"2025–26 3PT%",prompt:"Of these 10 players, pick the five with the highest three-point percentage in the 2025–26 season.",format:n=>n.toFixed(1)+"%",eligibility:shootingEligible},
  {key:"careerPoints",family:"career",label:"CAREER POINTS",prompt:"Of these 10 players, pick the five with the most career points.",format:n=>n.toLocaleString()+" PTS"},
  {key:"careerAssists",family:"career",label:"CAREER ASSISTS",prompt:"Of these 10 players, pick the five with the most career assists.",format:n=>n.toLocaleString()+" AST"},
  {key:"careerRebounds",family:"career",label:"CAREER REBOUNDS",prompt:"Of these 10 players, pick the five with the most career rebounds.",format:n=>n.toLocaleString()+" REB"},
  {key:"seasonsPlayed",family:"career",label:"CAREER SEASONS",prompt:"Of these 10 players, pick the five who have played the most NBA seasons.",format:n=>n+" seasons"},
  {key:"allStars",family:"achievement",label:"CAREER ALL-STARS",prompt:"Of these 10 players, pick the five with the most NBA All-Star selections.",format:n=>n+" selections",eligibility:p=>p.allStars>0},
  {key:"allNBA",family:"achievement",label:"CAREER ALL-NBA",prompt:"Of these 10 players, pick the five with the most All-NBA selections.",format:n=>n+" selections",eligibility:p=>p.allNBA>0},
  {key:"championships",family:"achievement",label:"CAREER TITLES",prompt:"Of these 10 players, pick the five with the most NBA championships.",format:n=>n+" titles",eligibility:p=>p.championships>0},
  {key:"mvps",family:"achievement",label:"CAREER MVPs",prompt:"Of these 10 players, pick the five with the most NBA MVP awards.",format:n=>n+" MVPs",eligibility:p=>p.mvps>0},
  {key:"draftPick",family:"draft",label:"NBA DRAFT",prompt:"Of these 10 players, pick the five who were selected highest in the NBA Draft.",format:n=>"#"+n+" pick",lowerWins:true},
  {key:"draftYear",family:"draft",label:"NBA DRAFT",prompt:"Of these 10 players, pick the five who entered the NBA earliest.",format:n=>String(n),lowerWins:true},
];

function hash(input:string){ let h=2166136261; for(let i=0;i<input.length;i++){ h^=input.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function rng(seed:number){ let x=seed||123456789; return ()=>{ x^=x<<13; x^=x>>>17; x^=x<<5; return (x>>>0)/4294967296; }; }
function value(p:Player,c:DailyCategory){ return Number(p[c.key]); }
function shuffled<T>(items:T[],seed:number){ const random=rng(seed); const a=[...items]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function dayNumber(date:string){ return Math.floor(Date.parse(date+"T00:00:00Z")/86400000); }
export function utcDateKey(date=new Date()){ return date.toISOString().slice(0,10); }

export function createDailyChallenge(date=utcDateKey()):DailyChallenge {
  const families:DailyCategory["family"][]=["season","career","achievement","draft"];
  const family=families[Math.abs(dayNumber(date))%families.length];
  const familyCategories=dailyCategories.filter(c=>c.family===family && players.filter(p=>!c.eligibility||c.eligibility(p)).length>=10);
  const seed=hash("lucky-break:"+date);
  const category=familyCategories[seed%familyCategories.length];
  if(!category) throw new Error("No viable daily category");
  let eligible=players.filter(p=>!category.eligibility||category.eligibility(p));
  eligible=[...eligible].sort((a,b)=>category.lowerWins?value(a,category)-value(b,category):value(b,category)-value(a,category));
  if(eligible.length<10) throw new Error("Not enough eligible players for daily challenge");
  const maxStart=Math.max(0,Math.min(eligible.length-10,Math.floor(eligible.length*.45)));
  const start=maxStart?seed%(maxStart+1):0;
  let chosen:Player[]|null=null;
  for(let offset=0;offset<=maxStart;offset++){
    const s=(start+offset)%(maxStart+1);
    const group=eligible.slice(s,s+10);
    if(group.length<10) continue;
    if(value(group[4],category)===value(group[5],category)) continue;
    chosen=group; break;
  }
  if(!chosen) throw new Error("Could not create an unambiguous daily challenge");
  const correct=chosen.slice(0,5).map(p=>p.id);
  const display=shuffled(chosen,hash(date+":"+String(category.key))).map(p=>p.id);
  return {id:date+":"+String(category.key),date,category,playerIds:display,correctPlayerIds:correct};
}

export function startingFiveScore(correct:number,seconds:number){
  const base=Math.max(0,Math.min(5,correct))*200;
  const bonus=seconds<30?150:seconds<60?100:seconds<90?50:0;
  return base+bonus;
}
export function resultGrid(selections:string[],correctIds:string[]){ const correct=new Set(correctIds); return selections.map(id=>correct.has(id)?"🟩":"🟥").join(""); }
export function scoreSelections(selections:string[],challenge:DailyChallenge,seconds:number){
  const correctSet=new Set(challenge.correctPlayerIds);
  const correct=selections.filter(id=>correctSet.has(id)).length;
  return {correct,score:startingFiveScore(correct,seconds),grid:resultGrid(selections,challenge.correctPlayerIds)};
}
export function resultStorageKey(date:string){ return "lucky-break-starting-five:"+date; }