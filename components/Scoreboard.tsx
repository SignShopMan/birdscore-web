"use client";

import { useEffect, useRef, useState } from "react";
import { Round, Team, TrumpColor } from "@/lib/rook-engine";
import { ScoreTotals } from "./ScoreTotals";
import { InviteCard } from "./InviteCard";

const TRUMP_DOT: Record<TrumpColor, string> = {
  Black: "bg-trump-black",
  Green: "bg-trump-green",
  Red: "bg-trump-red",
  Yellow: "bg-trump-yellow",
};

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

function RoundRow({
  round,
  readOnly,
  usLabel,
  themLabel,
  onUpdate,
  onDelete,
}: {
  round: Round;
  readOnly?: boolean;
  usLabel: string;
  themLabel: string;
  onUpdate: (rowId: string, us: number, them: number) => void;
  onDelete: (rowId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [usDraft, setUsDraft] = useState(String(round.usScore));
  const [themDraft, setThemDraft] = useState(String(round.themScore));
  const isAdj = round.rowType === "Adj";

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-md bg-white/60 px-2 py-1.5 ring-1 ring-ink/15">
        <span className="w-5 shrink-0 font-score text-xs text-ink/75">
          {isAdj ? "\u00B1" : round.round}
        </span>
        <input
          value={usDraft}
          onChange={(e) => setUsDraft(e.target.value)}
          inputMode="numeric"
          className="w-14 rounded border border-ink/20 bg-white px-1 py-0.5 text-center font-score tabular-score text-sm text-ink"
        />
        <input
          value={themDraft}
          onChange={(e) => setThemDraft(e.target.value)}
          inputMode="numeric"
          className="w-14 rounded border border-ink/20 bg-white px-1 py-0.5 text-center font-score tabular-score text-sm text-ink"
        />
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setEditing(false)}
            className="rounded px-2 py-1 font-body text-xs text-ink/75"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const us = Number(usDraft);
              const them = Number(themDraft);
              if (Number.isFinite(us) && Number.isFinite(them)) onUpdate(round.rowId, us, them);
              setEditing(false);
            }}
            className="rounded bg-ink px-2 py-1 font-body text-xs font-semibold text-paper"
          >
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/50">
      <span className="w-5 shrink-0 font-score text-xs text-ink/75">
        {isAdj ? "\u00B1" : round.round}
      </span>
      {isAdj ? (
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-ink" />
      ) : (
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TRUMP_DOT[round.trump as TrumpColor]}`} />
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
        <span className="ml-1 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:opacity-100 sm:group-hover:opacity-100">
          <button
            onClick={() => setEditing(true)}
            aria-label={`Edit ${isAdj ? "adjustment" : `round ${round.round}`}`}
            className="rounded p-1 text-ink/75 hover:bg-ink/10 hover:text-ink"
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => onDelete(round.rowId)}
            aria-label={`Delete ${isAdj ? "adjustment" : `round ${round.round}`}`}
            className="rounded p-1 text-ink/75 hover:bg-trump-red/10 hover:text-trump-red"
          >
            <TrashIcon />
          </button>
        </span>
      )}
    </li>
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

  const pointsValid = /^\d+$/.test(pointsInput.trim()) && Number(pointsInput) > 0;

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
            className={`truncate rounded-full py-1.5 font-body text-xs font-semibold uppercase tracking-wide ${
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
          className={`rounded-full py-1.5 font-body text-xs font-semibold uppercase tracking-wide ${
            kind === "penalty"
              ? "bg-trump-red text-white"
              : "bg-white text-ink ring-1 ring-ink/20"
          }`}
        >
          Penalty &minus;
        </button>
        <button
          onClick={() => setKind("bonus")}
          className={`rounded-full py-1.5 font-body text-xs font-semibold uppercase tracking-wide ${
            kind === "bonus" ? "bg-trump-green text-white" : "bg-white text-ink ring-1 ring-ink/20"
          }`}
        >
          Bonus +
        </button>
      </div>

      <input
        value={pointsInput}
        onChange={(e) => setPointsInput(e.target.value)}
        inputMode="numeric"
        placeholder="Points"
        className="mt-2 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-center font-score tabular-score text-ink"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Reason (e.g. Renege, Misdeal)"
        className="mt-2 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-sm text-ink"
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-full py-2 font-body text-xs font-semibold uppercase tracking-wide text-ink/75 ring-1 ring-ink/15"
        >
          Cancel
        </button>
        <button
          disabled={!pointsValid}
          onClick={() => {
            const signed = kind === "penalty" ? -Number(pointsInput) : Number(pointsInput);
            onAdd(team, signed, label.trim() || "Adjustment");
          }}
          className="flex-1 rounded-full bg-ink py-2 font-body text-xs font-semibold uppercase tracking-wide text-paper disabled:opacity-40"
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
  onUpdateRound,
  onDeleteRound,
  onAddAdjustment,
  readOnly,
  onClose,
  hideTotals,
  joinCode,
}: {
  rounds: Round[];
  usTotal: number;
  themTotal: number;
  usLabel?: string;
  themLabel?: string;
  onUpdateRound: (rowId: string, us: number, them: number) => void;
  onDeleteRound: (rowId: string) => void;
  onAddAdjustment?: (team: Team, points: number, label: string) => void;
  readOnly?: boolean;
  onClose?: () => void;
  hideTotals?: boolean;
  joinCode?: string | null;
}) {
  const listEndRef = useRef<HTMLLIElement>(null);
  const [addingAdjustment, setAddingAdjustment] = useState(false);

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
            className="rounded-full bg-parchment/10 px-3 py-1 font-body text-xs text-parchment ring-1 ring-parchment/30"
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

      {!readOnly && joinCode && (
        <div className="mt-3">
          <InviteCard joinCode={joinCode} />
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
              {!readOnly && <span className="ml-1 w-[52px] shrink-0" />}
            </li>
            {rounds.map((r) => (
              <RoundRow
                key={r.rowId}
                round={r}
                readOnly={readOnly}
                usLabel={usLabel}
                themLabel={themLabel}
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
              className="w-full rounded-full bg-parchment/10 py-2 font-body text-xs font-semibold uppercase tracking-wide text-parchment ring-1 ring-parchment/20"
            >
              + Penalty / Bonus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
