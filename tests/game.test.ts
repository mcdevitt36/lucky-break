import { describe, expect, it } from "vitest";
import { difficultyWindow, multiplierForStreak, pointsForCorrect } from "../lib/game";

describe("Lucky Break scoring",()=>{
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