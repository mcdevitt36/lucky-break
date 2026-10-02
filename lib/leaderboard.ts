export type Leader = {
  initials: string;
  streak: number;
  score: number;
  completedAt: string;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function universalLeaderboardConfigured() {
  return Boolean(url && anonKey);
}

function headers(extra:Record<string,string>={}) {
  return {
    apikey: anonKey || "",
    Authorization: `Bearer ${anonKey || ""}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function fetchTop5():Promise<Leader[]> {
  if (!url || !anonKey) return [];
  const res=await fetch(
    `${url}/rest/v1/daily_top5?select=initials,streak,score,completed_at&order=streak.desc,score.desc,completed_at.asc&limit=5`,
    {headers:headers(),cache:"no-store"}
  );
  if (!res.ok) throw new Error("Could not load universal leaderboard");
  const rows=await res.json();
  return rows.map((r:{initials:string;streak:number;score:number;completed_at:string})=>({
    initials:r.initials,
    streak:r.streak,
    score:r.score,
    completedAt:r.completed_at,
  }));
}

export async function submitScore(initials:string,streak:number):Promise<void> {
  if (!url || !anonKey) throw new Error("Universal leaderboard is not configured");
  const res=await fetch(`${url}/rest/v1/rpc/submit_score`,{
    method:"POST",
    headers:headers(),
    body:JSON.stringify({p_initials:initials,p_streak:streak}),
  });
  if (!res.ok) throw new Error("Could not submit score");
}
