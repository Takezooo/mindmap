import Image from "next/image";
import Link from "next/link";

import hyacinth from "../hyacinth.png";

export default function Home() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#FAF7FF] text-[#3F3545]">
      {/* Soft decorative glow */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#F1EAFB] blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#F7DDE9] blur-3xl"
        aria-hidden="true"
      />

      {/* Centered content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-52 text-center sm:pb-56 md:pb-60">
        <h1 className="text-5xl font-bold tracking-tight text-[#6F527F] sm:text-6xl md:text-7xl">
          Riri's MindMap
        </h1>

        <p className="mt-5 max-w-md text-base leading-7 text-[#887B91] sm:text-lg">
          You got this!
        </p>

        <Link
          href="/editor"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#9B7EBD] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#9B7EBD]/20 transition hover:bg-[#6F527F] hover:shadow-xl"
        >
          Open Mind Map
        </Link>
      </div>

      {/* Bottom-center flower */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 z-10 w-[180px] -translate-x-1/2 sm:w-[220px] md:w-[280px] lg:w-[340px]"
        aria-hidden="true"
      >
        <Image
          src={hyacinth}
          alt=""
          priority
          className="h-auto w-full select-none"
          style={{
            imageRendering: "pixelated",
          }}
        />
      </div>
    </main>
  );
}