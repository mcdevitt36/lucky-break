"use client";

import { useEffect, useMemo, useState } from "react";
import { buildQuestion, evaluateAnswer, pointsForCorrect } from "@/lib/game";
import { Question } from "@/lib/types";

type Leader = { name:string; streak:number; score:number };

const demoLeaders:Leader[] = [
  {name:"hoopsfan23",streak:47,score:18600},
  {name:"LMCD",streak:39,score:14900},
  {name:"Celtics18",streak:36,score:13200}
];

function initials(name:string){ return name.split(" ").map(x=>x[0]).slice(0,2).join(""); }

export default function Game() {
  const [started,setStarted]=useState(false);
  const [streak,setStreak]=useState(0);
  const [score,setScore]=useState(0);
  const [question,setQuestion]=useState<Question|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [ended,setEnded]=useState(false);
  const [recent,setRecent]=useState<string[]>([]);
  const [best,setBest]=useState(0);

  useEffect(()=>{
    setBest(Number(localStorage.getItem("lucky-break-best")||0));
  },[]);

  const leaders = useMemo(()=>demoLeaders,[]);

  function nextQuestion(nextStreak=streak) {
    const q=buildQuestion(nextStreak,recent);
    setQuestion(q);
    setRecent(prev=>[...prev.slice(-8),q.id]);
    setSelected(null);
  }

  function start() {
    setStarted(true); setStreak(0); setScore(0); setEnded(false); setRecent([]);
    const q=buildQuestion(0,[]);
    setQuestion(q); setRecent([q.id]); setSelected(null);
  }

  function choose(id:string) {
    if (!question || selected || ended) return;
    setSelected(id);
    const correct=evaluateAnswer(question,id);
    if (correct) {
      const next=streak+1;
      const gained=pointsForCorrect(next);
      setStreak(next); setScore(s=>s+gained);
      if (next>best) {
        setBest(next);
        localStorage.setItem("lucky-break-best",String(next));
      }
      window.setTimeout(()=>nextQuestion(next),700);
    } else {
      setEnded(true);
    }
  }

  async function share() {
    const text=`🔥 LUCKY BREAK\nStreak: ${streak}\nScore: ${score.toLocaleString()}\nCan you beat me?`;
    if (navigator.share) await navigator.share({title:"Lucky Break",text});
    else window.prompt("Copy your result:",text);
  }

  if (!started) {
    return <main className="shell">
      <header className="brand"><div className="logo">Lucky <span>Break</span></div></header>
      <section className="hero">
        <div className="kicker">NBA knowledge. One life.</div>
        <h1 className="question">How long can you stay alive?</h1>
        <p className="sub">Pick the player who leads the category. One wrong answer ends your streak.</p>
        <div className="actions"><button className="primary" onClick={start}>PLAY</button></div>
      </section>
      <section className="panel">
        <h2>Today&apos;s Top 10</h2>
        {leaders.map((l,i)=><div className="leader" key={l.name}><span>#{i+1}</span><strong>{l.name}</strong><span>🔥 {l.streak}</span><span>{l.score.toLocaleString()}</span></div>)}
      </section>
      <p className="footer">Demo leaderboard data is shown in the MVP. Lucky Break is an independent basketball trivia game and is not affiliated with or endorsed by the NBA.</p>
    </main>;
  }

  if (!question) return null;

  if (ended) {
    const correct=question.players.find(p=>p.id===question.correctPlayerId)!;
    return <main className="shell">
      <header className="brand"><div className="logo">Lucky <span>Break</span></div></header>
      <section className="runOver">
        <div className="kicker">Run over</div>
        <div className="big">{streak}</div>
        <div className="sub">FINAL STREAK</div>
        <div className="scoreline">Score {score.toLocaleString()} · Personal best {best}</div>
        <p className="feedback bad">Correct answer: {correct.name} — {question.category.format(Number(correct[question.category.key]))} {question.category.label}</p>
        <div className="actions">
          <button className="primary" onClick={start}>PLAY AGAIN</button>
          <button className="secondary" onClick={share}>SHARE RESULT</button>
        </div>
      </section>
    </main>;
  }

  return <main className="shell">
    <header className="brand">
      <div className="logo">Lucky <span>Break</span></div>
      <div className="stats">
        <div className="statBox"><div className="statLabel">🔥 Streak</div><div className="statValue">{streak}</div></div>
        <div className="statBox"><div className="statLabel">Score</div><div className="statValue">{score.toLocaleString()}</div></div>
      </div>
    </header>

    <section className="hero">
      <div className="kicker">{question.category.label}</div>
      <h1 className="question">{question.category.prompt}</h1>
      <p className="sub">Choose one. The numbers reveal after your pick.</p>
    </section>

    <section className="grid" aria-label="Player choices">
      {question.players.map(p=>{
        const isCorrect=p.id===question.correctPlayerId;
        const isWrong=selected===p.id && !isCorrect;
        const className="card"+(selected && isCorrect?" correct":"")+(isWrong?" wrong":"");
        return <button key={p.id} className={className} onClick={()=>choose(p.id)} disabled={Boolean(selected)}>
          <div className="initials">{initials(p.name)}</div>
          <div className="name">{p.name}</div>
          <div className="meta">{p.team} · {p.position}</div>
          {selected && <div className="reveal">{question.category.format(Number(p[question.category.key]))} {question.category.label}</div>}
        </button>;
      })}
    </section>

    <div className={"feedback "+(selected?"good":"")}>{selected ? "Correct — keep it moving." : best ? `Personal best: ${best}` : "Build your first streak."}</div>
  </main>;
}