"use client";

import { useEffect, useState } from "react";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { useAuthStore } from "@/lib/auth-store";
import { canSaveHistory, canUseEnhancedStats } from "@/lib/entitlements";
import { NewGameScreen } from "@/components/NewGameScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { GameScreen } from "@/components/GameScreen";
import { ScorecardModal } from "@/components/ScorecardModal";
import { GameOverScreen } from "@/components/GameOverScreen";
import { GameOverConfirmScreen } from "@/components/GameOverConfirmScreen";
import { Scoreboard } from "@/components/Scoreboard";
import { AccountScreen } from "@/components/AccountScreen";
import { HistoryScreen } from "@/components/HistoryScreen";
import { FaqScreen } from "@/components/FaqScreen";
import { ResourcesScreen } from "@/components/ResourcesScreen";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Screen = "newgame" | "settings" | "game" | "account" | "history" | "faq" | "resources";

export default function Home() {
  const { tier } = useAuthStore();
  const [screen, setScreen] = useState<Screen>("newgame");
  const [returnScreen, setReturnScreen] = useState<Screen>("newgame");
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [gameOverConfirmed, setGameOverConfirmed] = useState(false);
  const {
    hasHydrated,
    gameActive,
    gameOver,
    winner,
    settings,
    rounds,
    trump,
    bid,
    bidTeam,
    shootMoon,
    currentGameId,
    gameCreated,
    updateRound,
    deleteRound,
    addAdjustment,
    abandonGame,
  } = useGameStore();

  // Re-arm the checkpoint below every time gameOver goes back to false —
  // covers both a fresh game later reaching the winning score again, and
  // the "No, let me check a round" edit path dropping the score back
  // under it (which un-confirms this on its own, no extra wiring needed).
  useEffect(() => {
    if (!gameOver) setGameOverConfirmed(false);
  }, [gameOver]);

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
  const NAV_SCREENS: Screen[] = ["settings", "account", "history", "faq", "resources"];
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
  const openResources = () => {
    if (!NAV_SCREENS.includes(screen)) setReturnScreen(screen);
    setScreen("resources");
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
      // gameCreated, not just currentGameId — currentGameId is now assigned
      // client-side the instant a game starts (see game-store.ts), so it's
      // set for every game including free-tier/anonymous ones that were
      // never synced. Only a game that's actually landed server-side needs
      // (or can receive) a cancel PATCH.
      if (gameCreated && currentGameId) {
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
  // reachable even with a finished game sitting there. Unconfirmed first:
  // a checkpoint before the real (locked, synced) Game Over screen below,
  // with the live-editing Scoreboard still available via "No, let me
  // check a round" — see GameOverConfirmScreen for why.
  if (gameOver && screen === "game" && !gameOverConfirmed) {
    return (
      <>
        <GameOverConfirmScreen
          winner={winner}
          usTotal={usTotal(rounds)}
          themTotal={themTotal(rounds)}
          settings={settings}
          onConfirm={() => setGameOverConfirmed(true)}
          onEdit={() => setScoreboardOpen(true)}
        />
        {scoreboardOpen && (
          <div className="fixed inset-0 z-40 bg-felt-dark p-5 pt-8">
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
              showDealerRook={canUseEnhancedStats(tier) && settings.players !== null}
            />
          </div>
        )}
      </>
    );
  }

  if (gameOver && screen === "game") {
    return (
      <GameOverScreen
        onNewGame={handleNewGame}
        onOpenSettings={openSettings}
        onOpenAccount={openAccount}
        onOpenHistory={openHistory}
        onOpenFaq={openFaq}
        onOpenResources={openResources}
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
            onOpenResources={openResources}
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
            onOpenResources={openResources}
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
            onOpenResources={openResources}
          />
        )}
        {screen === "account" && (
          <AccountScreen
            onNewGame={handleNewGame}
            onOpenSettings={openSettings}
            onOpenAccount={openAccount}
            onOpenHistory={openHistory}
            onOpenFaq={openFaq}
            onOpenResources={openResources}
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
            onOpenResources={openResources}
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
            onOpenResources={openResources}
            onBack={goBack}
          />
        )}
        {screen === "resources" && (
          <ResourcesScreen
            onNewGame={handleNewGame}
            onOpenSettings={openSettings}
            onOpenAccount={openAccount}
            onOpenHistory={openHistory}
            onOpenFaq={openFaq}
            onOpenResources={openResources}
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
            showDealerRook={canUseEnhancedStats(tier) && settings.players !== null}
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
            showDealerRook={canUseEnhancedStats(tier) && settings.players !== null}
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
