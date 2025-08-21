/* eslint-disable no-empty */
import { useEffect, useRef, useState } from "react";
// Nutzer lädt eigenes Alert-Audio unter /public/alert.wav hoch

// ====== HOW TO RUN ======
// 1) Vite-React-App:  npm create vite@latest gold-monitor -- --template react
// 2) src/App.jsx ersetzen.
// 3) .env optional: VITE_FINNHUB_TOKEN=DEIN_KEY
// 4) npm i && npm run dev

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Header />
      <div className="px-4 pb-6 max-w-[1400px] mx-auto">
        <ConsentBanner />
        <TickerTape />
        <div className="space-y-6 mt-6">
          <Cards>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">XAUUSD — Live</h2>
              <span className="text-xs opacity-70">Quelle: TradingView Widget</span>
            </div>
            <AdvancedChart symbol="OANDA:XAUUSD" interval="1" />
          </Cards>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Cards>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Preis-Alerts</h3>
                  <span className="text-xs opacity-70">Finnhub WebSocket oder Simulation</span>
                </div>
                <PriceAlerts symbolWS="OANDA:XAU_USD" />
              </Cards>

              <Cards>
                <h3 className="text-lg font-semibold mb-2">Wichtige Termine (Economic Calendar)</h3>
                <EconomicCalendar />
              </Cards>
            </div>

            <div className="space-y-6">
              <Cards>
                <h3 className="text-lg font-semibold mb-2">Schnell-News</h3>
                <NewsTimelines symbol="OANDA:XAUUSD" />
              </Cards>

              <Cards>
                <h3 className="text-lg font-semibold">Marktüberblick</h3>
                <div className="h-[360px]">
                  <MarketOverview />
                </div>
              </Cards>

              <Cards>
                <h3 className="text-lg font-semibold mb-2">Diagnose & Tests</h3>
                <Diagnostics />
              </Cards>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="border-b border-neutral-800">
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-2xl bg-yellow-500/20 flex items-center justify-center">🥇</div>
          <div>
            <h1 className="text-2xl font-bold leading-none">Gold Monitoring</h1>
            <p className="text-xs opacity-70 leading-none mt-1">Realtime Chart · News · Kalender · Alerts</p>
          </div>
        </div>
        <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="text-xs opacity-70 hover:opacity-100">Widgets by TradingView</a>
      </div>
    </div>
  );
}

function Cards({ children }) {
  return <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-3 shadow-inner">{children}</div>;
}

// ========= Consent & Utilities =========
function isExtAllowed() {
  const url = new URLSearchParams(window.location.search);
  if (url.get("ext") === "1") return true;
  try { return localStorage.getItem("EXT_OK") === "1"; } catch { return false; }
}
function setExtAllowed(flag) {
  try { localStorage.setItem("EXT_OK", flag ? "1" : "0"); } catch {}
  window.__EXT_OK = !!flag;
  window.dispatchEvent(new CustomEvent("ext-changed", { detail: !!flag }));
}

function ConsentBanner() {
  const [ok, setOk] = useState(() => isExtAllowed());
  useEffect(() => {
    const h = () => setOk(isExtAllowed());
    window.addEventListener("ext-changed", h);
    return () => window.removeEventListener("ext-changed", h);
  }, []);
  if (ok) return null;
  return (
    <div className="mb-3 rounded-xl border border-amber-700 bg-amber-900/20 p-3 text-sm text-amber-200 flex flex-wrap items-center gap-2">
      <div className="font-semibold">Externe Einbettungen sind deaktiviert.</div>
      <div className="opacity-80">Erlaube Verbindungen zu tradingview-widget.com.</div>
      <button onClick={() => setExtAllowed(true)} className="ml-auto px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-semibold">Externe Inhalte erlauben</button>
    </div>
  );
}

function resolveFinnhubToken() {
  const urlParam = new URLSearchParams(window.location.search).get("finnhub") || "";
  const ls = (typeof localStorage !== "undefined" && localStorage.getItem("FINNHUB_TOKEN")) || "";
  const env = import.meta?.env?.VITE_FINNHUB_TOKEN || "";
  const token = env || urlParam || ls || "";
  const source = token === env && env ? "env" : token === urlParam && urlParam ? "url" : token === ls && ls ? "localStorage" : "none";
  return { token, source };
}

// React 18: Widget nur einmal injizieren
function useOnceWidget(containerRef, src, config, key) {
  const [allowed, setAllowed] = useState(() => isExtAllowed());
  useEffect(() => {
    const h = () => setAllowed(isExtAllowed());
    window.addEventListener("ext-changed", h);
    return () => window.removeEventListener("ext-changed", h);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    if (!window.__WIDGETS_INIT) window.__WIDGETS_INIT = new Set();
    const bag = window.__WIDGETS_INIT;
    if (bag.has(key)) return;
    if (!containerRef.current) return;
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(s);
    bag.add(key);
  }, [containerRef, src, key, JSON.stringify(config), allowed]);
}

function useNotifications() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const perm = supported ? Notification.permission : "unsupported";
  const request = async () => {
    if (!supported) return "unsupported";
    if (Notification.permission === "default") {
      try { return await Notification.requestPermission(); } catch { return "denied"; }
    }
    return Notification.permission;
  };
  return { supported, perm, request };
}

function ExternalPlaceholder({ title, children }) {
  if (isExtAllowed()) return children;
  return (
    <div className="rounded-xl border border-amber-700 bg-amber-900/20 p-3 text-sm text-amber-200 space-y-2">
      <div className="font-semibold">Externe Inhalte blockiert.</div>
      <div className="opacity-80">Erlaube oben im Banner, um {title} zu laden.</div>
      <button onClick={() => setExtAllowed(true)} className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-semibold">Jetzt erlauben</button>
    </div>
  );
}

// ===== TradingView: Ticker Tape =====
// DXY: UUP (ETF). US10Y: IEF (ETF) — Widgets‑kompatible Proxys.
function TickerTape() {
  const ref = useRef(null);
  useOnceWidget(
    ref,
    "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
    {
      symbols: [
        { proName: "OANDA:XAUUSD", title: "Gold" },
        { proName: "OANDA:XAGUSD", title: "Silber" },
        { proName: "AMEX:UUP", title: "Dollar (UUP)" },
        { proName: "AMEX:IEF", title: "US 7‑10Y (IEF)" },
        { proName: "OANDA:EURUSD", title: "EURUSD" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "regular",
      colorTheme: "dark",
    },
    "tv:ticker"
  );
  return (
    <ExternalPlaceholder title="das Tickerband">
      <div ref={ref} className="rounded-xl overflow-hidden border border-neutral-800" />
    </ExternalPlaceholder>
  );
}

// ===== TradingView: Advanced Chart (XAUUSD) =====
function AdvancedChart({ symbol = "OANDA:XAUUSD", interval = "15" }) {
  const ref = useRef(null);
  useOnceWidget(
    ref,
    "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
    {
      autosize: true,
      symbol,
      interval,
      timezone: "Europe/Berlin",
      theme: "dark",
      style: "1",
      locale: "de_DE",
      withdateranges: true,
      allow_symbol_change: false,
      studies: ["STD;EMA@tv-basicstudies", "STD;RSI@tv-basicstudies"],
      hide_side_toolbar: false,
      calendar: false,
    },
    `tv:advanced:${symbol}:${interval}`
  );
  return (
    <ExternalPlaceholder title="den Live-Chart">
      <div ref={ref} style={{ height: 720 }} className="rounded-xl overflow-hidden border border-neutral-800" />
    </ExternalPlaceholder>
  );
}

// ===== TradingView: Economic Calendar =====
function EconomicCalendar() {
  const ref = useRef(null);
  useOnceWidget(
    ref,
    "https://s3.tradingview.com/external-embedding/embed-widget-events.js",
    {
      width: "100%",
      height: 480,
      locale: "de_DE",
      importanceFilter: "-1,0,1,2",
      isTransparent: true,
      colorTheme: "dark",
      timezone: "Europe/Berlin",
    },
    "tv:events"
  );
  return (
    <ExternalPlaceholder title="den Wirtschaftskalender">
      <div ref={ref} className="rounded-xl overflow-hidden border border-neutral-800" />
    </ExternalPlaceholder>
  );
}

// ===== TradingView: Market Overview =====
function MarketOverview() {
  const ref = useRef(null);
  useOnceWidget(
    ref,
    "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js",
    {
      colorTheme: "dark",
      dateRange: "12M",
      showChart: true,
      locale: "de_DE",
      isTransparent: true,
      width: "100%",
      height: "100%",
      tabs: [
        {
          title: "Metalle",
          symbols: [
            { s: "OANDA:XAUUSD", d: "Gold" },
            { s: "OANDA:XAGUSD", d: "Silber" },
            { s: "TVC:PLATINUM", d: "Platin" },
          ],
        },
        {
          title: "Dollar & Zinsen",
          symbols: [
            { s: "AMEX:UUP", d: "Dollar (UUP)" },
            { s: "AMEX:IEF", d: "US 7‑10Y (IEF)" },
            { s: "OANDA:EURUSD", d: "EURUSD" },
          ],
        },
      ],
    },
    "tv:overview"
  );
  return (
    <ExternalPlaceholder title="den Marktüberblick">
      <div ref={ref} className="w-full h-full" />
    </ExternalPlaceholder>
  );
}

// ===== News =====
function NewsTimelines({ symbol = "OANDA:XAUUSD" }) {
  const ref = useRef(null);
  useOnceWidget(
    ref,
    "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js",
    {
      feedMode: "symbol",
      symbol,
      isTransparent: true,
      displayMode: "compact",
      colorTheme: "dark",
      locale: "de_DE",
    },
    `tv:news-${symbol}`
  );
  return (
    <ExternalPlaceholder title="die News-Timeline">
      <div ref={ref} className="rounded-xl overflow-hidden border border-neutral-800" />
    </ExternalPlaceholder>
  );
}
function Timeline() { return null; }

// ===== Alert-Logik =====
function evaluateAlerts(alerts, last) {
  let hitCount = 0;
  const now = Date.now();
  const updated = alerts.map(a => {
    const trigger = !a.done && ((a.dir === ">=" && last >= a.price) || (a.dir === "<=" && last <= a.price));
    if (trigger) { hitCount += 1; return { ...a, done: true, ts: now, last }; }
    return a;
  });
  return { updated, hitCount };
}

// Fallback-Beep (WebAudio) für blockierten <audio>-Play
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    o.start();
    setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2); o.stop(ctx.currentTime + 0.22); }, 180);
  } catch {}
}

// ===== Price Alerts =====
function PriceAlerts({ symbolWS = "OANDA:XAU_USD" }) {
  const { supported: notifSupported, request } = useNotifications();
  const [{ token, source }, setTokenState] = useState(() => resolveFinnhubToken());
  const [last, setLast] = useState(null);
  const [status, setStatus] = useState("idle");
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("xau_alerts") || "[]"); } catch { return []; }
  });
  const [notifMsg, setNotifMsg] = useState("");
  const [soundMsg, setSoundMsg] = useState("");
  const audioRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    if (source === "url" && token) {
      try { localStorage.setItem("FINNHUB_TOKEN", token); } catch {}
      setTokenState(resolveFinnhubToken());
    }
  }, [token, source]);

  useEffect(() => {
    let ws, alive, sim;
    if (token) {
      setStatus("connecting");
      ws = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
      ws.onopen = () => {
        setStatus("connected");
        try { ws.send(JSON.stringify({ type: "subscribe", symbol: symbolWS })); } catch {}
        alive = setInterval(() => { try { ws.send(JSON.stringify({ type: "ping" })); } catch {} }, 25000);
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.data && Array.isArray(msg.data)) {
            const ticks = msg.data.filter(d => typeof d.p === "number");
            if (ticks.length) setLast(ticks[ticks.length - 1].p);
          }
        } catch {}
      };
      ws.onerror = () => setStatus("error");
      ws.onclose = () => setStatus("disconnected");
    } else {
      setStatus("simulated");
      let px = lastRef.current ?? 2400 + Math.random() * 20;
      sim = setInterval(() => { px += (Math.random() - 0.5) * 1.5; lastRef.current = px; setLast(px); }, 1000);
    }
    return () => { try { ws && ws.close(); } catch {} clearInterval(alive); clearInterval(sim); };
  }, [token, symbolWS]);

  useEffect(() => {
    if (last == null) return;
    const { updated, hitCount } = evaluateAlerts(alerts, last);
    if (hitCount > 0) {
      setAlerts(updated);
      localStorage.setItem("xau_alerts", JSON.stringify(updated));
      if (notifSupported && Notification.permission === "granted") {
        try { new Notification("XAUUSD Alert", { body: `${last.toFixed(2)} hat Level getroffen` }); setNotifMsg("gesendet"); } catch { setNotifMsg("fehlgeschlagen"); }
      }
      let ok = false;
      if (audioRef.current) { try { audioRef.current.muted = false; audioRef.current.currentTime = 0; audioRef.current.play(); ok = true; } catch {} }
      if (!ok) playBeep();
      setSoundMsg(ok ? "audio" : "beep");
    }
  }, [last]);

  useEffect(() => { if (notifSupported && Notification.permission === "default") request(); }, [notifSupported, request]);

  const addAlert = async (a) => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const res = await Notification.requestPermission().catch(() => "denied");
      setNotifMsg(res);
    }
    const updated = [...alerts, a];
    setAlerts(updated);
    localStorage.setItem("xau_alerts", JSON.stringify(updated));

    if (last != null) {
      const res = evaluateAlerts(updated, last);
      if (res.hitCount > 0) {
        setAlerts(res.updated);
        localStorage.setItem("xau_alerts", JSON.stringify(res.updated));
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification("XAUUSD Alert", { body: `${last.toFixed(2)} hat Level getroffen` }); setNotifMsg("gesendet"); } catch { setNotifMsg("fehlgeschlagen"); }
        }
        let ok = false;
        if (audioRef.current) { try { audioRef.current.muted = false; audioRef.current.currentTime = 0; audioRef.current.play(); ok = true; } catch {} }
        if (!ok) playBeep();
        setSoundMsg(ok ? "audio" : "beep");
      }
    }
  };

  const resetAlerts = () => { setAlerts([]); localStorage.setItem("xau_alerts", "[]"); };
  const toggle = (i) => {
    const updated = alerts.map((a, idx) => idx === i ? { ...a, done: !a.done } : a);
    setAlerts(updated);
    localStorage.setItem("xau_alerts", JSON.stringify(updated));
  };
  const remove = (i) => {
    const updated = alerts.filter((_, idx) => idx !== i);
    setAlerts(updated);
    localStorage.setItem("xau_alerts", JSON.stringify(updated));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Letzter Tick: {last ? last.toFixed(2) : "—"}</div>
        <div className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Status: {status}</div>
        <div className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Token-Quelle: {token ? source : "keine"}</div>
        <div className="text-xs opacity-70">Notif: {notifMsg || "-"}</div>
        <div className="text-xs opacity-70">Sound: {soundMsg || "-"}</div>
      </div>

      {/* Test-Buttons */}
      <div className="flex gap-3 text-xs">
        <button
          onClick={async () => {
            if (typeof Notification === "undefined") { setNotifMsg("nicht verfügbar"); return; }
            if (Notification.permission === "default") {
              const r = await Notification.requestPermission().catch(() => "denied");
              setNotifMsg(r);
              if (r !== "granted") return;
            }
            try { new Notification("Test-Notification", { body: "OK" }); setNotifMsg("gesendet"); } catch { setNotifMsg("fehlgeschlagen"); }
          }}
          className="underline opacity-80 hover:opacity-100"
        >
          Test‑Notification
        </button>
        <button
          onClick={() => {
            let ok = false;
            if (audioRef.current) { try { audioRef.current.muted = false; audioRef.current.currentTime = 0; audioRef.current.play(); ok = true; } catch {} }
            if (!ok) playBeep();
            setSoundMsg(ok ? "audio" : "beep");
          }}
          className="underline opacity-80 hover:opacity-100"
        >
          Test‑Sound
        </button>
      </div>

      {!token && <TokenSetup onSaved={() => setTokenState(resolveFinnhubToken())} />}

        <AlertForm onAdd={addAlert} />
        <AlertList alerts={alerts} onToggle={toggle} onRemove={remove} onReset={resetAlerts} />
        <audio
          ref={audioRef}
          src="/alert.wav"
          preload="auto"
        />
    </div>
  );
}

function TokenSetup({ onSaved }) {
  const [val, setVal] = useState("");
  return (
    <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-700 text-amber-200 text-sm space-y-2">
      <div className="font-semibold">Kein Finnhub Token gesetzt.</div>
      <div>Optionen: .env (<span className="font-mono">VITE_FINNHUB_TOKEN</span>), URL-Parameter <span className="font-mono">?finnhub=...</span> oder hier speichern.</div>
      <form onSubmit={(e) => { e.preventDefault(); try { localStorage.setItem("FINNHUB_TOKEN", val.trim()); } catch {} onSaved?.(); }} className="flex flex-wrap items-end gap-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Finnhub API Key" className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 min-w-[260px]" />
        <button className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-semibold">Key speichern</button>
      </form>
    </div>
  );
}

function AlertForm({ onAdd }) {
  const [price, setPrice] = useState(0);
  const [dir, setDir] = useState(">=");
  const [note, setNote] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const p = Number(price);
        if (!isFinite(p) || p <= 0) return;
        onAdd({ price: p, dir, note, done: false, ts: Date.now() });
        setNote("");
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex items-center gap-2">
        <select value={dir} onChange={(e) => setDir(e.target.value)} className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1">
          <option>{">="}</option>
          <option>{"<="}</option>
        </select>
        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preis" className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 w-32" />
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 flex-1 min-w-[200px]" />
      <button className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-semibold">Alert hinzufügen</button>
    </form>
  );
}

function AlertList({ alerts, onToggle, onRemove, onReset }) {
  if (!alerts.length) return <div className="text-sm opacity-70">Keine Alerts gesetzt.</div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm opacity-70">Gespeichert im Browser (localStorage)</div>
        <button onClick={onReset} className="text-xs opacity-70 hover:opacity-100 underline">Alle löschen</button>
      </div>
      <ul className="divide-y divide-neutral-800">
        {alerts.map((a, i) => (
          <li key={i} className="py-2 flex items-center gap-3">
            <input type="checkbox" checked={!!a.done} onChange={() => onToggle(i)} />
            <div className="text-sm">
              {a.dir} <span className="font-mono">{a.price.toFixed(2)}</span> <span className="opacity-60">{a.note}</span>
            </div>
            {a.ts && (
              <div className="ml-auto text-xs opacity-60">
                {new Date(a.ts).toLocaleString()} @ {a.last?.toFixed(2)}
              </div>
            )}
            <button onClick={() => onRemove(i)} className="text-xs opacity-70 hover:opacity-100 ml-2">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ===== Diagnostics =====
function Diagnostics() {
  const { token, source } = resolveFinnhubToken();
  const envReadable = typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined";
  const tests = [
    { name: "ENV-Objekt vorhanden", run: () => envReadable, expect: true },
    { name: "Token-Auflösung", run: () => (["none", ""].includes(source) ? false : true), expect: true },
    { name: "Notification unterstützt", run: () => (typeof window !== "undefined" && "Notification" in window) ? true : false, expect: true },
    { name: "Consent gespeichert", run: () => isExtAllowed(), expect: true },
    { name: "useOnceWidget definiert", run: () => typeof useOnceWidget === "function", expect: true },
    { name: "Alert-Logik markiert Treffer", run: () => { const sample = [{ price: 2400, dir: ">=", done: false }, { price: 2300, dir: "<=", done: false }]; const { hitCount } = evaluateAlerts(sample, 2401); return hitCount >= 1; }, expect: true },
  ];
  return (
    <div className="text-sm space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Info label="Finnhub Token">{token ? `${source}` : "nicht gesetzt"}</Info>
        <Info label="ENV verfügbar">{envReadable ? "ja" : "nein"}</Info>
      </div>
      <div className="mt-2">
        <div className="font-semibold mb-1">Selbsttests</div>
        <ul className="divide-y divide-neutral-800">
          {tests.map((t, i) => {
            const res = safeRun(t.run);
            const ok = res === t.expect;
            return (
              <li key={i} className="py-2 flex items-center justify-between">
                <span>{t.name}</span>
                <span className={ok ? "text-green-400" : "text-red-400"}>{ok ? "OK" : "FEHLER"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
function Info({ label, children }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-2">
      <div className="opacity-70 text-xs">{label}</div>
      <div className="mt-1 font-mono break-all">{children}</div>
    </div>
  );
}
function safeRun(fn) { try { return fn(); } catch { return "error"; } }
