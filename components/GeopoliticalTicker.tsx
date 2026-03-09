"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Settings2, TrendingUp, Globe, Activity, Newspaper, ShieldAlert } from "lucide-react";

// Placeholder data while loading live feeds
const initialFeeds = {
  breaking: ["🚨 LOADING: Fetching the latest breaking news..."],
  finance: ["📈 LOADING: Fetching the latest market updates..."],
  geopolitics: ["🌐 LOADING: Scanning global intelligence streams..."],
  health: ["🏥 LOADING: Retrieving global health updates..."]
};

const speeds = {
  slow: 60,
  normal: 40,
  fast: 20
};

export default function GeopoliticalTicker() {
  const [activeFeed, setActiveFeed] = useState<keyof typeof initialFeeds>("geopolitics");
  const [speed, setSpeed] = useState<keyof typeof speeds>("normal");
  const [showControls, setShowControls] = useState(false);
  const [feedsData, setFeedsData] = useState(initialFeeds);

  useEffect(() => {
    async function fetchFeeds() {
      try {
        const res = await fetch('/api/ticker');
        if (res.ok) {
          const data = await res.json();
          setFeedsData(data);
        }
      } catch (error) {
        console.error("Failed to fetch live feeds:", error);
      }
    }
    fetchFeeds();

    // Refresh feeds every 30 minutes
    const interval = setInterval(fetchFeeds, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Grab the currently selected array of alerts
  const currentAlerts = feedsData[activeFeed];

  // Triplicate the array for seamless infinite scrolling in the marquee
  const tickerContent = [...currentAlerts, ...currentAlerts, ...currentAlerts];

  return (
    <div className="sticky top-0 md:fixed md:top-auto md:bottom-0 left-0 w-full z-[100] font-sans">
      {/* Controls Panel (Expandable Settings Menu) */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full md:top-auto md:bottom-full left-0 w-full bg-[#050505]/95 backdrop-blur-xl border-b md:border-b-0 md:border-t border-red-900/50 p-3 shadow-[0_10px_30px_rgba(220,38,38,0.15)] md:shadow-[0_-10px_30px_rgba(220,38,38,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
        >
          {/* Feed Selection Buttons */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <span className="text-gray-500 text-xs font-inter uppercase tracking-widest font-bold hidden md:inline-block">Feed Select:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveFeed('breaking')}
                className={`px-3 py-1.5 text-xs font-inter rounded-md flex items-center gap-2 transition-all ${activeFeed === 'breaking' ? 'bg-red-900/40 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-transparent'}`}
              >
                <Newspaper size={14} /> Breaking News
              </button>
              <button
                onClick={() => setActiveFeed('finance')}
                className={`px-3 py-1.5 text-xs font-inter rounded-md flex items-center gap-2 transition-all ${activeFeed === 'finance' ? 'bg-red-900/40 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-transparent'}`}
              >
                <TrendingUp size={14} /> Finance
              </button>
              <button
                onClick={() => setActiveFeed('geopolitics')}
                className={`px-3 py-1.5 text-xs font-inter rounded-md flex items-center gap-2 transition-all ${activeFeed === 'geopolitics' ? 'bg-red-900/40 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-transparent'}`}
              >
                <ShieldAlert size={14} /> Geo-Politics
              </button>
              <button
                onClick={() => setActiveFeed('health')}
                className={`px-3 py-1.5 text-xs font-inter rounded-md flex items-center gap-2 transition-all ${activeFeed === 'health' ? 'bg-red-900/40 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-transparent'}`}
              >
                <Activity size={14} /> Health & Science
              </button>
            </div>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs font-inter uppercase tracking-widest font-bold hidden md:inline-block">Speed:</span>
            <div className="flex items-center bg-white/5 rounded-md p-1 border border-white/10">
              <button onClick={() => setSpeed('slow')} className={`px-4 py-1.5 text-xs font-inter rounded transition-colors ${speed === 'slow' ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>Slow</button>
              <button onClick={() => setSpeed('normal')} className={`px-4 py-1.5 text-xs font-inter rounded transition-colors ${speed === 'normal' ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>Normal</button>
              <button onClick={() => setSpeed('fast')} className={`px-4 py-1.5 text-xs font-inter rounded transition-colors ${speed === 'fast' ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>Fast</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Ticker Bar */}
      <div className="bg-[#050505]/95 backdrop-blur-md border-b md:border-b-0 md:border-t border-red-900/50 text-white shadow-[0_5px_25px_-5px_rgba(220,38,38,0.3)] md:shadow-[0_-5px_25px_-5px_rgba(220,38,38,0.3)]">
        <div className="flex items-center">

          {/* Controls Toggle Button */}
          <button
            onClick={() => setShowControls(!showControls)}
            className={`flex-shrink-0 z-20 px-4 py-2 md:py-3 transition-colors border-r border-red-500/30 flex items-center justify-center cursor-pointer outline-none ${showControls ? 'bg-red-900/20 text-red-400' : 'bg-black text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Ticker Settings"
          >
            <Settings2 size={18} className={`transition-transform duration-300 ${showControls ? 'rotate-90' : 'rotate-0'}`} />
          </button>

          {/* 'LIVE / TBT RADAR' Indicator Badge */}
          <div className="flex-shrink-0 z-10 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-red-600 to-red-900 font-cinzel font-bold text-xs md:text-sm tracking-widest flex items-center space-x-2 border-r border-red-500/30">
            <div className="relative flex h-2 w-2 md:h-3 md:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.8)]"></span>
            </div>
            <span className="hidden md:inline">TBT RADAR</span>
            <span className="inline md:hidden">RADAR</span>
          </div>

          {/* Marquee Scroller Area */}
          <div className="flex-1 overflow-hidden whitespace-nowrap py-2 md:py-3 border-y border-transparent relative">

            {/* Overlay gradients for smooth fade out on the edges of the ticker text */}
            <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>

            {/* 
              We use key={activeFeed + speed} to force framer-motion to remount/restart the animation 
              when the feed category or speed changes.
            */}
            <motion.div
              key={activeFeed + speed}
              className="inline-block"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                repeat: Infinity,
                ease: "linear",
                duration: speeds[speed],
              }}
            >
              {tickerContent.map((alert, index) => (
                <span
                  key={index}
                  className="inline-flex items-center text-xs md:text-sm font-inter tracking-wide text-gray-300 mx-8 md:mx-12"
                >
                  {/* Highlight warning icons or text segments */}
                  {alert.includes("🚨") || alert.includes("⚡") || alert.includes("📉") ? (
                    <span className="text-red-400 font-medium mr-1">{alert}</span>
                  ) : alert.includes("📈") || alert.includes("💰") ? (
                    <span className="text-emerald-400 font-medium mr-1">{alert}</span>
                  ) : (
                    <span>{alert}</span>
                  )}

                  {/* Red Separator dot */}
                  <span className="ml-12 md:ml-20 h-1.5 w-1.5 rounded-full bg-red-900/60 inline-block" />
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
