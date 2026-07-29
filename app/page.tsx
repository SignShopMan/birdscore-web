"use client";

import { useEffect, useState } from "react";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { SettingsScreen } from "@/components/SettingsScreen";
import { GameScreen } from "@/components/GameScreen";
import { ScorecardModal } from "@/components/ScorecardModal";
import { GameOverScreen } from "@/components/GameOverScreen";
import { Scoreboard } from "@/components/Scoreboard";
import { AccountScreen } from "@/components/AccountScreen";
import { FaqScreen } from "@/components/FaqScreen";

type Screen = "settings" | "game" | "account" | "faq";
type SettingsMode = "new" | "edit";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("settings");
  const [returnScreen, setReturnScreen] = useState<Screen>("settings");
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

  // Account/FAQ remember where they were opened from, so their "Back" link
  // returns to Game (if a game was in progress) rather than always landing
  // on Settings regardless of context.
  const openAccount = () => {
    if (screen !== "account" && screen !== "faq") setReturnScreen(screen);
    setScreen("account");
  };
  const openFaq = () => {
    if (screen !== "account" && screen !== "faq") setReturnScreen(screen);
    setScreen("faq");
  };
  const goBack = () => setScreen(returnScreen);

  // Brief, deliberately blank — avoids a flash of the Settings screen before
  // flipping to Game the instant rehydration completes.
  if (!hasHydrated) {
    return <div className="min-h-dvh bg-felt" />;
  }

  // gameOver takes over specifically when screen is "game" (the resumed/
  // default state) — Settings, Account, and FAQ all stay freely reachable
  // even with a finished game sitting there.
  if (gameOver && screen === "game") {
    return (
      <GameOverScreen
        onNewGame={() => setScreen("game")}
        onOpenSettings={() => openSettings("new")}
        onOpenAccount={openAccount}
        onOpenFaq={openFaq}
      />
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-5xl lg:grid lg:grid-cols-[minmax(0,32rem)_320px] lg:items-start lg:gap-10 lg:px-10 lg:py-10">
      <div>
        {screen === "settings" && (
          <SettingsScreen
            mode={settingsMode}
            canCancel={hasStartedGame}
            onDone={closeSettings}
            onOpenSettings={() => openSettings(settingsMode)}
            onOpenAccount={openAccount}
            onOpenFaq={openFaq}
          />
        )}
        {screen === "game" && !gameOver && (
          <GameScreen
            onScoreRound={() => setScorecardOpen(true)}
            onOpenScoreboard={() => setScoreboardOpen(true)}
            onOpenSettings={() => openSettings("edit")}
            onOpenAccount={openAccount}
            onOpenFaq={openFaq}
          />
        )}
        {screen === "account" && (
          <AccountScreen
            onOpenSettings={() => openSettings(hasStartedGame ? "edit" : "new")}
            onOpenAccount={openAccount}
            onOpenFaq={openFaq}
            onBack={goBack}
            onResumeGame={() => {
              setHasStartedGame(true);
              setScreen("game");
            }}
          />
        )}
        {screen === "faq" && (
          <FaqScreen
            onOpenSettings={() => openSettings(hasStartedGame ? "edit" : "new")}
            onOpenAccount={openAccount}
            onOpenFaq={openFaq}
            onBack={goBack}
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
