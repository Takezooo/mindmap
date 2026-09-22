import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
        <Link href="/editor"
              className="px-4 py-2 rounded bg-black text-white"
        >
          Open Mind Map
        </Link>
    </main>
  );
}