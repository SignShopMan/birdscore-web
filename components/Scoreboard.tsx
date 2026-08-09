"use client";

import { useEffect, useRef, useState } from "react";
import {
  Round,
  Team,
  TrumpColor,
  GameSettings,
  TRUMP_DOT_CLASS,
  formatScore,
  runningTotals,
} from "@/lib/rook-engine";
import { ScoreTotals } from "./ScoreTotals";
import { EditRoundModal } from "./EditRoundModal";

// A QA report clocked penalty/bonus input at accepting values like
// 999,999,999,999 with no real justification ("house rule" isn't a
// blank check for unbounded numbers). No real Rook adjustment is ever
// going to approach a normal winning score, let alone dwarf it —
// capping well above any realistic winning score catches fat-finger and
// bad-input cases without constraining anything a real house rule needs.
const MAX_ADJUSTMENT_POINTS = 5000;

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

const SEAT_LABELS = ["North", "East", "South", "West"];

function RoundRow({
  round,
  settings,
  readOnly,
  usLabel,
  themLabel,
  runningTotal,
  showDealerRook,
  onUpdate,
  onDelete,
}: {
  round: Round;
  settings: GameSettings;
  readOnly?: boolean;
  usLabel: string;
  themLabel: string;
  // The cumulative total immediately after this round — distinct from
  // round.usScore/themScore (that round's own delta, shown alongside this)
  // and from the game's final total. This is what makes a comeback
  // visible round-by-round instead of only at the very end.
  runningTotal: { usTotal: number; themTotal: number };
  // Dealer/Rook-holder per round — beta feedback was that neither was
  // visible anywhere except the after-the-fact History review
  // (GameDetailModal), not in the live ledger a host actually plays
  // against, and not at all to spectators in /watch. Each caller computes
  // this: the host's own screens gate it behind their current
  // canUseEnhancedStats(tier), same as GameDetailModal already does;
  // /watch has no signed-in viewer to check a tier against, but hosting a
  // realtime game already requires Pro, so it's shown there whenever
  // named players are set, no separate check needed.
  showDealerRook?: boolean;
  onUpdate: (rowId: string, updates: Partial<Round>) => void;
  onDelete: (rowId: string) => void;
}) {
  const [editingRound, setEditingRound] = useState(false);
  const [editingAdj, setEditingAdj] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Team + kind + points, same shape as creation (AdjustmentForm below) —
  // not two independently-free-typed us/them numbers. That older version
  // let an edit save fractional points (creation only ever allowed whole
  // numbers) and let both sides end up nonzero at once, breaking the
  // "one team's score field, the other 0" invariant every other adjustment
  // row in the app relies on.
  const [adjTeam, setAdjTeam] = useState<Team>(round.usScore !== 0 ? "US" : "THEM");
  const [adjKind, setAdjKind] = useState<"penalty" | "bonus">(
    (round.usScore || round.themScore) < 0 ? "penalty" : "bonus"
  );
  const [adjPointsInput, setAdjPointsInput] = useState(
    String(Math.abs(round.usScore || round.themScore))
  );
  const isAdj = round.rowType === "Adj";

  if (editingAdj) {
    const adjPointsValid =
      /^\d+$/.test(adjPointsInput.trim()) &&
      Number(adjPointsInput) > 0 &&
      Number(adjPointsInput) <= MAX_ADJUSTMENT_POINTS;
    const save = () => {
      if (!adjPointsValid) return;
      const signed = adjKind === "penalty" ? -Number(adjPointsInput) : Number(adjPointsInput);
      onUpdate(round.rowId, {
        usScore: adjTeam === "US" ? signed : 0,
        themScore: adjTeam === "THEM" ? signed : 0,
      });
      setEditingAdj(false);
    };
    return (
      <li className="space-y-1.5 rounded-md bg-white/60 px-2 py-1.5 ring-1 ring-ink/15">
        <div className="flex items-center gap-1.5">
          {(["US", "THEM"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAdjTeam(t)}
              className={`min-h-[36px] flex-1 truncate rounded-full px-2 font-body text-xs font-semibold uppercase tracking-wide ${
                adjTeam === t ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
              }`}
            >
              {t === "US" ? usLabel : themLabel}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAdjKind("penalty")}
            className={`min-h-[36px] flex-1 rounded-full px-2 font-body text-xs font-semibold ${
              adjKind === "penalty" ? "bg-trump-red text-white" : "bg-white text-ink ring-1 ring-ink/20"
            }`}
          >
            &minus;
          </button>
          <button
            onClick={() => setAdjKind("bonus")}
            className={`min-h-[36px] flex-1 rounded-full px-2 font-body text-xs font-semibold ${
              adjKind === "bonus" ? "bg-trump-green text-white" : "bg-white text-ink ring-1 ring-ink/20"
            }`}
          >
            +
          </button>
          <input
            value={adjPointsInput}
            onChange={(e) => setAdjPointsInput(e.target.value)}
            inputMode="numeric"
            aria-label="Adjustment points"
            className="w-16 rounded border border-ink/20 bg-white px-1 py-1 text-center font-score tabular-score text-sm text-ink"
          />
          <button
            onClick={() => setEditingAdj(false)}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded px-2 font-body text-xs text-ink/75"
          >
            Cancel
          </button>
          <button
            disabled={!adjPointsValid}
            onClick={save}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded bg-ink px-2 font-body text-xs font-semibold text-paper disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
      <li className="group rounded-md px-2 py-1.5 hover:bg-white/50">
        <div className="flex items-center gap-2">
          <span className="w-5 shrink-0 font-score text-xs text-ink/75">
            {isAdj ? "\u00B1" : round.round}
          </span>
          {isAdj ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-ink" />
          ) : (
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TRUMP_DOT_CLASS[round.trump as TrumpColor]}`} />
          )}
          <span className="min-w-0 flex-1 truncate font-body text-xs text-ink/75">
            {isAdj
              ? round.label || "Adjustment"
              : `${round.bidTeam === "US" ? usLabel : themLabel} bid ${round.bid} \u00B7 ${round.trump}${round.shootMoon ? " \u00B7 Moon" : ""}`}
          </span>
          <span className="w-10 text-right font-score tabular-score text-sm font-semibold text-ink">
            {isAdj && round.usScore === 0 ? "\u2013" : round.usScore}
          </span>
          <span className="w-10 text-right font-score tabular-score text-sm font-semibold text-ink">
            {isAdj && round.themScore === 0 ? "\u2013" : round.themScore}
          </span>
          {!readOnly && (
            <span className="ml-1 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:opacity-100 sm:group-hover:opacity-100">
              <button
                onClick={() => {
                  if (isAdj) {
                    setAdjTeam(round.usScore !== 0 ? "US" : "THEM");
                    setAdjKind((round.usScore || round.themScore) < 0 ? "penalty" : "bonus");
                    setAdjPointsInput(String(Math.abs(round.usScore || round.themScore)));
                    setEditingAdj(true);
                  } else {
                    setEditingRound(true);
                  }
                }}
                aria-label={`Edit ${isAdj ? "adjustment" : `round ${round.round}`}`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-ink/75 hover:bg-ink/10 hover:text-ink"
              >
                <PencilIcon />
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete ${isAdj ? "adjustment" : `round ${round.round}`}`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-ink/75 hover:bg-trump-red/10 hover:text-trump-red"
              >
                <TrashIcon />
              </button>
            </span>
          )}
        </div>
        <p className="pl-7 font-body text-[10px] text-ink/50">
          Total: {formatScore(runningTotal.usTotal, runningTotal.themTotal)}
        </p>
        {showDealerRook && !isAdj && settings.players && round.dealerIndex != null && (
          <p className="pl-7 font-body text-[10px] text-ink/50">
            Dealer: {settings.players[round.dealerIndex]} ({SEAT_LABELS[round.dealerIndex]})
            {round.rookHolderSeat != null && (
              <> &middot; Rook: {settings.players[round.rookHolderSeat]}</>
            )}
          </p>
        )}
        {confirmingDelete && (
          <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md bg-trump-red/10 p-2">
            <p className="font-body text-xs text-ink">
              Delete this {isAdj ? "adjustment" : "round"}? This can&rsquo;t be undone.
            </p>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="min-h-[36px] rounded-full bg-white px-3 font-body text-xs font-semibold text-ink ring-1 ring-ink/20"
              >
                No
              </button>
              <button
                onClick={() => onDelete(round.rowId)}
                className="min-h-[36px] rounded-full bg-trump-red px-3 font-body text-xs font-semibold text-white"
              >
                Yes, delete
              </button>
            </div>
          </div>
        )}
      </li>
      {editingRound && !isAdj && (
        <EditRoundModal
          round={round}
          settings={settings}
          onClose={() => setEditingRound(false)}
          onSave={(updated) => onUpdate(round.rowId, updated)}
        />
      )}
    </>
  );
}

function AdjustmentForm({
  usLabel,
  themLabel,
  onAdd,
  onCancel,
}: {
  usLabel: string;
  themLabel: string;
  onAdd: (team: Team, points: number, label: string) => void;
  onCancel: () => void;
}) {
  const [team, setTeam] = useState<Team>("US");
  const [kind, setKind] = useState<"penalty" | "bonus">("penalty");
  const [pointsInput, setPointsInput] = useState("");
  const [label, setLabel] = useState("");

  const pointsValid =
    /^\d+$/.test(pointsInput.trim()) &&
    Number(pointsInput) > 0 &&
    Number(pointsInput) <= MAX_ADJUSTMENT_POINTS;
  const pointsTooLarge = /^\d+$/.test(pointsInput.trim()) && Number(pointsInput) > MAX_ADJUSTMENT_POINTS;
  const pointsIsZeroOrEmpty = pointsInput.trim() === "" || Number(pointsInput) === 0;

  return (
    <div className="rounded-card bg-paper-dim p-3 ring-1 ring-ink/15">
      <p className="font-body text-[10px] uppercase tracking-wide text-ink/75">
        House-rule adjustment &middot; optional
      </p>
      <p className="mt-0.5 font-body text-[11px] text-ink/75">
        For misdeal, renege, moon bonus, or whatever your table uses. No fixed
        amounts — enter whatever you've agreed on.
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {([
          ["US", usLabel],
          ["THEM", themLabel],
        ] as const).map(([t, name]) => (
          <button
            key={t}
            onClick={() => setTeam(t)}
            className={`truncate rounded-full py-2 font-body text-xs font-semibold uppercase tracking-wide ${
              team === t ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => setKind("penalty")}
          className={`rounded-full py-2 font-body text-xs font-semibold uppercase tracking-wide ${
            kind === "penalty"
              ? "bg-trump-red text-white"
              : "bg-white text-ink ring-1 ring-ink/20"
          }`}
        >
          Penalty &minus;
        </button>
        <button
          onClick={() => setKind("bonus")}
          className={`rounded-full py-2 font-body text-xs font-semibold uppercase tracking-wide ${
            kind === "bonus" ? "bg-trump-green text-white" : "bg-white text-ink ring-1 ring-ink/20"
          }`}
        >
          Bonus +
        </button>
      </div>

      <label htmlFor="adj-points" className="sr-only">
        Adjustment points
      </label>
      <input
        id="adj-points"
        value={pointsInput}
        onChange={(e) => setPointsInput(e.target.value)}
        inputMode="numeric"
        placeholder="Points"
        className="mt-2 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-center font-score tabular-score text-ink"
      />
      {pointsTooLarge && (
        <p className="mt-1 font-body text-xs text-trump-red">
          Keep it under {MAX_ADJUSTMENT_POINTS.toLocaleString()} points.
        </p>
      )}
      {pointsIsZeroOrEmpty && (
        <p className="mt-1 font-body text-xs text-ink/50">Enter how many points, above 0.</p>
      )}
      <label htmlFor="adj-reason" className="sr-only">
        Adjustment reason
      </label>
      <input
        id="adj-reason"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Reason (e.g. Renege, Misdeal)"
        className="mt-2 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-sm text-ink"
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-full py-2.5 font-body text-xs font-semibold uppercase tracking-wide text-ink/75 ring-1 ring-ink/15"
        >
          Cancel
        </button>
        <button
          disabled={!pointsValid}
          onClick={() => {
            const signed = kind === "penalty" ? -Number(pointsInput) : Number(pointsInput);
            onAdd(team, signed, label.trim() || "Adjustment");
          }}
          className="flex-1 rounded-full bg-ink py-2.5 font-body text-xs font-semibold uppercase tracking-wide text-paper disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function Scoreboard({
  rounds,
  usTotal,
  themTotal,
  usLabel = "Us",
  themLabel = "Them",
  settings,
  onUpdateRound,
  onDeleteRound,
  onAddAdjustment,
  readOnly,
  onClose,
  hideTotals,
  showDealerRook,
}: {
  rounds: Round[];
  usTotal: number;
  themTotal: number;
  usLabel?: string;
  themLabel?: string;
  settings: GameSettings;
  onUpdateRound: (rowId: string, updates: Partial<Round>) => void;
  onDeleteRound: (rowId: string) => void;
  onAddAdjustment?: (team: Team, points: number, label: string) => void;
  readOnly?: boolean;
  onClose?: () => void;
  hideTotals?: boolean;
  showDealerRook?: boolean;
}) {
  const listEndRef = useRef<HTMLLIElement>(null);
  const [addingAdjustment, setAddingAdjustment] = useState(false);
  const totalsAfterEachRound = runningTotals(rounds);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [rounds.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-lg font-semibold text-parchment">Scoreboard</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-full bg-parchment/10 px-3 font-body text-xs text-parchment ring-1 ring-parchment/30"
          >
            Close
          </button>
        )}
      </div>

      {!hideTotals && (
        <div className="mt-3">
          <ScoreTotals us={usTotal} them={themTotal} usLabel={usLabel} themLabel={themLabel} />
        </div>
      )}

      <div className="mt-3 flex-1 overflow-y-auto rounded-card bg-paper-dim p-2 shadow-card">
        {rounds.length === 0 ? (
          <p className="p-3 text-center font-body text-xs text-ink/75">
            No rounds yet — score a round to start the tally.
          </p>
        ) : (
          <ul className="space-y-0.5">
            <li className="flex items-center gap-2 px-2 pb-1 font-body text-[10px] uppercase tracking-wide text-ink/75">
              <span className="w-5 shrink-0">#</span>
              <span className="w-2.5 shrink-0" />
              <span className="min-w-0 flex-1">Bid</span>
              <span className="w-10 text-right">Us</span>
              <span className="w-10 text-right">Them</span>
              {!readOnly && <span className="ml-1 w-[92px] shrink-0" />}
            </li>
            {rounds.map((r, i) => (
              <RoundRow
                key={r.rowId}
                round={r}
                settings={settings}
                readOnly={readOnly}
                usLabel={usLabel}
                themLabel={themLabel}
                runningTotal={totalsAfterEachRound[i]}
                showDealerRook={showDealerRook}
                onUpdate={onUpdateRound}
                onDelete={onDeleteRound}
              />
            ))}
            <li ref={listEndRef} aria-hidden />
          </ul>
        )}
      </div>

      {!readOnly && onAddAdjustment && (
        <div className="mt-3">
          {addingAdjustment ? (
            <AdjustmentForm
              usLabel={usLabel}
              themLabel={themLabel}
              onAdd={(team, points, label) => {
                onAddAdjustment(team, points, label);
                setAddingAdjustment(false);
              }}
              onCancel={() => setAddingAdjustment(false)}
            />
          ) : (
            <button
              onClick={() => setAddingAdjustment(true)}
              className="min-h-[44px] w-full rounded-full bg-parchment/10 py-2 font-body text-xs font-semibold uppercase tracking-wide text-parchment ring-1 ring-parchment/20"
            >
              + Penalty / Bonus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
