"use client";

import { useEffect, useRef, useState } from "react";
import { buildQuestion, evaluateAnswer, pointsForCorrect } from "@/lib/game";
import { Question } from "@/lib/types";

type Leader = {
  initials: string;
  streak: number;
  score: number;
  completedAt: string;
};

const LEADERBOARD_KEY = "lucky-break-daily-top5";

function playerInitials(name:string){
  return name.split(" ").map(x=>x[0]).slice(0,2).join("");
}

function utcDay() {
  return new Date().toISOString().slice(0,10);
}

function leaderboardStorageKey() {
  return `${LEADERBOARD_KEY}:${utcDay()}`;
}

function sortLeaders(rows:Leader[]) {
  return [...rows].sort((a,b)=>
    b.streak-a.streak ||
    b.score-a.score ||
    new Date(a.completedAt).getTime()-new Date(b.completedAt).getTime()
  );
}

function bestPerInitials(rows:Leader[]) {
  const best = new Map<string,Leader>();
  for (const row of sortLeaders(rows)) {
    if (!best.has(row.initials)) best.set(row.initials,row);
  }
  return sortLeaders([...best.values()]).slice(0,5);
}

function loadLocalLeaders():Leader[] {
  try {
    const raw=localStorage.getItem(leaderboardStorageKey());
    if (!raw) return [];
    return bestPerInitials(JSON.parse(raw) as Leader[]);
  } catch {
    return [];
  }
}

function saveLocalLeaders(rows:Leader[]) {
  localStorage.setItem(leaderboardStorageKey(),JSON.stringify(bestPerInitials(rows)));
}

function qualifiesForTop5(streak:number,score:number,leaders:Leader[]) {
  if (leaders.length<5) return true;
  const cutoff=sortLeaders(leaders)[4];
  if (streak!==cutoff.streak) return streak>cutoff.streak;
  if (score!==cutoff.score) return score>cutoff.score;
  return true;
}

export default function Game() {
  const [started,setStarted]=useState(false);
  const [streak,setStreak]=useState(0);
  const [score,setScore]=useState(0);
  const [question,setQuestion]=useState<Question|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [ended,setEnded]=useState(false);
  const [recent,setRecent]=useState<string[]>([]);
  const [best,setBest]=useState(0);
  const [leaders,setLeaders]=useState<Leader[]>([]);
  const [qualifies,setQualifies]=useState(false);
  const [submittedInitials,setSubmittedInitials]=useState<string|null>(null);
  const [chars,setChars]=useState(["","",""]);
  const [entryError,setEntryError]=useState("");
  const inputRefs=useRef<Array<HTMLInputElement|null>>([]);

  useEffect(()=>{
    setBest(Number(localStorage.getItem("lucky-break-best")||0));
    setLeaders(loadLocalLeaders());
  },[]);

  function nextQuestion(nextStreak=streak) {
    const q=buildQuestion(nextStreak,recent);
    setQuestion(q);
    setRecent(prev=>[...prev.slice(-8),q.id]);
    setSelected(null);
  }

  function start() {
    setStarted(true);
    setStreak(0);
    setScore(0);
    setEnded(false);
    setRecent([]);
    setQualifies(false);
    setSubmittedInitials(null);
    setChars(["","",""]);
    setEntryError("");
    const q=buildQuestion(0,[]);
    setQuestion(q);
    setRecent([q.id]);
    setSelected(null);
  }

  function choose(id:string) {
    if (!question || selected || ended) return;
    setSelected(id);
    const correct=evaluateAnswer(question,id);
    if (correct) {
      const next=streak+1;
      const gained=pointsForCorrect(next);
      const nextScore=score+gained;
      setStreak(next);
      setScore(nextScore);
      if (next>best) {
        setBest(next);
        localStorage.setItem("lucky-break-best",String(next));
      }
      window.setTimeout(()=>nextQuestion(next),700);
    } else {
      setEnded(true);
      setQualifies(qualifiesForTop5(streak,score,leaders));
    }
  }

  function updateChar(index:number,value:string) {
    const cleaned=value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(-1);
    const next=[...chars];
    next[index]=cleaned;
    setChars(next);
    setEntryError("");
    if (cleaned && index<2) inputRefs.current[index+1]?.focus();
  }

  function handleKeyDown(index:number,e:React.KeyboardEvent<HTMLInputElement>) {
    if (e.key==="Backspace" && !chars[index] && index>0) {
      inputRefs.current[index-1]?.focus();
    }
  }

  function submitScore() {
    const tag=chars.join("");
    if (!/^[A-Z0-9]{3}$/.test(tag)) {
      setEntryError("Enter exactly 3 letters or numbers.");
      return;
    }

    const entry:Leader={
      initials:tag,
      streak,
      score,
      completedAt:new Date().toISOString()
    };

    const updated=bestPerInitials([...leaders,entry]);
    setLeaders(updated);
    saveLocalLeaders(updated);
    setSubmittedInitials(tag);
    setQualifies(false);
  }

  async function share() {
    const rank=submittedInitials
      ? leaders.findIndex(l=>l.initials===submittedInitials && l.streak===streak && l.score===score)+1
      : 0;
    const tagLine=submittedInitials ? `${submittedInitials}\n` : "";
    const rankLine=rank>0 ? `Daily Rank: #${rank}\n` : "";
    const text=`🔥 LUCKY BREAK\n\n${tagLine}Streak: ${streak}\nScore: ${score.toLocaleString()}\n${rankLine}\nCan you beat me?`;
    if (navigator.share) await navigator.share({title:"Lucky Break",text});
    else window.prompt("Copy your result:",text);
  }

  function Leaderboard({highlight}:{highlight?:string|null}) {
    return <section className="panel arcadePanel">
      <h2>TODAY&apos;S TOP 5</h2>
      {leaders.length===0
        ? <div className="emptyBoard">No scores yet today. Be the first.</div>
        : leaders.map((l,i)=>
          <div className={"leader "+(highlight===l.initials?"highlight":"")} key={l.initials}>
            <span>#{i+1}</span>
            <strong className="arcadeTag">{l.initials}</strong>
            <span>🔥 {l.streak}</span>
            <span>{l.score.toLocaleString()}</span>
          </div>
        )
      }
    </section>;
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
      <Leaderboard />
      <p className="footer">Lucky Break is an independent basketball trivia game and is not affiliated with or endorsed by the NBA.</p>
    </main>;
  }

  if (!question) return null;

  if (ended) {
    const correct=question.players.find(p=>p.id===question.correctPlayerId)!;

    if (qualifies && !submittedInitials) {
      return <main className="shell">
        <header className="brand"><div className="logo">Lucky <span>Break</span></div></header>
        <section className="runOver arcadeEntry">
          <div className="kicker">YOU MADE THE TOP 5</div>
          <div className="big">{streak}</div>
          <div className="sub">FINAL STREAK · {score.toLocaleString()} POINTS</div>
          <h2 className="entryTitle">ENTER YOUR INITIALS</h2>
          <div className="initialEntry" aria-label="Three character arcade initials">
            {chars.map((char,i)=>
              <input
                key={i}
                ref={el=>{ inputRefs.current[i]=el; }}
                className="initialSlot"
                value={char}
                maxLength={1}
                inputMode="text"
                autoCapitalize="characters"
                aria-label={`Initial ${i+1}`}
                onChange={e=>updateChar(i,e.target.value)}
                onKeyDown={e=>handleKeyDown(i,e)}
              />
            )}
          </div>
          {entryError && <div className="entryError">{entryError}</div>}
          <div className="actions">
            <button className="primary" onClick={submitScore}>LOCK IN SCORE</button>
          </div>
        </section>
      </main>;
    }

    return <main className="shell">
      <header className="brand"><div className="logo">Lucky <span>Break</span></div></header>
      <section className="runOver">
        <div className="kicker">{submittedInitials ? "HIGH SCORE LOCKED IN" : "RUN OVER"}</div>
        <div className="big">{streak}</div>
        <div className="sub">FINAL STREAK</div>
        <div className="scoreline">Score {score.toLocaleString()} · Personal best {best}</div>
        <p className="feedback bad">Correct answer: {correct.name} — {question.category.format(Number(correct[question.category.key]))} {question.category.label}</p>
        <div className="actions">
          <button className="primary" onClick={start}>PLAY AGAIN</button>
          <button className="secondary" onClick={share}>SHARE RESULT</button>
        </div>
      </section>
      <Leaderboard highlight={submittedInitials} />
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
          <div className="initials">{playerInitials(p.name)}</div>
          <div className="name">{p.name}</div>
          <div className="meta">{p.team} · {p.position}</div>
          {selected && <div className="reveal">{question.category.format(Number(p[question.category.key]))} {question.category.label}</div>}
        </button>;
      })}
    </section>

    <div className={"feedback "+(selected?"good":"")}>{selected ? "Correct — keep it moving." : best ? `Personal best: ${best}` : "Build your first streak."}</div>
  </main>;
}