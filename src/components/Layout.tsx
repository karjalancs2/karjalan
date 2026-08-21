import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { KarjalanMark } from "./KarjalanMark";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans flex flex-col selection:bg-red-900/30">
      <Navbar />
      <main className="flex-1 flex flex-col relative z-0">{children}</main>
      <footer className="border-t border-neutral-900 bg-black py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-6">
          <div className="text-2xl font-bold tracking-widest text-neutral-500 flex items-center gap-3">
            <KarjalanMark className="w-8 h-8 opacity-50 grayscale" />
            KARJALAN
          </div>
          <p className="text-neutral-600 text-sm">
            Suomalaisen CS2-kilpapelaamisen koti.
          </p>
          <div className="flex gap-4">
            <a
              href="https://discord.gg/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-white transition-colors text-sm"
            >
              Discord
            </a>
            <a
              href="https://x.com/Karjalancs2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-white transition-colors text-sm"
            >
              X
            </a>
            <a
              href="https://www.twitch.tv/karjalancs2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-white transition-colors text-sm"
            >
              Twitch
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
