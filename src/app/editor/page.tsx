"use client";

import { useState } from "react";

import { Menu, Settings, X } from "lucide-react";

import MindMapCanvas from "@/components/mindmap/MindMapCanvas";

import NodeProperties from "@/components/mindmap/NodeProperties";

import MapTree from "@/components/sidebar/MapTree";

import MapBackup from "@/components/mindmap/MapBackup";

import { useMindMapStore } from "@/stores/mindmap-store";

type MobilePanel = "map" | "properties" | null;

export default function EditorPage() {
  const [mobilePanel, setMobilePanel] =
    useState<MobilePanel>(null);

  const selectedNodeId = useMindMapStore(
    (state) => state.selectedNodeId
  );

  const addChild = useMindMapStore(
    (state) => state.addChild
  );

  const addParent = useMindMapStore(
    (state) => state.addParent
  );

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#FAF7FF] text-[#3F3545]">
      {/* ========================= */}
      {/* DESKTOP */}
      {/* ========================= */}

      <div className="hidden h-full md:flex">

        {/* LEFT SIDEBAR */}

        <aside className="flex w-72 shrink-0 flex-col border-r border-[#E7DDF0] bg-white">

          <div className="border-b border-[#E7DDF0] px-5 py-4">
            <h1 className="text-lg font-semibold text-[#6F527F]">
              Riri's Mind Map
            </h1>

            <p className="mt-1 text-xs text-[#887B91]">
              For you review, FIGHTING!
            </p>
          </div>

          <div className="border-b border-[#E7DDF0] p-4">

            <MapBackup />

            <div className="mt-3 grid grid-cols-2 gap-2">

              <button
                type="button"
                onClick={() => {
                  if (selectedNodeId) {
                    addParent(selectedNodeId);
                  }
                }}
                disabled={!selectedNodeId}
                className="rounded-lg border border-[#DCCBE8] bg-[#FAF7FF] px-3 py-2.5 text-sm font-medium text-[#6F527F] hover:bg-[#F1EAFB] disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Parent
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedNodeId) {
                    addChild(selectedNodeId);
                  }
                }}
                disabled={!selectedNodeId}
                className="rounded-lg bg-[#9B7EBD] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#6F527F] disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Child
              </button>

            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">

            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#887B91]">
              Map Outline
            </p>

            <MapTree />

          </div>
        </aside>

        {/* CANVAS */}

        <section className="min-w-0 flex-1 bg-[#F8F4FC]">
          <MindMapCanvas />
        </section>

        {/* PROPERTIES */}

        <NodeProperties />

      </div>

      {/* ========================= */}
      {/* MOBILE */}
      {/* ========================= */}

      <div className="flex h-full flex-col md:hidden">

        {/* MOBILE HEADER */}

        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E7DDF0] bg-white px-3">

          <button
            type="button"
            onClick={() => {
              setMobilePanel("map");
            }}
            className="rounded-lg p-2 text-[#6F527F] hover:bg-[#F1EAFB]"
            aria-label="Open map"
          >
            <Menu size={21} />
          </button>

          <h1 className="text-sm font-semibold text-[#6F527F]">
            Riri's Mind Map
          </h1>

          <button
            type="button"
            onClick={() => {
              setMobilePanel("properties");
            }}
            className="rounded-lg p-2 text-[#6F527F] hover:bg-[#F1EAFB]"
            aria-label="Open properties"
          >
            <Settings size={19} />
          </button>

        </header>

        {/* MOBILE CANVAS */}

        <section className="min-h-0 flex-1 bg-[#F8F4FC]">
          <MindMapCanvas />
        </section>

      </div>

      {/* ========================= */}
      {/* MOBILE MAP DRAWER */}
      {/* ========================= */}

      {mobilePanel === "map" && (

        <div className="fixed inset-0 z-50 md:hidden">

          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Close map"
            onClick={() => {
              setMobilePanel(null);
            }}
            className="absolute inset-0 bg-[#3F3545]/20"
          />

          {/* PANEL */}

          <aside className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-[#E7DDF0] px-5 py-4">

              <div>

                <h2 className="font-semibold text-[#6F527F]">
                  Map Outline
                </h2>

                <p className="mt-1 text-xs text-[#887B91]">
                  Select a node
                </p>

              </div>

              <button
                type="button"
                onClick={() => {
                  setMobilePanel(null);
                }}
                className="rounded-lg p-2 text-[#887B91] hover:bg-[#F1EAFB]"
                aria-label="Close map"
              >
                <X size={18} />
              </button>

            </div>

            <div className="border-b border-[#E7DDF0] p-4">

              <MapBackup />

              <div className="mt-3 grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={() => {
                    if (selectedNodeId) {
                      addParent(selectedNodeId);
                    }
                  }}
                  disabled={!selectedNodeId}
                  className="rounded-lg border border-[#DCCBE8] bg-[#FAF7FF] px-3 py-2.5 text-sm font-medium text-[#6F527F] hover:bg-[#F1EAFB] disabled:opacity-40"
                >
                  + Parent
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedNodeId) {
                      addChild(selectedNodeId);
                    }
                  }}
                  disabled={!selectedNodeId}
                  className="rounded-lg bg-[#9B7EBD] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#6F527F] disabled:opacity-40"
                >
                  + Child
                </button>

              </div>

            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">

              <MapTree />

            </div>

          </aside>

        </div>
      )}

      {/* ========================= */}
      {/* MOBILE PROPERTIES */}
      {/* ========================= */}

      {mobilePanel === "properties" && (

        <div className="fixed inset-0 z-50 md:hidden">

          <button
            type="button"
            aria-label="Close properties"
            onClick={() => {
              setMobilePanel(null);
            }}
            className="absolute inset-0 bg-[#3F3545]/20"
          />

          <aside className="absolute inset-y-0 right-0 w-[92%] max-w-sm bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-[#E7DDF0] px-5 py-4">

              <h2 className="font-semibold text-[#6F527F]">
                Properties
              </h2>

              <button
                type="button"
                onClick={() => {
                  setMobilePanel(null);
                }}
                className="rounded-lg p-2 text-[#887B91] hover:bg-[#F1EAFB]"
                aria-label="Close properties"
              >
                <X size={18} />
              </button>

            </div>

            <div className="h-[calc(100%-73px)] overflow-y-auto">

              <NodeProperties />

            </div>

          </aside>

        </div>
      )}

    </main>
  );
}