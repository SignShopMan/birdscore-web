"use client";

import { useEffect, useState } from "react";
import { Share } from "@capacitor/share";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { useAuthStore } from "@/lib/auth-store";
import { canSaveHistory, canUseEnhancedStats } from "@/lib/entitlements";
import { teamLabel } from "@/lib/rook-engine";
import { isNativeIOS } from "@/lib/platform";
import { ScoreTotals } from "./ScoreTotals";
import { Scoreboard } from "./Scoreboard";
import { SaveGamePrompt } from "./SaveGamePrompt";
import { MainMenu } from "./MainMenu";

export function GameOverScreen({
  onNewGame,
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onOpenResources,
}: {
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onOpenResources: () => void;
}) {
  const { settings, rounds, winner, updateRound, deleteRound, syncStatus } = useGameStore();
  const { tier, refreshingProfile } = useAuthStore();
  const entitled = canSaveHistory(tier);
  const [nativeIOS, setNativeIOS] = useState(false);
  useEffect(() => setNativeIOS(isNativeIOS()), []);

  const shareScore = () => {
    const us = usTotal(rounds);
    const them = themTotal(rounds);
    Share.share({
      title: "BirdScore",
      text: `${settings.usTeamName} ${us} – ${them} ${settings.themTeamName}. ${
        winner ? teamLabel(winner, settings) : "Nobody"
      } wins!`,
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 text-center lg:max-w-lg lg:py-14">
      <div>
        <div className="flex items-center justify-between">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">Game Over</p>
          <MainMenu onNewGame={onNewGame} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} onOpenResources={onOpenResources} />
        </div>
        <h1 className="mt-1 font-display text-5xl font-semibold text-parchment lg:text-6xl">
          {winner && teamLabel(winner, settings)} wins
        </h1>
        <p className="mt-3 font-body text-sm text-parchment/75">
          Nicely played — here&rsquo;s the final tally.
          {entitled && syncStatus === "synced" && " Saved to your history."}
          {entitled && syncStatus === "syncing" && " Saving\u2026"}
          {/* Previously said nothing at all here on failure \u2014 silence read as
              "nothing to report" rather than "this didn't save," exactly
              the wrong impression to leave right when a finished game is
              most at risk of being lost (offline, connection drop). */}
          {entitled && syncStatus === "error" && (
            <span className="text-trump-red">
              {" "}
              Couldn&rsquo;t save \u2014 will retry once you&rsquo;re back online.
            </span>
          )}
        </p>

        <div className="mt-8">
          <ScoreTotals
            us={usTotal(rounds)}
            them={themTotal(rounds)}
            usLabel={settings.usTeamName}
            themLabel={settings.themTeamName}
            gameOver
          />
        </div>
      </div>

      <div className="mt-8 h-64 text-left lg:h-80">
        <Scoreboard
          rounds={rounds}
          usTotal={usTotal(rounds)}
          themTotal={themTotal(rounds)}
          usLabel={settings.usTeamName}
          themLabel={settings.themTeamName}
          settings={settings}
          onUpdateRound={updateRound}
          onDeleteRound={deleteRound}
          readOnly
          hideTotals
          showDealerRook={canUseEnhancedStats(tier) && settings.players !== null}
        />
      </div>

      {/* refreshingProfile guards against the exact bug report this fixed:
          right after signing back in, `tier` briefly sits at its previous
          value (often the "free" default from signOut) until
          refreshProfile() actually resolves. A completed, already-synced
          game reopening straight to this screen on reload could render
          in that gap and falsely offer to save/upgrade a game that was
          never actually at risk. */}
      {!entitled && !refreshingProfile && (
        <div className="mt-6 text-left">
          <SaveGamePrompt settings={settings} rounds={rounds} winner={winner} />
        </div>
      )}

      {nativeIOS && (
        <button
          onClick={shareScore}
          className="mt-6 w-full rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-parchment ring-1 ring-parchment/30"
        >
          Share Score
        </button>
      )}

      <button
        onClick={onNewGame}
        className="mt-8 w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink shadow-card"
      >
        New Game
      </button>
    </div>
  );
}
