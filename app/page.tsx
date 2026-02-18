"use client";

import { useEffect, useRef, useState } from "react";

export default function Page() {
  const [watching, setWatching] = useState<string>("—");
  const [lines, setLines] = useState<string[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [fading, setFading] = useState<boolean>(false);

  const liveLineRef = useRef<string>("");

  useEffect(() => {
    const source = new EventSource("/api/stream");

    source.onmessage = (event) => {
      const msg = event.data as string;

      if (msg.startsWith("WATCHING:")) {
        setWatching(msg.replace("WATCHING:", "").trim());
        return;
      }

      if (msg === "__FADE__") {
        setFading(true);

        setTimeout(() => {
          liveLineRef.current = "";
          setTyping(null);
          setLines([]);
          setFading(false);
        }, 800); // match CSS transition
        return;
      }

      if (msg.startsWith("__TYPING__:")) {
        const parts = msg.split(":");
        const who = parts[1] ?? null;
        const off = parts[2] === "OFF";
        setTyping(off ? null : who);
        return;
      }

      if (msg.startsWith("__LINE_PART__:")) {
        liveLineRef.current = msg.replace("__LINE_PART__:", "");
        setLines((prev) => [...prev]); // trigger render
        return;
      }

      if (msg.startsWith("__LINE_FINAL__:")) {
        const finalLine = msg.replace("__LINE_FINAL__:", "");
        liveLineRef.current = "";
        setTyping(null);
        setLines((prev) => [...prev, finalLine]);
        return;
      }
    };

    return () => source.close();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f8f6] text-[#111] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-sm tracking-wide lowercase opacity-70 mb-10">
          thin walls
        </div>

        <div className="text-xs text-gray-400 mb-8 lowercase">
          watching: {watching}
        </div>

        {/* Conversation container with fade animation */}
        <div
          className={`space-y-3 text-base leading-relaxed transition-opacity duration-700 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {lines.map((l, i) => {
            const isAlt = i % 2 === 1;
            return (
              <div key={i} className={isAlt ? "ml-6 opacity-90" : ""}>
                {l}
              </div>
            );
          })}

          {liveLineRef.current && (
            <div className="opacity-90">
              {liveLineRef.current}
            </div>
          )}

          {typing && (
            <div className="text-sm text-gray-400 mt-4">
              {typing} is typing…
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
