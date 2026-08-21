import { useEffect, useRef } from "react";
import { useTranslation } from "../contexts/TranslationContext";

const TWITCH_CHANNEL = "karjalancs2";

export default function Watch() {
  const { language } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Twitch embed script if not already loaded
    if (!(window as any).Twitch) {
      const script = document.createElement("script");
      script.src = "https://embed.twitch.tv/embed.js";
      script.async = true;
      document.body.appendChild(script);
    } else if ((window as any).Twitch?.Embed) {
      // If Twitch library is already loaded, initialize the embed
      (window as any).Twitch.Embed.initialize();
    }
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8 uppercase">
        {language === "fi" ? "KATSO LIVE" : "WATCH LIVE"}
      </h1>

      {/* Twitch Player */}
      <div
        ref={containerRef}
        className="w-full mb-8 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800"
      >
        <div
          id="twitch-embed"
          data-channel={TWITCH_CHANNEL}
          data-theme="dark"
          className="w-full"
        ></div>
      </div>

      {/* Fallback or additional info */}
      <div className="w-full flex flex-col gap-4">
        <a
          href={`https://www.twitch.tv/${TWITCH_CHANNEL}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
        >
          {language === "fi" ? "Avaa Twitchissä" : "Open on Twitch"}
        </a>
        <p className="text-neutral-400 text-center">
          {language === "fi"
            ? "Seuraa Karjalania Twitchissä saadaksesi ilmoitukset kun lähetykset alkavat."
            : "Follow Karjalan on Twitch to get notified when streams go live."}
        </p>
      </div>
    </div>
  );
}
