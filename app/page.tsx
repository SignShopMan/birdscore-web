"use client";

import { useState } from "react";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { SettingsScreen } from "@/components/SettingsScreen";
import { GameScreen } from "@/components/GameScreen";
import { ScorecardModal } from "@/components/ScorecardModal";
import { GameOverScreen } from "@/components/GameOverScreen";
import { Scoreboard } from "@/components/Scoreboard";

type Screen = "settings" | "game";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("settings");
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const { gameOver, rounds, updateRound, deleteRound } = useGameStore();

  if (gameOver) {
    return <GameOverScreen onNewGame={() => setScreen("game")} />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-5xl lg:grid lg:grid-cols-[minmax(0,32rem)_320px] lg:items-start lg:gap-10 lg:px-10 lg:py-10">
      <div>
        {screen === "settings" && <SettingsScreen onStart={() => setScreen("game")} />}
        {screen === "game" && (
          <GameScreen
            onScoreRound={() => setScorecardOpen(true)}
            onOpenScoreboard={() => setScoreboardOpen(true)}
          />
        )}
      </div>

      {/* Desktop: scoreboard lives permanently in a sidebar, no toggling needed */}
      {screen === "game" && (
        <aside className="sticky top-10 hidden h-[calc(100dvh-5rem)] lg:block">
          <Scoreboard
            rounds={rounds}
            usTotal={usTotal(rounds)}
            themTotal={themTotal(rounds)}
            onUpdateRound={updateRound}
            onDeleteRound={deleteRound}
          />
        </aside>
      )}

      {/* Mobile: scoreboard opens as a full sheet on demand */}
      {scoreboardOpen && (
        <div className="fixed inset-0 z-40 bg-felt-dark/95 p-5 pt-8 lg:hidden">
          <Scoreboard
            rounds={rounds}
            usTotal={usTotal(rounds)}
            themTotal={themTotal(rounds)}
            onUpdateRound={updateRound}
            onDeleteRound={deleteRound}
            onClose={() => setScoreboardOpen(false)}
          />
        </div>
      )}

      {scorecardOpen && <ScorecardModal onClose={() => setScorecardOpen(false)} />}
    </div>
  );
}
