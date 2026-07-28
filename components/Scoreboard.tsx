"use client";

import { useEffect, useRef, useState } from "react";
import { Round } from "@/lib/rook-engine";
import { ScoreTotals } from "./ScoreTotals";

const TRUMP_DOT: Record<Round["trump"], string> = {
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
  onUpdate,
  onDelete,
}: {
  round: Round;
  readOnly?: boolean;
  onUpdate: (rowId: string, us: number, them: number) => void;
  onDelete: (rowId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [usDraft, setUsDraft] = useState(String(round.usScore));
  const [themDraft, setThemDraft] = useState(String(round.themScore));

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-md bg-white/60 px-2 py-1.5 ring-1 ring-ink/15">
        <span className="w-5 shrink-0 font-score text-xs text-ink/50">{round.round}</span>
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
            className="rounded px-2 py-1 font-body text-xs text-ink/60"
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
            className="rounded bg-ink px-2 py-1 font-body text-xs font-semibold text-parchment"
          >
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/50">
      <span className="w-5 shrink-0 font-score text-xs text-ink/50">{round.round}</span>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TRUMP_DOT[round.trump]}`} />
      <span className="min-w-0 flex-1 truncate font-body text-xs text-ink/60">
        {round.bidTeam} bid {round.bid}
        {round.shootMoon ? " · Moon" : ""}
      </span>
      <span className="w-10 text-right font-score tabular-score text-sm font-semibold text-ink">
        {round.usScore}
      </span>
      <span className="w-10 text-right font-score tabular-score text-sm font-semibold text-ink">
        {round.themScore}
      </span>
      {!readOnly && (
        <span className="ml-1 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:opacity-100 sm:group-hover:opacity-100">
          <button
            onClick={() => setEditing(true)}
            aria-label={`Edit round ${round.round}`}
            className="rounded p-1 text-ink/40 hover:bg-ink/10 hover:text-ink"
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => onDelete(round.rowId)}
            aria-label={`Delete round ${round.round}`}
            className="rounded p-1 text-ink/40 hover:bg-trump-red/10 hover:text-trump-red"
          >
            <TrashIcon />
          </button>
        </span>
      )}
    </li>
  );
}

export function Scoreboard({
  rounds,
  usTotal,
  themTotal,
  onUpdateRound,
  onDeleteRound,
  readOnly,
  onClose,
  hideTotals,
}: {
  rounds: Round[];
  usTotal: number;
  themTotal: number;
  onUpdateRound: (rowId: string, us: number, them: number) => void;
  onDeleteRound: (rowId: string) => void;
  readOnly?: boolean;
  onClose?: () => void;
  hideTotals?: boolean;
}) {
  const listEndRef = useRef<HTMLLIElement>(null);

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
          <ScoreTotals us={usTotal} them={themTotal} />
        </div>
      )}

      <div className="mt-3 flex-1 overflow-y-auto rounded-card bg-parchment-dim p-2 shadow-card">
        {rounds.length === 0 ? (
          <p className="p-3 text-center font-body text-xs text-ink/50">
            No rounds yet — score a round to start the tally.
          </p>
        ) : (
          <ul className="space-y-0.5">
            <li className="flex items-center gap-2 px-2 pb-1 font-body text-[10px] uppercase tracking-wide text-ink/40">
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
                onUpdate={onUpdateRound}
                onDelete={onDeleteRound}
              />
            ))}
            <li ref={listEndRef} aria-hidden />
          </ul>
        )}
      </div>
    </div>
  );
}
