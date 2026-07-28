"use client";

import { useEffect, useState } from "react";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { SettingsScreen } from "@/components/SettingsScreen";
import { GameScreen } from "@/components/GameScreen";
import { ScorecardModal } from "@/components/ScorecardModal";
import { GameOverScreen } from "@/components/GameOverScreen";
import { Scoreboard } from "@/components/Scoreboard";

type Screen = "settings" | "game";
type SettingsMode = "new" | "edit";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("settings");
  const [settingsMode, setSettingsMode] = useState<SettingsMode>("new");
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const { hasHydrated, gameOver, rounds, trump, bid, bidTeam, shootMoon, updateRound, deleteRound, addAdjustment } =
    useGameStore();

  // Resume a game already in progress after a reload — an interrupted game
  // used to just vanish back to Settings, since screen state lived only in
  // memory even though the game data itself is now persisted (localStorage,
  // see game-store.ts). This is the fix for that: once the persisted state
  // is actually readable, check whether there's a game to resume.
  useEffect(() => {
    if (!hasHydrated) return;
    const gameInProgress =
      rounds.length > 0 || !!trump || !!bidTeam || bid != null || shootMoon || gameOver;
    if (gameInProgress) {
      setHasStartedGame(true);
      setScreen("game");
    }
    // Only ever needs to run once, right after rehydration completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  const openSettings = (mode: SettingsMode) => {
    setSettingsMode(mode);
    setScreen("settings");
  };
  const closeSettings = () => {
    setHasStartedGame(true);
    setScreen("game");
  };

  // Brief, deliberately blank — avoids a flash of the Settings screen before
  // flipping to Game the instant rehydration completes.
  if (!hasHydrated) {
    return <div className="min-h-dvh bg-felt" />;
  }

  // gameOver takes over the whole screen normally, but yields to Settings when
  // someone backs out to fix the rules before the next game.
  if (gameOver && screen !== "settings") {
    return (
      <GameOverScreen
        onNewGame={() => setScreen("game")}
        onOpenSettings={() => openSettings("new")}
      />
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-5xl lg:grid lg:grid-cols-[minmax(0,32rem)_320px] lg:items-start lg:gap-10 lg:px-10 lg:py-10">
      <div>
        {screen === "settings" && (
          <SettingsScreen mode={settingsMode} canCancel={hasStartedGame} onDone={closeSettings} />
        )}
        {screen === "game" && !gameOver && (
          <GameScreen
            onScoreRound={() => setScorecardOpen(true)}
            onOpenScoreboard={() => setScoreboardOpen(true)}
            onOpenSettings={() => openSettings("edit")}
          />
        )}
      </div>

      {/* Desktop: scoreboard lives permanently in a sidebar, no toggling needed */}
      {screen === "game" && !gameOver && (
        <aside className="sticky top-10 hidden h-[calc(100dvh-5rem)] lg:block">
          <Scoreboard
            rounds={rounds}
            usTotal={usTotal(rounds)}
            themTotal={themTotal(rounds)}
            onUpdateRound={updateRound}
            onDeleteRound={deleteRound}
            onAddAdjustment={addAdjustment}
          />
        </aside>
      )}

      {/* Mobile: scoreboard opens as a full sheet on demand */}
      {scoreboardOpen && (
        <div className="fixed inset-0 z-40 bg-felt-dark p-5 pt-8 lg:hidden">
          <Scoreboard
            rounds={rounds}
            usTotal={usTotal(rounds)}
            themTotal={themTotal(rounds)}
            onUpdateRound={updateRound}
            onDeleteRound={deleteRound}
            onAddAdjustment={addAdjustment}
            onClose={() => setScoreboardOpen(false)}
          />
        </div>
      )}

      {scorecardOpen && <ScorecardModal onClose={() => setScorecardOpen(false)} />}
    </div>
  );
}
