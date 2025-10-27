import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Calculator, Clock, X, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Analytics } from "@vercel/analytics/next"

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
  return <div className={`rounded-2xl border border-black/5 bg-white shadow-md ${className}`}>{children}</div>;
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
      className={`w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 ${props.className || ""}`}
    />
  );
}

function Button({ children, className = "", variant = "primary", ...props }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent hover:bg-neutral-50",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function FloatingTimer({ open, onClose, initSeconds, label }) {
  const [seconds, setSeconds] = useState(initSeconds || 0);
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
        setSeconds(v);
      } else {
        setSeconds(initSeconds || 0);
      }
    } catch {
      setSeconds(initSeconds || 0);
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
      localStorage.setItem(storageKey, JSON.stringify({ seconds, updatedAt: Date.now() }));
    } catch {}
  }, [seconds, open, storageKey]);

  const time = formatTime(seconds);

  const handleClose = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ seconds, updatedAt: Date.now() }));
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
    const total = Math.max(0, (Number(eh) || 0) * 3600 + (Number(em) || 0) * 60 + (Number(es) || 0));
    setSeconds(total);
    setEditing(false);
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

              <div className="p-4 flex flex-col items-center gap-3">
                {!editing ? (
                  <>
                    <div className="text-3xl font-bold flex items-center gap-2">
                      {time.label}
                      <button onClick={startEdit} className="text-xs rounded-md border px-2 py-1 hover:bg-neutral-50">편집</button>
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
                        onClick={() => setSeconds(initSeconds || 0)}
                      >
                        <RotateCcw className="h-4 w-4 inline mr-1" /> 초기화
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="number" min="0" value={eh} onChange={(e) => setEh(e.target.value)} className="w-16 rounded-md border px-2 py-1" />시간
                      <input type="number" min="0" value={em} onChange={(e) => setEm(e.target.value)} className="w-16 rounded-md border px-2 py-1" />분
                      <input type="number" min="0" value={es} onChange={(e) => setEs(e.target.value)} className="w-16 rounded-md border px-2 py-1" />초
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700" onClick={applyEdit}>적용</button>
                      <button className="rounded-lg px-3 py-2 text-sm border" onClick={() => setEditing(false)}>취소</button>
                    </div>
                  </>
                )}

                <p className="text-[11px] text-neutral-500 mt-1">타이머를 닫아도 남은 시간은 자동 저장됩니다.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function App() {
  const [itemName, setItemName] = useState("");
  const [dropRatePct, setDropRatePct] = useState("");
  const [monsterXp, setMonsterXp] = useState("");
  const [xpBefore, setXpBefore] = useState("");
  const [xpAfter1m, setXpAfter1m] = useState("");
  const [inputMode, setInputMode] = useState("xp"); // 기본값을 경험치로 설정
  const [kills1min, setKills1min] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  const metrics = useMemo(() => {
    const p = Number(dropRatePct) / 100;
    const mxp = Number(monsterXp);
    const xpB = Number(xpBefore);
    const xpA = Number(xpAfter1m);
    const xp1 = xpA - xpB;
    const k1 = Number(kills1min);

    if (!p) return null;

    const expectedKills = Math.round(1 / p);
    let killsPer1m = 0;

    if (inputMode === "xp") {
      if (!mxp || !(xp1 > 0)) return null;
      killsPer1m = Math.floor(xp1 / mxp);
    } else {
      if (!k1) return null;
      killsPer1m = k1;
    }

    const killsPerHr = killsPer1m * 60;
    const secondsNeeded = Math.round((expectedKills / (killsPerHr || 1)) * 3600);
    const probAtExpected = successProbability(p, expectedKills);

    return { expectedKills, killsPer1m, killsPerHr, secondsNeeded, probAtExpected };
  }, [dropRatePct, monsterXp, xpBefore, xpAfter1m, kills1min, inputMode]);

  const time = formatTime(metrics?.secondsNeeded || 0);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-neutral-50 to-white">
      <header className="w-full text-center py-8">
        <h1 className="text-4xl font-extrabold tracking-tight">얼마나 잡아야 뜰까?</h1>
      </header>

      <main className="flex-grow w-full flex justify-center px-5 pb-24">
        <div className="w-full max-w-6xl grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="정보 입력" icon={<Calculator className="h-4 w-4 text-neutral-500" />} />
            <CardContent>
              <form className="flex flex-col gap-4">
                <div>
                  <Label>아이템 이름 (선택)</Label>
                  <Input placeholder="예: 투구 민첩 주문서 60%" value={itemName} onChange={(e) => setItemName(e.target.value)} />
                </div>

                <div>
                  <Label>아이템 드롭률 (%)</Label>
                  <Input type="number" step="0.0001" min="0" placeholder="예: 0.006" value={dropRatePct} onChange={(e) => setDropRatePct(e.target.value)} />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 text-sm">
                    <input type="radio" checked={inputMode === "xp"} onChange={() => setInputMode("xp")} /> 경험치로 입력
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input type="radio" checked={inputMode === "kills"} onChange={() => setInputMode("kills")} /> 마리 수로 입력
                  </label>
                </div>

                {inputMode === "xp" && (
                  <>
                    <div>
                      <Label>몬스터 경험치</Label>
                      <Input type="number" placeholder="예: 115" value={monsterXp} onChange={(e) => setMonsterXp(e.target.value)} />
                    </div>
                    <div>
                      <Label>사냥 전 경험치</Label>
                      <Input type="number" placeholder="예: 12345678" value={xpBefore} onChange={(e) => setXpBefore(e.target.value)} />
                    </div>
                    <div>
                      <Label>1분 사냥 후 경험치</Label>
                      <Input type="number" placeholder="예: 12352678" value={xpAfter1m} onChange={(e) => setXpAfter1m(e.target.value)} />
                    </div>
                  </>
                )}

                {inputMode === "kills" && (
                  <div>
                    <Label>1분 사냥 마리 수</Label>
                    <Input type="number" placeholder="예: 60" value={kills1min} onChange={(e) => setKills1min(e.target.value)} />
                  </div>
                )}

                <Button type="button" className="w-full" onClick={() => setSubmitted(true)}>
                  <Clock className="h-4 w-4" /> 예상 시간 계산
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="계산 결과" icon={<Clock className="h-4 w-4 text-neutral-500" />} />
            <CardContent>
              {!submitted || !metrics ? (
                <div className="grid min-h-[240px] place-items-center text-neutral-400">정보를 입력해 주세요.</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-xs text-neutral-500">기대 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">{metrics.expectedKills.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-xs text-neutral-500">1분 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">{metrics.killsPer1m.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-xs text-neutral-500">1시간 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">{metrics.killsPerHr.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3 border-t border-dashed border-neutral-200 pt-4">
                    <div>
                      <div className="text-xs text-neutral-500">예상 소요 시간</div>
                      <div className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{time.label}</div>
                    </div>
                    <Button variant="ghost" onClick={() => setShowTimer(true)}>
                      <Timer className="h-4 w-4" /> 타이머 띄우기
                    </Button>
                  </div>

                  <p className="text-xs leading-relaxed text-neutral-500">
                    {metrics.expectedKills.toLocaleString()}마리를 잡았을 때 아이템을 얻을 확률은 약 {(metrics.probAtExpected * 100).toFixed(1)}%입니다.
                    <br />평균적인 기대값이므로 실제 획득 시간은 운에 따라 다를 수 있습니다.
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
    </div>
  );
<Analytics />
}
