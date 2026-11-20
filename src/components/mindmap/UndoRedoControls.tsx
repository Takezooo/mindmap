"use client";

import { useStore } from "zustand";
import { Undo2, Redo2 } from "lucide-react";
import { useMindMapStore } from "@/stores/mindmap-store";

export default function UndoRedoControls() {
  const temporalStore = useMindMapStore.temporal;

  const canUndo = useStore(
    temporalStore,
    (state) => state.pastStates.length > 0,
  );

  const canRedo = useStore(
    temporalStore,
    (state) => state.futureStates.length > 0,
  );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => temporalStore.getState().undo()}
        disabled={!canUndo}
        title="Undo (Ctrl+Z / Cmd+Z)"
        aria-label="Undo"
        className="flex flex-1 justify-around items-center rounded-lg border border-[#DCCBE8] bg-[#FAF7FF] px-3 py-2.5 text-sm font-medium text-[#6F527F] hover:bg-[#F1EAFB] items-center"
      >
        <Undo2 size={17} />
        Undo
      </button>

      <button
        type="button"
        onClick={() => temporalStore.getState().redo()}
        disabled={!canRedo}
        title="Redo (Ctrl+Y / Cmd+Y)"
        aria-label="Redo"
        className="flex flex-1 justify-around items-center rounded-lg border border-[#DCCBE8] bg-[#FAF7FF] px-3 py-2.5 text-sm font-medium text-[#6F527F] hover:bg-[#F1EAFB]"
      >
        <Redo2 size={17} />
        Redo
      </button>
    </div>
  );
}
