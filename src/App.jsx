import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Calculator, Clock, X, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";

/* ------------------------------------------------------------------ */
/* 간단 예시용 DB (나중에 구글시트/실제 데이터로 교체할 수 있음)       */
/* ------------------------------------------------------------------ */

const DB = {
  items: [
    { id: "I001", name: "투구 민첩 주문서 60%" },
    { id: "I002", name: "피나카" },
  ],
  monsters: {
    M001: { id: "M001", name: "마스터 크로노스", level: 63, hp: 2600, xp: 115 },
    M002: { id: "M002", name: "다크 크로노스", level: 65, hp: 3000, xp: 140 },
    M003: { id: "M003", name: "스퀴드", level: 70, hp: 3500, xp: 220 },
    M004: { id: "M004", name: "리셀 스퀴드", level: 72, hp: 4200, xp: 260 },
  },
  maps: {
    A001: { id: "A001", name: "시간의길 4", region: "루디브리엄" },
    A002: { id: "A002", name: "시간의길 5", region: "루디브리엄" },
    A003: { id: "A003", name: "위험한 바다 협곡", region: "아쿠아리움" },
  },
  // 맵별 몬스터 스폰 정보
  mapMonster: [
    // 시간의길 4
    { mapId: "A001", monsterId: "M001", spawnCount: 16 },
    { mapId: "A001", monsterId: "M002", spawnCount: 4 },
    // 시간의길 5
    { mapId: "A002", monsterId: "M001", spawnCount: 10 },
    { mapId: "A002", monsterId: "M002", spawnCount: 10 },
    // 위험한 바다 협곡
    { mapId: "A003", monsterId: "M003", spawnCount: 4 },
    { mapId: "A003", monsterId: "M004", spawnCount: 21 },
  ],
  // 아이템 × 몬스터 드롭률 (% 단위, 예: 0.006 = 0.006%)
  drops: [
    { itemId: "I001", monsterId: "M001", dropRatePct: 0.006 },
    { itemId: "I001", monsterId: "M002", dropRatePct: 0.004 },
    { itemId: "I002", monsterId: "M003", dropRatePct: 0.002 },
  ],
};

/* ------------------------------------------------------------------ */
/* 유틸 함수들                                                         */
/* ------------------------------------------------------------------ */

// 시간 포맷터
function formatTime(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (x) => String(x).padStart(2, "0");
  return { h, m, s, label: `${h}시간 ${pad(m)}분 ${pad(s)}초` };
}

function successProbability(p, n) {
  if (!p || !n) return 0;
  return 1 - Math.pow(1 - p, n);
}

function Card({ className = "", children }) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white shadow-md ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, icon }) {
  return (
    <div className="flex items-center gap-2 border-b border-black/5 px-5 py-4">
      {icon}
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
    </div>
  );
}

function CardContent({ children, className = "" }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

function Label({ children }) {
  return <label className="text-sm font-medium text-neutral-600">{children}</label>;
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 ${
        props.className || ""
      }`}
    />
  );
}

function Button({ children, className = "", variant = "primary", ...props }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent hover:bg-neutral-50",
    subtle: "bg-neutral-100 text-neutral-700 hover:bg-white hover:shadow-sm",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
        styles[variant]
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** 간단 비프음: 3번 짧게 울림 */
function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") ctx.resume();

    const beep = (startDelay = 0, freq = 880, duration = 0.5) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + startDelay;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    beep(0, 1000, 0.5);
    beep(0.7, 1000, 0.5);
    beep(1.4, 1000, 0.5);
  } catch (err) {
    console.error("beep error", err);
  }
}

/** 폼 안에 넣을 1분 타이머 (알림음 + GA4 커스텀 이벤트 전송 포함) */
function OneMinuteTimer() {
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          playBeep();
          try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: "timer_1m_done" });
          } catch {}
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    setTimeLeft(60);
    setRunning(true);
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "timer_1m_start" });
    } catch {}
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setTimeLeft(60);
  };

  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-600">1분 타이머</span>
          <span className="text-base font-semibold tabular-nums">
            {mm}:{ss}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!running ? (
            <button
              type="button"
              onClick={start}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              시작
            </button>
          ) : (
            <button
              type="button"
              onClick={pause}
              className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600"
            >
              정지
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
          >
            초기화
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">1분이 끝나면 알림음이 재생됩니다.</p>
    </div>
  );
}

function FloatingTimer({ open, onClose, initSeconds, label }) {
  const [seconds, setSeconds] = useState(initSeconds || 0);
  const [baseSeconds, setBaseSeconds] = useState(initSeconds || 0);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [eh, setEh] = useState(0);
  const [em, setEm] = useState(0);
  const [es, setEs] = useState(0);

  const keyBase = (label || "아이템").trim() || "default";
  const storageKey = `hunt_timer_${keyBase}`;

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const v = Math.max(0, Number(parsed?.seconds) || 0);
        const t = Math.max(v, Number(parsed?.total) || (initSeconds || v));
        setSeconds(v);
        setBaseSeconds(t);
      } else {
        setSeconds(initSeconds || 0);
        setBaseSeconds(initSeconds || 0);
      }
    } catch {
      setSeconds(initSeconds || 0);
      setBaseSeconds(initSeconds || 0);
    }
    setRunning(false);
    setEditing(false);
  }, [open, initSeconds, storageKey]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ seconds, total: baseSeconds, updatedAt: Date.now() })
      );
    } catch {}
  }, [seconds, baseSeconds, open, storageKey]);

  const remain = formatTime(seconds);
  const elapsedSec = Math.max(0, (baseSeconds || 0) - (seconds || 0));
  const elapsed = formatTime(elapsedSec);

  const handleClose = () => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ seconds, total: baseSeconds, updatedAt: Date.now() })
      );
    } catch {}
    onClose?.();
  };

  const startEdit = () => {
    const t = formatTime(seconds);
    setEh(t.h);
    setEm(t.m);
    setEs(t.s);
    setEditing(true);
  };

  const applyEdit = () => {
    const total =
      Math.max(0, (Number(eh) || 0) * 3600 + (Number(em) || 0) * 60 + (Number(es) || 0));
    setSeconds(total);
    setBaseSeconds(total);
    setEditing(false);
    setRunning(false);
  };

  const handleReset = () => {
    setSeconds(initSeconds || 0);
    setBaseSeconds(initSeconds || 0);
    setRunning(false);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed top-2 right-2 z-[99999] w-[min(92vw,560px)] pointer-events-auto"
        >
          <motion.div drag dragMomentum={false} className="cursor-grab active:cursor-grabbing select-none mt-4">
            <div className="rounded-2xl border border-black/10 bg-white/95 backdrop-blur-md shadow-2xl">
              <div className="flex justify-between items-center border-b border-black/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-semibold">타이머 – {label || "아이템"}</span>
                </div>
                <button onClick={handleClose} className="text-neutral-400 hover:text-neutral-700">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 flex flex-col items-center gap-4">
                {!editing ? (
                  <>
                    <div className="grid w-full grid-cols-2 gap-3">
                      <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-center">
                        <div className="text-[11px] text-neutral-500">사냥 시간</div>
                        <div className="text-lg font-semibold tabular-nums">{elapsed.label}</div>
                      </div>
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center">
                        <div className="text-[11px] text-blue-600">남은 시간</div>
                        <div className="text-2xl font-extrabold tabular-nums leading-tight">
                          {remain.label}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="bg-green-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-green-700"
                        onClick={() => setRunning(true)}
                      >
                        <Play className="h-4 w-4 inline mr-1" /> 시작
                      </button>
                      <button
                        className="bg-yellow-500 text-white rounded-lg px-3 py-2 text-sm hover:bg-yellow-600"
                        onClick={() => setRunning(false)}
                      >
                        <Pause className="h-4 w-4 inline mr-1" /> 정지
                      </button>
                      <button
                        className="bg-rose-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-rose-700"
                        onClick={handleReset}
                      >
                        <RotateCcw className="h-4 w-4 inline mr-1" /> 초기화
                      </button>
                      <button
                        onClick={startEdit}
                        className="rounded-lg px-3 py-2 text-sm border"
                      >
                        편집
                      </button>
                    </div>

                    <p className="text-[11px] text-neutral-500 mt-1">
                      타이머를 닫아도 남은 시간은 자동 저장됩니다.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="number"
                        min="0"
                        value={eh}
                        onChange={(e) => setEh(e.target.value)}
                        className="w-16 rounded-md border px-2 py-1"
                      />
                      시간
                      <input
                        type="number"
                        min="0"
                        value={em}
                        onChange={(e) => setEm(e.target.value)}
                        className="w-16 rounded-md border px-2 py-1"
                      />
                      분
                      <input
                        type="number"
                        min="0"
                        value={es}
                        onChange={(e) => setEs(e.target.value)}
                        className="w-16 rounded-md border px-2 py-1"
                      />
                      초
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700"
                        onClick={applyEdit}
                      >
                        적용
                      </button>
                      <button
                        className="rounded-lg px-3 py-2 text-sm border"
                        onClick={() => setEditing(false)}
                      >
                        취소
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* 메인 App                                                            */
/* ------------------------------------------------------------------ */

export default function App() {
  const [mode, setMode] = useState("popular"); // "popular" | "manual"

  // 공통 상태 (타이머 라벨 용)
  const [itemName, setItemName] = useState("");

  // ▶ 직접 입력 모드 전용 상태
  const [manualItemName, setManualItemName] = useState("");
  const [dropRatePct, setDropRatePct] = useState("");
  const [monsterXp, setMonsterXp] = useState("");

  // ▶ 인기 아이템 모드 전용 상태
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedMonsterId, setSelectedMonsterId] = useState("");
  const [selectedMapId, setSelectedMapId] = useState("");

  // ▶ 공통 입력 (두 모드에서 함께 사용)
  const [xpBefore, setXpBefore] = useState("");
  const [xpAfter1m, setXpAfter1m] = useState("");
  const [kills1min, setKills1min] = useState("");
  const [inputMode, setInputMode] = useState("xp"); // "xp" | "kills"
  const [submitted, setSubmitted] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  // GTM helper
  const dl = (event, params = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
  };

  // Session tracking
  const sessionRef = useRef({
    start: performance.now(),
    lastField: null,
    lastValue: null,
    inputCount: 0,
  });
  useEffect(() => {
    const onHide = () => {
      const dur = Math.round((performance.now() - sessionRef.current.start) / 1000);
      dl("page_abandon", {
        time_on_page_sec: dur,
        last_field: sessionRef.current.lastField || "",
        last_value_len: sessionRef.current.lastValue?.length || 0,
        input_count: sessionRef.current.inputCount || 0,
      });
    };
    const onVis = () => {
      if (document.hidden) onHide();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onHide);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onHide);
    };
  }, []);

  // 필드 트래킹 핸들러
  const onFieldFocus = (name) => () => dl("field_focus", { field_name: name });
  const onFieldBlur = (name, getVal) => () => {
    const v = (getVal() ?? "").toString();
    dl("field_blur", { field_name: name, value_len: v.length });
  };
  const onFieldChange = (name, setFn) => (e) => {
    const v = e.target.value;
    setFn(v);
    sessionRef.current.lastField = name;
    sessionRef.current.lastValue = (v ?? "").toString();
    sessionRef.current.inputCount += 1;
    dl("field_input", {
      field_name: name,
      value_len: (v ?? "").toString().length,
      is_number: !isNaN(Number(v)),
    });
  };

  const onModeChangeInput = (m) => {
    setInputMode(m);
    dl("mode_change", { input_mode: m });
  };

  /* ------------------------------------------------------------------ */
  /* 인기 아이템 모드용 파생 데이터                                      */
  /* ------------------------------------------------------------------ */

  // 선택된 아이템 기준 드롭 몬스터 목록
  const popularMonsters = useMemo(() => {
    if (!selectedItemId) return [];
    const monsterIds = DB.drops
      .filter((d) => d.itemId === selectedItemId)
      .map((d) => d.monsterId);
    const unique = Array.from(new Set(monsterIds));
    return unique
      .map((id) => DB.monsters[id])
      .filter(Boolean);
  }, [selectedItemId]);

  // 선택된 몬스터 기준 등장 맵 목록
  const popularMaps = useMemo(() => {
    if (!selectedMonsterId) return [];
    const mapIds = DB.mapMonster
      .filter((mm) => mm.monsterId === selectedMonsterId)
      .map((mm) => mm.mapId);
    const unique = Array.from(new Set(mapIds));
    return unique
      .map((id) => DB.maps[id])
      .filter(Boolean);
  }, [selectedMonsterId]);

  // 선택한 맵에서의 스폰 비율 + 가중 평균 경험치
  const spawnStats = useMemo(() => {
    if (!selectedMapId || !selectedMonsterId) return null;
    const rows = DB.mapMonster.filter((mm) => mm.mapId === selectedMapId);
    if (!rows.length) return null;
    const totalSpawn = rows.reduce((sum, r) => sum + (r.spawnCount || 0), 0);
    if (!totalSpawn) return null;
    const targetRow = rows.find((r) => r.monsterId === selectedMonsterId);
    const targetSpawn = targetRow?.spawnCount || 0;
    const ratio = targetSpawn / totalSpawn;

    const weightedXp =
      rows.reduce((sum, r) => {
        const m = DB.monsters[r.monsterId];
        const xp = m?.xp || 0;
        return sum + xp * (r.spawnCount || 0);
      }, 0) / totalSpawn;

    return { totalSpawn, targetSpawn, ratio, weightedXp };
  }, [selectedMapId, selectedMonsterId]);

  // 아이템 × 몬스터 조합 드롭률 (%)
  const autoDropRatePct = useMemo(() => {
    if (!selectedItemId || !selectedMonsterId) return 0;
    const row = DB.drops.find(
      (d) => d.itemId === selectedItemId && d.monsterId === selectedMonsterId
    );
    return row?.dropRatePct || 0;
  }, [selectedItemId, selectedMonsterId]);

  // 선택된 몬스터 / 맵 / 아이템 이름을 타이머 라벨에 반영
  useEffect(() => {
    if (mode === "popular") {
      const item = DB.items.find((it) => it.id === selectedItemId);
      if (item) setItemName(item.name);
    } else {
      setItemName(manualItemName);
    }
  }, [mode, selectedItemId, manualItemName]);

  const selectedMonster =
    (selectedMonsterId && DB.monsters[selectedMonsterId]) || null;
  const selectedMap = (selectedMapId && DB.maps[selectedMapId]) || null;

  /* ------------------------------------------------------------------ */
  /* 계산 로직 (두 모드 공통)                                            */
  /* ------------------------------------------------------------------ */

  const metrics = useMemo(() => {
    const xpB = Number(xpBefore);
    const xpA = Number(xpAfter1m);
    const xp1 = xpA - xpB;
    const k1 = Number(kills1min);

    let pPct = 0; // %
    let killsPer1m = 0;

    if (mode === "manual") {
      // 기존 방식
      pPct = Number(dropRatePct);
      const mxp = Number(monsterXp);
      if (!pPct) return null;

      const p = pPct / 100;

      if (inputMode === "xp") {
        if (!mxp || !(xp1 > 0)) return null;
        killsPer1m = Math.floor(xp1 / mxp);
      } else {
        if (!k1) return null;
        killsPer1m = k1;
      }

      const expectedKills = Math.round(1 / p);
      const killsPerHr = killsPer1m * 60;
      const secondsNeeded = Math.round((expectedKills / (killsPerHr || 1)) * 3600);
      const probAtExpected = successProbability(p, expectedKills);

      return {
        expectedKills,
        killsPer1m,
        killsPerHr,
        secondsNeeded,
        probAtExpected,
      };
    } else {
      // 인기 아이템 + 맵 기반 방식
      if (!autoDropRatePct || !spawnStats) return null;

      const p = autoDropRatePct / 100;
      const { ratio, weightedXp } = spawnStats;

      if (inputMode === "xp") {
        if (!weightedXp || !(xp1 > 0)) return null;
        const totalKillsPer1m = xp1 / weightedXp;
        killsPer1m = totalKillsPer1m * ratio; // 타겟 몬스터 기준 KPM
      } else {
        if (!k1) return null;
        const totalKillsPer1m = k1;
        killsPer1m = totalKillsPer1m * ratio;
      }

      const expectedKills = Math.round(1 / p);
      const killsPerHr = killsPer1m * 60;
      const secondsNeeded = Math.round((expectedKills / (killsPerHr || 1)) * 3600);
      const probAtExpected = successProbability(p, expectedKills);

      return {
        expectedKills,
        killsPer1m,
        killsPerHr,
        secondsNeeded,
        probAtExpected,
      };
    }
  }, [
    mode,
    dropRatePct,
    monsterXp,
    xpBefore,
    xpAfter1m,
    kills1min,
    inputMode,
    autoDropRatePct,
    spawnStats,
  ]);

  const time = formatTime(metrics?.secondsNeeded || 0);

  const onCalcClick = () => {
    setSubmitted(true);
    dl("calc_click", {
      mode,
      has_item_name: mode === "manual" ? !!manualItemName : !!selectedItemId,
      drop_rate_source: mode === "manual" ? "manual" : "auto",
    });
  };

  const onOpenTimer = () => {
    dl("timer_open", { mode, seconds_init: metrics?.secondsNeeded || 0 });
    setShowTimer(true);
  };

  /* ------------------------------------------------------------------ */
  /* 렌더링                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-neutral-50 to-white">
      <header className="w-full text-center py-8">
        <h1 className="text-4xl font-extrabold tracking-tight">얼마나 잡아야 뜰까?</h1>
      </header>

      <main className="flex-grow w-full flex justify-center px-5 pb-24">
        <div className="w-full max-w-4xl grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 입력 카드 */}
          <Card>
            <CardHeader
              title="정보 입력"
              icon={<Calculator className="h-4 w-4 text-neutral-500" />}
            />
            <CardContent>
              <form className="flex flex-col gap-4">
                {/* 탭 */}
                <div className="flex rounded-xl bg-neutral-100 p-1 mb-2">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                      mode === "popular"
                        ? "bg-white shadow-sm"
                        : "text-neutral-500 hover:bg-neutral-50"
                    }`}
                    onClick={() => setMode("popular")}
                  >
                    인기 아이템
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                      mode === "manual"
                        ? "bg-white shadow-sm"
                        : "text-neutral-500 hover:bg-neutral-50"
                    }`}
                    onClick={() => setMode("manual")}
                  >
                    직접 입력
                  </button>
                </div>

                {/* ---------------- 인기 아이템 모드 ---------------- */}
                {mode === "popular" && (
                  <>
                    {/* 목표 아이템 */}
                    <div>
                      <Label>목표 아이템</Label>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                        value={selectedItemId}
                        onChange={(e) => {
                          setSelectedItemId(e.target.value);
                          setSelectedMonsterId("");
                          setSelectedMapId("");
                        }}
                      >
                        <option value="">아이템을 선택하세요</option>
                        {DB.items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 드롭 몬스터 */}
                    <div>
                      <Label>드롭 몬스터</Label>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                        value={selectedMonsterId}
                        disabled={!selectedItemId}
                        onChange={(e) => {
                          setSelectedMonsterId(e.target.value);
                          setSelectedMapId("");
                        }}
                      >
                        <option value="">몬스터를 선택하세요</option>
                        {popularMonsters.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 사냥터 */}
                    <div>
                      <Label>사냥터</Label>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                        value={selectedMapId}
                        disabled={!selectedMonsterId}
                        onChange={(e) => setSelectedMapId(e.target.value)}
                      >
                        <option value="">사냥터를 선택하세요</option>
                        {popularMaps.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 드롭 몬스터 정보 카드 */}
                    {selectedMonster && (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm space-y-1">
                        <div className="font-semibold text-neutral-800">
                          {selectedMonster.name}
                        </div>
                        <div>레벨: {selectedMonster.level}</div>
                        <div>HP: {selectedMonster.hp.toLocaleString()}</div>
                        <div>경험치: {selectedMonster.xp.toLocaleString()}</div>
                        <div>
                          드롭 확률:{" "}
                          {autoDropRatePct
                            ? `${autoDropRatePct.toFixed(4)}%`
                            : "데이터 없음"}
                        </div>
                        {spawnStats && selectedMap && (
                          <div className="mt-1 text-xs text-neutral-600">
                            맵 스폰 비율:{" "}
                            {(spawnStats.ratio * 100).toFixed(1)}% (
                            총 {spawnStats.totalSpawn}마리 중{" "}
                            {spawnStats.targetSpawn}마리, 사냥터: {selectedMap.name})
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ---------------- 직접 입력 모드 ---------------- */}
                {mode === "manual" && (
                  <>
                    <div>
                      <Label>아이템 이름 (선택)</Label>
                      <Input
                        placeholder="예: 투구 민첩 주문서 60%"
                        value={manualItemName}
                        onFocus={onFieldFocus("itemName")}
                        onBlur={onFieldBlur("itemName", () => manualItemName)}
                        onChange={onFieldChange("itemName", setManualItemName)}
                      />
                    </div>
                    <div>
                      <Label>아이템 드롭률 (%)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="예: 0.006"
                        value={dropRatePct}
                        onFocus={onFieldFocus("dropRatePct")}
                        onBlur={onFieldBlur("dropRatePct", () => dropRatePct)}
                        onChange={onFieldChange("dropRatePct", setDropRatePct)}
                      />
                    </div>
                    <div>
                      <Label>몬스터 경험치</Label>
                      <Input
                        type="number"
                        placeholder="예: 115"
                        value={monsterXp}
                        onFocus={onFieldFocus("monsterXp")}
                        onBlur={onFieldBlur("monsterXp", () => monsterXp)}
                        onChange={onFieldChange("monsterXp", setMonsterXp)}
                      />
                    </div>
                  </>
                )}

                {/* 공통: 입력 방식 선택 */}
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      checked={inputMode === "xp"}
                      onChange={() => onModeChangeInput("xp")}
                    />{" "}
                    경험치로 측정
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      checked={inputMode === "kills"}
                      onChange={() => onModeChangeInput("kills")}
                    />{" "}
                    마리 수로 측정
                  </label>
                </div>

                {/* 공통: 경험치/마리 수 입력 */}
                {inputMode === "xp" && (
                  <>
                    <div>
                      <Label>사냥 전 경험치</Label>
                      <Input
                        type="number"
                        placeholder="예: 12345678"
                        value={xpBefore}
                        onFocus={onFieldFocus("xpBefore")}
                        onBlur={onFieldBlur("xpBefore", () => xpBefore)}
                        onChange={onFieldChange("xpBefore", setXpBefore)}
                      />
                    </div>
                    <OneMinuteTimer />
                    <div>
                      <Label>1분 사냥 후 경험치</Label>
                      <Input
                        type="number"
                        placeholder="예: 12352678"
                        value={xpAfter1m}
                        onFocus={onFieldFocus("xpAfter1m")}
                        onBlur={onFieldBlur("xpAfter1m", () => xpAfter1m)}
                        onChange={onFieldChange("xpAfter1m", setXpAfter1m)}
                      />
                    </div>
                  </>
                )}

                {inputMode === "kills" && (
                  <div>
                    <Label>1분 사냥 마리 수</Label>
                    <Input
                      type="number"
                      placeholder="예: 60"
                      value={kills1min}
                      onFocus={onFieldFocus("kills1min")}
                      onBlur={onFieldBlur("kills1min", () => kills1min)}
                      onChange={onFieldChange("kills1min", setKills1min)}
                    />
                  </div>
                )}

                <Button type="button" className="w-full" onClick={onCalcClick}>
                  <Clock className="h-4 w-4" /> 예상 시간 계산
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 결과 카드 */}
          <Card>
            <CardHeader
              title="계산 결과"
              icon={<Clock className="h-4 w-4 text-neutral-500" />}
            />
            <CardContent>
              {!submitted || !metrics ? (
                <div className="grid min-h-[240px] place-items-center text-neutral-400">
                  정보를 입력해 주세요.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-xs text-neutral-500">기대 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">
                        {metrics.expectedKills.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-xs text-neutral-500">1분 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">
                        {metrics.killsPer1m.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-xs text-neutral-500">1시간 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">
                        {metrics.killsPerHr.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3 border-t border-dashed border-neutral-200 pt-4">
                    <div>
                      <div className="text-xs text-neutral-500">예상 소요 시간</div>
                      <div className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                        {time.label}
                      </div>
                    </div>
                    <Button variant="ghost" onClick={onOpenTimer}>
                      <Timer className="h-4 w-4" /> 타이머 띄우기
                    </Button>
                  </div>

                  <p className="text-xs leading-relaxed text-neutral-500">
                    {metrics.expectedKills.toLocaleString()}마리를 잡았을 때 아이템을 얻을
                    확률은 약 {(metrics.probAtExpected * 100).toFixed(1)}%입니다.
                    <br />
                    평균적인 기대값이므로 실제 획득 시간은 운에 따라 다를 수 있습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <FloatingTimer
        open={showTimer && !!metrics}
        onClose={() => setShowTimer(false)}
        initSeconds={metrics?.secondsNeeded || 0}
        label={itemName || "아이템"}
      />
      <Analytics />
    </div>
  );
}
