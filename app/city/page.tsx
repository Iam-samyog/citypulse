import Link from "next/link";

export default function CityPage() {
  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#0e0b08]">
      <iframe
        src="/ithaca-odysseus-city.html"
        title="Ithaca in the Age of Odysseus — interactive 3D city"
        className="absolute inset-0 h-full w-full border-0"
        allow="fullscreen"
      />

      <Link
        href="/dashboard"
        className="absolute left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-[#d6a35c]/45 bg-[#140e0a]/80 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[.17em] text-[#e8c48a] shadow-2xl backdrop-blur-md transition hover:border-[#e8c48a]/80 hover:bg-[#24170e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8c48a]"
      >
        <span aria-hidden="true">←</span>
        Dashboard
      </Link>
    </main>
  );
}
