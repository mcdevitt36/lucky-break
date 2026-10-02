"use client";

import { useState } from "react";
import StartingFive from "./StartingFive";
import EndlessGame from "./EndlessGame";

export default function Game(){
  const [mode,setMode]=useState<"daily"|"endless">("daily");
  return mode==="daily" ? <StartingFive onEndless={()=>setMode("endless")} /> : <EndlessGame onBack={()=>setMode("daily")} />;
}