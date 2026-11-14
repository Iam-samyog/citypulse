import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="uppercase tracking-widest text-gold text-sm mb-4">
        An AI-Powered Urban Infrastructure Digital Twin
      </p>
      <h1 className="font-serif text-5xl md:text-7xl mb-6">
        CITYPULSE
        <span className="block text-2xl md:text-3xl text-gold mt-2">
          The Odyssey of a City
        </span>
      </h1>
      <p className="max-w-xl text-ivory/80 mb-10">
        Every city has an Odyssey. Every failure is a trial. Every recovery is
        a return.
      </p>
      <Link
        href="/city"
        className="border border-gold px-8 py-3 uppercase tracking-wide text-sm hover:bg-gold hover:text-aegean transition-colors"
      >
        Enter Ithaca
      </Link>
    </main>
  );
}
