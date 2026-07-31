"use client";

import { useEffect, useState } from "react";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { useAuthStore } from "@/lib/auth-store";
import { canSaveHistory } from "@/lib/entitlements";
import { NewGameScreen } from "@/components/NewGameScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { GameScreen } from "@/components/GameScreen";
import { ScorecardModal } from "@/components/ScorecardModal";
import { GameOverScreen } from "@/components/GameOverScreen";
import { Scoreboard } from "@/components/Scoreboard";
import { AccountScreen } from "@/components/AccountScreen";
import { HistoryScreen } from "@/components/HistoryScreen";
import { FaqScreen } from "@/components/FaqScreen";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Screen = "newgame" | "settings" | "game" | "account" | "history" | "faq";

export default function Home() {
  const { tier } = useAuthStore();
  const [screen, setScreen] = useState<Screen>("newgame");
  const [returnScreen, setReturnScreen] = useState<Screen>("newgame");
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const {
    hasHydrated,
    gameActive,
    gameOver,
    settings,
    rounds,
    trump,
    bid,
    bidTeam,
    shootMoon,
    currentGameId,
    updateRound,
    deleteRound,
    addAdjustment,
    abandonGame,
  } = useGameStore();

  // Resume a game already in progress after a reload — an interrupted game
  // used to just vanish back to the landing screen, since screen state
  // lived only in memory even though the game data itself is persisted
  // (localStorage, see game-store.ts). Once the persisted state is
  // actually readable, check whether there's a game to resume.
  useEffect(() => {
    if (!hasHydrated) return;
    const gameInProgress =
      rounds.length > 0 || !!trump || !!bidTeam || bid != null || shootMoon || gameOver;
    if (gameInProgress) setScreen("game");
    // Only ever needs to run once, right after rehydration completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  // Settings/Account/History/FAQ all remember whichever screen they were
  // opened from, so "back" returns you to where you actually were rather
  // than always landing in one fixed place.
  const NAV_SCREENS: Screen[] = ["settings", "account", "history", "faq"];
  const openSettings = () => {
    if (!NAV_SCREENS.includes(screen)) setReturnScreen(screen);
    setScreen("settings");
  };
  const openAccount = () => {
    if (!NAV_SCREENS.includes(screen)) setReturnScreen(screen);
    setScreen("account");
  };
  const openHistory = () => {
    if (!NAV_SCREENS.includes(screen)) setReturnScreen(screen);
    setScreen("history");
  };
  const openFaq = () => {
    if (!NAV_SCREENS.includes(screen)) setReturnScreen(screen);
    setScreen("faq");
  };
  const goBack = () => setScreen(returnScreen);

  // "New Game" from the menu — the thing that used to silently orphan
  // whatever game was already active (start fresh, leave the old one
  // sitting as in_progress forever). Only confirms when there's actually
  // something to lose: a game that's active and not already finished
  // (Game Over's own New Game button reuses this same handler, but the
  // condition is always false there since gameOver is true by definition
  // on that screen — nothing to confirm, goes straight through).
  const handleNewGame = () => {
    if (gameActive && !gameOver) {
      setConfirmingNewGame(true);
    } else {
      setScreen("newgame");
    }
  };
  const confirmAbandonAndStartNew = async () => {
    setAbandoning(true);
    try {
      if (currentGameId) {
        await fetch(`/api/games/${currentGameId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancel: true }),
        });
      }
    } finally {
      abandonGame();
      setAbandoning(false);
      setConfirmingNewGame(false);
      setScreen("newgame");
    }
  };

  // Brief, deliberately blank — avoids a flash of the New Game screen
  // before flipping to Game the instant rehydration completes.
  if (!hasHydrated) {
    return <div className="min-h-dvh bg-felt" />;
  }

  // gameOver takes over specifically when screen is "game" (the resumed/
  // default state) — Settings, Account, History, and FAQ all stay freely
  // reachable even with a finished game sitting there.
  if (gameOver && screen === "game") {
    return (
      <GameOverScreen
        onNewGame={handleNewGame}
        onOpenSettings={openSettings}
        onOpenAccount={openAccount}
        onOpenHistory={openHistory}
        onOpenFaq={openFaq}
      />
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-5xl lg:grid lg:grid-cols-[minmax(0,32rem)_320px] lg:items-start lg:gap-10 lg:px-10 lg:py-10">
      <div>
        {screen === "newgame" && (
          <NewGameScreen
            onStart={() => setScreen("game")}
            onChangeSettings={openSettings}
            onNewGame={handleNewGame}
            onOpenSettings={openSettings}
            onOpenAccount={openAccount}
            onOpenHistory={openHistory}
            onOpenFaq={openFaq}
          />
        )}
        {screen === "settings" && (
          <SettingsScreen
            onDone={goBack}
            onNewGame={handleNewGame}
            onOpenSettings={openSettings}
            onOpenAccount={openAccount}
            onOpenHistory={openHistory}
            onOpenFaq={openFaq}
          />
        )}
        {screen === "game" && !gameOver && (
          <GameScreen
            onScoreRound={() => setScorecardOpen(true)}
            onOpenScoreboard={() => setScoreboardOpen(true)}
            onNewGame={handleNewGame}
            onOpenSettings={openSettings}
            onOpenAccount={openAccount}
            onOpenHistory={openHistory}
            onOpenFaq={openFaq}
          />
        )}
        {screen === "account" && (
          <AccountScreen
            onNewGame={handleNewGame}
            onOpenSettings={openSettings}
            onOpenAccount={openAccount}
            onOpenHistory={openHistory}
            onOpenFaq={openFaq}
            onBack={goBack}
          />
        )}
        {screen === "history" && (
          <HistoryScreen
            onNewGame={handleNewGame}
            onOpenSettings={openSettings}
            onOpenAccount={openAccount}
            onOpenHistory={openHistory}
            onOpenFaq={openFaq}
            onBack={goBack}
            onResumeGame={() => setScreen("game")}
          />
        )}
        {screen === "faq" && (
          <FaqScreen
            onNewGame={handleNewGame}
            onOpenSettings={openSettings}
            onOpenAccount={openAccount}
            onOpenHistory={openHistory}
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
            usLabel={settings.usTeamName}
            themLabel={settings.themTeamName}
            settings={settings}
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
            usLabel={settings.usTeamName}
            themLabel={settings.themTeamName}
            settings={settings}
            onUpdateRound={updateRound}
            onDeleteRound={deleteRound}
            onAddAdjustment={addAdjustment}
            onClose={() => setScoreboardOpen(false)}
          />
        </div>
      )}

      {scorecardOpen && <ScorecardModal onClose={() => setScorecardOpen(false)} />}

      {confirmingNewGame && (
        <ConfirmDialog
          title="Game in progress"
          message={
            canSaveHistory(tier)
              ? "Starting a new game will cancel this one — it'll still show up in History as cancelled, just not resumable."
              : "Starting a new game will discard this one — it was never saved, so there's nothing to look back at afterward."
          }
          confirmLabel="Cancel it and start new"
          cancelLabel="Keep playing"
          danger
          confirming={abandoning}
          onConfirm={confirmAbandonAndStartNew}
          onCancel={() => setConfirmingNewGame(false)}
        />
      )}
    </div>
  );
}
