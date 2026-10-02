import { describe, expect, it } from "vitest";
import { difficultyWindow, multiplierForStreak, pointsForCorrect } from "../lib/game";
import { createDailyChallenge, resultGrid, resultStorageKey, startingFiveScore } from "../lib/dailyChallenge";
import { players } from "../lib/data";

describe("Lucky Break endless scoring",()=>{
  it("scales multipliers by streak",()=>{
    expect(multiplierForStreak(1)).toBe(1);
    expect(multiplierForStreak(5)).toBe(1.5);
    expect(multiplierForStreak(10)).toBe(2);
    expect(multiplierForStreak(20)).toBe(3);
    expect(multiplierForStreak(30)).toBe(5);
  });
  it("awards scaled points",()=>{
    expect(pointsForCorrect(1)).toBe(100);
    expect(pointsForCorrect(5)).toBe(150);
    expect(pointsForCorrect(30)).toBe(500);
  });
  it("tightens question windows as streak increases",()=>{
    expect(difficultyWindow(0)).toBeGreaterThan(difficultyWindow(10));
    expect(difficultyWindow(10)).toBeGreaterThan(difficultyWindow(30));
  });
});

describe("Starting Five daily challenge",()=>{
  it("is deterministic for the same date",()=>{
    expect(createDailyChallenge("2026-10-02")).toEqual(createDailyChallenge("2026-10-02"));
  });
  it("changes across dates",()=>{
    expect(createDailyChallenge("2026-10-02").id).not.toBe(createDailyChallenge("2026-10-03").id);
  });
  it("always has 10 options and exactly 5 correct players",()=>{
    const c=createDailyChallenge("2026-10-02");
    expect(c.playerIds).toHaveLength(10);
    expect(new Set(c.playerIds).size).toBe(10);
    expect(c.correctPlayerIds).toHaveLength(5);
  });
  it("has no tie at the 5/6 cutoff",()=>{
    const c=createDailyChallenge("2026-10-02");
    const map=new Map(players.map(p=>[p.id,p]));
    const ranked=c.playerIds.map(id=>map.get(id)!).sort((a,b)=>{
      const av=Number(a[c.category.key]),bv=Number(b[c.category.key]);
      return c.category.lowerWins?av-bv:bv-av;
    });
    expect(Number(ranked[4][c.category.key])).not.toBe(Number(ranked[5][c.category.key]));
  });
  it("scores knowledge first with a small speed bonus",()=>{
    expect(startingFiveScore(5,20)).toBe(1150);
    expect(startingFiveScore(5,45)).toBe(1100);
    expect(startingFiveScore(4,100)).toBe(800);
  });
  it("creates a five-square spoiler-free result grid",()=>{
    expect(resultGrid(["a","b","c","d","e"],["a","c","d","e","x"])).toBe("🟩🟥🟩🟩🟩");
  });
  it("uses a date-scoped one-attempt storage key",()=>{
    expect(resultStorageKey("2026-10-02")).toBe("lucky-break-starting-five:2026-10-02");
  });
  it("does not embed stat values in the public challenge option list",()=>{
    const c=createDailyChallenge("2026-10-02");
    expect(c.playerIds.every(x=>typeof x==="string")).toBe(true);
  });
  it("produces valid unambiguous boards across a month",()=>{
    const map=new Map(players.map(p=>[p.id,p]));
    for(let day=1;day<=31;day++){
      const date="2026-10-"+String(day).padStart(2,"0");
      const c=createDailyChallenge(date);
      expect(c.playerIds).toHaveLength(10);
      expect(c.correctPlayerIds).toHaveLength(5);
      const ranked=c.playerIds.map(id=>map.get(id)!).sort((a,b)=>{
        const av=Number(a[c.category.key]),bv=Number(b[c.category.key]);
        return c.category.lowerWins?av-bv:bv-av;
      });
      expect(Number(ranked[4][c.category.key])).not.toBe(Number(ranked[5][c.category.key]));
    }
  });
});