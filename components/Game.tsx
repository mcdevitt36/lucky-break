"use client";

import { useEffect, useRef, useState } from "react";
import { buildQuestion, evaluateAnswer, pointsForCorrect } from "@/lib/game";
import { Question } from "@/lib/types";
import { Leader, fetchTop5, submitScore as submitUniversalScore, universalLeaderboardConfigured } from "@/lib/leaderboard";

function playerInitials(name:string){
  return name.split(" ").map(x=>x[0]).slice(0,2).join("");
}

function qualifiesForTop5(streak:number,score:number,leaders:Leader[]) {
  if (leaders.length<5) return true;
  const cutoff=[...leaders].sort((a,b)=>b.streak-a.streak || b.score-a.score || new Date(a.completedAt).getTime()-new Date(b.completedAt).getTime())[4];
  if (streak!==cutoff.streak) return streak>cutoff.streak;
  if (score!==cutoff.score) return score>cutoff.score;
  return false;
}

export default function Game() {
  const [started,setStarted]=useState(false);
  const [streak,setStreak]=useState(0);
  const [score,setScore]=useState(0);
  const [question,setQuestion]=useState<Question|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [ended,setEnded]=useState(false);
  const [recent,setRecent]=useState<string[]>([]);
  const [recentPlayers,setRecentPlayers]=useState<string[]>([]);
  const [best,setBest]=useState(0);
  const [leaders,setLeaders]=useState<Leader[]>([]);
  const [qualifies,setQualifies]=useState(false);
  const [submittedInitials,setSubmittedInitials]=useState<string|null>(null);
  const [chars,setChars]=useState(["","",""]);
  const [entryError,setEntryError]=useState("");
  const [leaderboardLoading,setLeaderboardLoading]=useState(true);
  const [leaderboardError,setLeaderboardError]=useState("");
  const inputRefs=useRef<Array<HTMLInputElement|null>>([]);

  async function refreshLeaders() {
    if (!universalLeaderboardConfigured()) {
      setLeaders([]);
      setLeaderboardLoading(false);
      setLeaderboardError("Universal leaderboard is not connected yet.");
      return [];
    }
    try {
      setLeaderboardLoading(true);
      setLeaderboardError("");
      const rows=await fetchTop5();
      setLeaders(rows);
      return rows;
    } catch {
      setLeaderboardError("Could not load today's leaderboard.");
      return leaders;
    } finally {
      setLeaderboardLoading(false);
    }
  }

  useEffect(()=>{
    setBest(Number(localStorage.getItem("lucky-break-best")||0));
    void refreshLeaders();
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
    setStarted(true);
    setStreak(0);
    setScore(0);
    setEnded(false);
    setRecent([]);
    setRecentPlayers([]);
    setQualifies(false);
    setSubmittedInitials(null);
    setChars(["","",""]);
    setEntryError("");
    const q=buildQuestion(0,[],[]);
    setQuestion(q);
    setRecent([q.id]);
    setRecentPlayers(q.players.map(p=>p.id));
    setSelected(null);
    void refreshLeaders();
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
      void (async()=>{
        const latest=await refreshLeaders();
        setQualifies(universalLeaderboardConfigured() && qualifiesForTop5(streak,score,latest));
      })();
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

  async function submitScore() {
    const tag=chars.join("");
    if (!/^[A-Z0-9]{3}$/.test(tag)) {
      setEntryError("Enter exactly 3 letters or numbers.");
      return;
    }

    try {
      setEntryError("");
      await submitUniversalScore(tag,streak);
      setSubmittedInitials(tag);
      setQualifies(false);
      await refreshLeaders();
    } catch {
      setEntryError("Could not submit score. Try again.");
    }
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
      {leaderboardLoading
        ? <div className="emptyBoard">Loading today&apos;s scores…</div>
        : leaderboardError
          ? <div className="emptyBoard">{leaderboardError}</div>
          : leaders.length===0
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