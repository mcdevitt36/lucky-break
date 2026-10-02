"use client";

import { useEffect, useState } from "react";
import { buildQuestion, evaluateAnswer, pointsForCorrect } from "@/lib/game";
import { Question } from "@/lib/types";

function initials(name:string){ return name.split(" ").map(x=>x[0]).slice(0,2).join(""); }

export default function EndlessGame({onBack}:{onBack:()=>void}) {
  const [streak,setStreak]=useState(0);
  const [score,setScore]=useState(0);
  const [question,setQuestion]=useState<Question|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [ended,setEnded]=useState(false);
  const [recent,setRecent]=useState<string[]>([]);
  const [recentPlayers,setRecentPlayers]=useState<string[]>([]);
  const [best,setBest]=useState(0);

  useEffect(()=>{
    setBest(Number(localStorage.getItem("lucky-break-best")||0));
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function nextQuestion(nextStreak=streak) {
    const q=buildQuestion(nextStreak,recent,recentPlayers);
    setQuestion(q);
    setRecent(prev=>[...prev.slice(-8),q.id]);
    setRecentPlayers(prev=>[...prev,...q.players.map(p=>p.id)].slice(-12));
    setSelected(null);
  }

  function start() {
    setStreak(0); setScore(0); setEnded(false); setRecent([]); setRecentPlayers([]);
    const q=buildQuestion(0,[],[]);
    setQuestion(q); setRecent([q.id]); setRecentPlayers(q.players.map(p=>p.id)); setSelected(null);
  }

  function choose(id:string) {
    if (!question || selected || ended) return;
    setSelected(id);
    if (evaluateAnswer(question,id)) {
      const next=streak+1;
      setStreak(next);
      setScore(s=>s+pointsForCorrect(next));
      if(next>best){ setBest(next); localStorage.setItem("lucky-break-best",String(next)); }
      window.setTimeout(()=>nextQuestion(next),700);
    } else {
      setEnded(true);
    }
  }

  if(!question) return null;
  const correct=question.players.find(p=>p.id===question.correctPlayerId)!;

  if(ended) return <main className="shell">
    <header className="brand"><button className="textButton" onClick={onBack}>← Daily</button><div className="logo">Lucky <span>Break</span></div></header>
    <section className="runOver">
      <div className="kicker">ENDLESS MODE</div>
      <div className="big">{streak}</div>
      <div className="sub">FINAL STREAK</div>
      <div className="scoreline">Score {score.toLocaleString()} · Personal best {best}</div>
      <p className="feedback bad">Correct answer: {correct.name} — {question.category.format(Number(correct[question.category.key]))}</p>
      <div className="actions"><button className="primary" onClick={start}>PLAY AGAIN</button><button className="secondary" onClick={onBack}>BACK TO DAILY</button></div>
    </section>
  </main>;

  return <main className="shell">
    <header className="brand">
      <button className="textButton" onClick={onBack}>← Daily</button>
      <div className="logo">Lucky <span>Break</span></div>
      <div className="stats">
        <div className="statBox"><div className="statLabel">🔥 Streak</div><div className="statValue">{streak}</div></div>
        <div className="statBox"><div className="statLabel">Score</div><div className="statValue">{score.toLocaleString()}</div></div>
      </div>
    </header>
    <section className="hero">
      <div className="kicker">ENDLESS · {question.category.label}</div>
      <h1 className="question">{question.category.prompt}</h1>
      <p className="sub">One wrong answer ends the run.</p>
    </section>
    <section className="grid" aria-label="Player choices">
      {question.players.map(p=>{
        const isCorrect=p.id===question.correctPlayerId;
        const isWrong=selected===p.id&&!isCorrect;
        return <button key={p.id} className={"card"+(selected&&isCorrect?" correct":"")+(isWrong?" wrong":"")} onClick={()=>choose(p.id)} disabled={Boolean(selected)}>
          <div className="initials">{initials(p.name)}</div>
          <div className="name">{p.name}</div>
          <div className="meta">{p.team} · {p.position}</div>
          {selected&&<div className="reveal">{question.category.format(Number(p[question.category.key]))}</div>}
        </button>;
      })}
    </section>
    <div className="feedback">{best ? "Personal best: "+best : "Build your first streak."}</div>
  </main>;
}