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
	const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);

	const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

	const addChild = useMindMapStore((state) => state.addChild);

	const addParent = useMindMapStore((state) => state.addParent);

	return (
		<main className="h-[100dvh] overflow-hidden bg-[#fffafc] text-[#3f3540]">
			{/* ========================= */}
			{/* DESKTOP */}
			{/* ========================= */}

			<div className="hidden h-full md:flex">
				{/* LEFT SIDEBAR */}

				<aside className="flex w-72 shrink-0 flex-col border-r border-[#eadde4] bg-white">
					<div className="border-b border-[#eadde4] px-5 py-4">
						<h1 className="text-lg font-semibold text-[#8f5f76]">
							Riri's Mind Map
						</h1>

						<p className="mt-1 text-xs text-[#9b8993]">
							For you review, FIGHTING!
						</p>
					</div>

					<div className="border-b border-[#eadde4] p-4">
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
								className="rounded-lg border border-[#d9c4cf] bg-[#fffafc] px-3 py-2.5 text-sm font-medium text-[#8f5f76] hover:bg-[#fdeef3] disabled:cursor-not-allowed disabled:opacity-40"
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
								className="rounded-lg bg-[#c77d9b] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#a85f7d] disabled:cursor-not-allowed disabled:opacity-40"
							>
								+ Child
							</button>
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto p-3">
						<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#a99aa3]">
							Map Outline
						</p>

						<MapTree />
					</div>
				</aside>

				{/* CANVAS */}

				<section className="min-w-0 flex-1 bg-[#fcf7fa]">
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

				<header className="flex h-14 shrink-0 items-center justify-between border-b border-[#eadde4] bg-white px-3">
					<button
						type="button"
						onClick={() => {
							setMobilePanel("map");
						}}
						className="rounded-lg p-2 text-[#8f5f76] hover:bg-[#fdeef3]"
						aria-label="Open map"
					>
						<Menu size={21} />
					</button>

					<h1 className="text-sm font-semibold text-[#8f5f76]">Mind Map</h1>

					<button
						type="button"
						onClick={() => {
							setMobilePanel("properties");
						}}
						className="rounded-lg p-2 text-[#8f5f76] hover:bg-[#fdeef3]"
						aria-label="Open properties"
					>
						<Settings size={19} />
					</button>
				</header>

				{/* MOBILE CANVAS */}

				<section className="min-h-0 flex-1 bg-[#fcf7fa]">
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
						className="absolute inset-0 bg-black/20"
					/>

					{/* PANEL */}

					<aside className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-xl">
						<div className="flex items-center justify-between border-b border-[#eadde4] px-5 py-4">
							<div>
								<h2 className="font-semibold text-[#8f5f76]">Map Outline</h2>

								<p className="mt-1 text-xs text-[#9b8993]">Select a node</p>
							</div>

							<button
								type="button"
								onClick={() => {
									setMobilePanel(null);
								}}
								className="rounded-lg p-2 text-[#9b8993] hover:bg-[#fdeef3]"
								aria-label="Close map"
							>
								<X size={18} />
							</button>
						</div>

						<div className="border-b border-[#eadde4] p-4">
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
									className="rounded-lg border border-[#d9c4cf] bg-[#fffafc] px-3 py-2.5 text-sm font-medium text-[#8f5f76] disabled:opacity-40"
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
									className="rounded-lg bg-[#c77d9b] px-3 py-2.5 text-sm font-medium text-white disabled:opacity-40"
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
						className="absolute inset-0 bg-black/20"
					/>

					<aside className="absolute inset-y-0 right-0 w-[92%] max-w-sm bg-white shadow-xl">
						<div className="flex items-center justify-between border-b border-[#eadde4] px-5 py-4">
							<h2 className="font-semibold text-[#8f5f76]">Properties</h2>

							<button
								type="button"
								onClick={() => {
									setMobilePanel(null);
								}}
								className="rounded-lg p-2 text-[#9b8993] hover:bg-[#fdeef3]"
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
