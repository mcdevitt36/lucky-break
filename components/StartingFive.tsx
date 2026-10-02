"use client";

import { useEffect, useMemo, useState } from "react";
import { players } from "@/lib/data";
import { createDailyChallenge, DailyResult, resultStorageKey, scoreSelections } from "@/lib/dailyChallenge";

function initials(name:string){ return name.split(" ").map(x=>x[0]).slice(0,2).join(""); }

export default function StartingFive({onEndless}:{onEndless:()=>void}) {
  const challenge=useMemo(()=>createDailyChallenge(),[]);
  const playerMap=useMemo(()=>new Map(players.map(p=>[p.id,p])),[]);
  const options=challenge.playerIds.map(id=>playerMap.get(id)!).filter(Boolean);
  const correctSet=new Set(challenge.correctPlayerIds);
  const [phase,setPhase]=useState<"home"|"play"|"result">("home");
  const [selected,setSelected]=useState<string[]>([]);
  const [startedAt,setStartedAt]=useState(0);
  const [result,setResult]=useState<DailyResult|null>(null);

  useEffect(()=>{
    const raw=localStorage.getItem(resultStorageKey(challenge.date));
    if(raw){ try { setResult(JSON.parse(raw)); } catch {} }
  },[challenge.date]);

  function start(){
    if(result){ setPhase("result"); return; }
    setSelected([]); setStartedAt(Date.now()); setPhase("play");
  }

  function toggle(id:string){
    if(phase!=="play") return;
    setSelected(prev=>{
      if(prev.includes(id)) return prev.filter(x=>x!==id);
      if(prev.length>=5) return prev;
      return [...prev,id];
    });
  }

  function lock(){
    if(selected.length!==5||!startedAt) return;
    const seconds=Math.max(1,Math.round((Date.now()-startedAt)/1000));
    const scored=scoreSelections(selected,challenge,seconds);
    const next:DailyResult={date:challenge.date,challengeId:challenge.id,selections:[...selected],correct:scored.correct,score:scored.score,seconds,grid:scored.grid,completed:true};
    localStorage.setItem(resultStorageKey(challenge.date),JSON.stringify(next));
    setResult(next); setPhase("result");
  }

  async function share(){
    if(!result) return;
    const d=new Date(challenge.date+"T00:00:00Z");
    const dateLabel=d.toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"}).toUpperCase();
    const text="🏀 LUCKY BREAK — "+dateLabel+"\n\nSTARTING FIVE\n\n"+result.correct+"/5\nScore: "+result.score.toLocaleString()+"\n⏱ "+result.seconds+"s\n\n"+result.grid+"\n\nCan you beat my Starting Five?\nhttps://mcdevitt36.github.io/lucky-break/";
    if(navigator.share) await navigator.share({title:"Lucky Break — Starting Five",text});
    else { await navigator.clipboard?.writeText(text); window.alert("Result copied to clipboard."); }
  }

  const correctRanked=[...options].sort((a,b)=>{
    const c=challenge.category; const av=Number(a[c.key]),bv=Number(b[c.key]);
    return c.lowerWins?av-bv:bv-av;
  }).slice(0,5);

  if(phase==="home"){
    return <main className="shell dailyShell">
      <header className="brand"><div className="logo">Lucky <span>Break</span></div></header>
      <section className="dailyHero">
        <div className="kicker">STARTING FIVE</div>
        <h1 className="dailyTitle">Ten players. Five spots. One shot.</h1>
        <p className="dailyTagline">Five belong. Five don&apos;t.</p>
        {result ? <div className="completedCard">
          <div className="statLabel">TODAY&apos;S STARTING FIVE</div>
          <div className="dailyScore">{result.correct}/5</div>
          <div className="shareGrid">{result.grid}</div>
          <div className="scoreline">Score {result.score.toLocaleString()} · ⏱ {result.seconds}s</div>
          <div className="actions"><button className="primary" onClick={()=>setPhase("result")}>VIEW TODAY&apos;S RESULT</button><button className="secondary" onClick={share}>SHARE RESULT</button></div>
        </div> : <>
          <div className="challengePreview">
            <div className="statLabel">TODAY&apos;S CATEGORY</div>
            <strong>{challenge.category.label}</strong>
            <p>{challenge.category.prompt}</p>
          </div>
          <div className="actions"><button className="primary dailyPlay" onClick={start}>PLAY TODAY&apos;S FIVE</button></div>
          <p className="oneAttempt">One attempt. Same challenge for everyone.</p>
        </>}
      </section>
      <section className="endlessPromo">
        <div><div className="kicker">ENDLESS MODE</div><h2>Think you can keep going?</h2><p>Four players. One answer. One wrong pick ends the run.</p></div>
        <button className="secondary" onClick={onEndless}>PLAY ENDLESS</button>
      </section>
      <p className="footer">Lucky Break is an independent basketball trivia game and is not affiliated with or endorsed by the NBA.</p>
    </main>;
  }

  if(phase==="result"&&result){
    const chosen=result.selections.map(id=>playerMap.get(id)!).filter(Boolean);
    return <main className="shell dailyShell">
      <header className="brand"><button className="textButton" onClick={()=>setPhase("home")}>← Home</button><div className="logo">Lucky <span>Break</span></div></header>
      <section className="resultHero">
        <div className="kicker">{result.correct===5?"PERFECT LINEUP":"TODAY&apos;S RESULT"}</div>
        <div className="dailyScore">{result.correct}/5</div>
        <div className="shareGrid">{result.grid}</div>
        <div className="scoreline">Score {result.score.toLocaleString()} · ⏱ {result.seconds}s</div>
        <div className="actions"><button className="primary" onClick={share}>SHARE RESULT</button><button className="secondary" onClick={onEndless}>PLAY ENDLESS</button></div>
      </section>
      <section className="dailyBoard resultBoard">
        {options.map(p=>{
          const picked=result.selections.includes(p.id); const correct=correctSet.has(p.id);
          const cls=picked&&correct?" correct":picked&&!correct?" wrong":!picked&&correct?" missed":"";
          return <div className={"dailyCard "+cls} key={p.id}>
            <div className="dailyCardTop"><div className="initials">{initials(p.name)}</div><div><div className="name">{p.name}</div><div className="meta">{p.team} · {p.position}</div></div></div>
            <div className="reveal">{challenge.category.format(Number(p[challenge.category.key]))}</div>
          </div>;
        })}
      </section>
      <section className="correctFive">
        <h2>CORRECT STARTING FIVE</h2>
        {correctRanked.map((p,i)=><div className="rankRow" key={p.id}><span>{i+1}</span><strong>{p.name}</strong><span>{challenge.category.format(Number(p[challenge.category.key]))}</span></div>)}
        {chosen.some(p=>!correctSet.has(p.id))&&<p className="resultNote"><strong>Wrong picks:</strong> {chosen.filter(p=>!correctSet.has(p.id)).map(p=>p.name).join(", ")}</p>}
        {correctRanked.some(p=>!result.selections.includes(p.id))&&<p className="resultNote"><strong>Missed:</strong> {correctRanked.filter(p=>!result.selections.includes(p.id)).map(p=>p.name).join(", ")}</p>}
      </section>
    </main>;
  }

  return <main className="shell dailyShell">
    <header className="brand"><button className="textButton" onClick={()=>setPhase("home")}>← Home</button><div className="logo">Lucky <span>Break</span></div><div className="selectionBadge">{selected.length}/5</div></header>
    <section className="dailyQuestion"><div className="kicker">{challenge.category.label}</div><h1>{challenge.category.prompt}</h1></section>
    <section className="rosterSlots">
      {[0,1,2,3,4].map(i=><div className={"rosterSlot "+(selected[i]?"filled":"")} key={i}><span>{i+1}</span>{selected[i]?playerMap.get(selected[i])!.name:"Open spot"}</div>)}
    </section>
    <section className="dailyBoard">
      {options.map(p=>{
        const on=selected.includes(p.id);
        return <button className={"dailyCard "+(on?"selected":"")} key={p.id} onClick={()=>toggle(p.id)} aria-pressed={on}>
          <div className="dailyCardTop"><div className="initials">{initials(p.name)}</div><div><div className="name">{p.name}</div><div className="meta">{p.team} · {p.position}</div></div></div>
          <div className="pickState">{on?"SELECTED":"SELECT"}</div>
        </button>;
      })}
    </section>
    <div className="stickyLock"><span><strong>{selected.length}/5</strong> SELECTED</span><button className="primary" onClick={lock} disabled={selected.length!==5}>LOCK IN FIVE</button></div>
  </main>;
}