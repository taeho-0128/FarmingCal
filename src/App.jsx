import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Calculator, X } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import React from "react";

/* ============================================================
   Google Sheets CSV URL (Huntcal 시트만 사용)
============================================================ */
const SHEET =
  "https://docs.google.com/spreadsheets/d/1AsEBaw6Pbrk1t3FxpSO2Nzx_6ltORHnPAbAfve8Xzd8/export?format=csv&gid=";

// 여기 gid를 실제 Huntcal 시트 gid로 맞춰줘야 함.
const HUNTCAL_CSV = SHEET + "1420156630";

/* ============================================================
   Utility
============================================================ */
function formatTime(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return {
    h,
    m,
    s,
    label: `${h}시간 ${String(m).padStart(2, "0")}분 ${String(s).padStart(2, "0")}초`,
  };
}

async function loadCSV(url) {
  const r = await fetch(url);
  const text = await r.text();
  const lines = text.trim().split("\n").map((l) => l.split(","));
  return lines.slice(1); // 헤더 제거
}

/* ============================================================
   UI Components (Card 등)
============================================================ */
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white shadow-lg ${className}`}>
      {children}
    </div>
  );
}

function MonsterSelect({ monsters, value, onSelect, disabled }) {
  const [open, setOpen] = useState(false);

  const selected = monsters.find(m => m.MonsterName === value);

  const isDisabled = disabled || monsters.length === 0;

  return (
    <div className="relative">
      {/* 버튼 */}
      <button
  type="button"
  disabled={isDisabled}
  onClick={() => {
    if (!isDisabled) setOpen(!open);
  }}
  className={`
    w-full rounded-xl px-4 py-3 text-left text-sm flex justify-between items-center
    transition shadow-sm border border-neutral-300
    ${isDisabled
      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed border-neutral-200"
      : "bg-white text-neutral-800 cursor-pointer hover:border-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    }
  `}
>

        <span>
          {isDisabled
            ? "아이템을 먼저 선택하세요"
            : selected
            ? selected.MonsterName
            : "몬스터를 선택하세요"}
        </span>
        <span className={`text-xs ${isDisabled ? "text-neutral-300" : "text-neutral-500"}`}>
          ▼
        </span>
      </button>

      {/* 리스트 */}
      {open && !isDisabled && (
        <div
          className="absolute left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl 
                     max-h-72 overflow-auto z-50 animate-fadeIn"
        >
          {monsters.map((m) => (
            <button
              key={m.MonsterName}
              type="button"
              onClick={() => {
                onSelect(m.MonsterName);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-neutral-100"
            >
              <div className="font-medium">{m.MonsterName} (LV {m.Level})</div>

              <div className="flex gap-6 mt-1 text-xs text-neutral-500">
                <div>HP {m.HP.toLocaleString()}</div>
                <div>경험치 {m.XP.toLocaleString()}</div>
                <div>드롭률 {(m.DropRate * 100).toFixed(4)}%</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function CardHeader({ title, icon }) {
  return (
    <div className="flex items-center gap-2 border-b border-black/5 px-6 py-5">
      {icon}
      <h3 className="text-xl font-semibold">{title}</h3>
    </div>
  );
}

function CardContent({ children, className = "" }) {
  return <div className={`px-6 py-6 ${className}`}>{children}</div>;
}

function Label({ children }) {
  return <label className="text-sm font-medium text-neutral-700">{children}</label>;
}

function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 " +
        (props.className || "")
      }
    />
  );
}


/* ============================================================
   1분 타이머 (항상 표시)
============================================================ */
function playBeep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const beep = (delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1000;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    };
    beep(0);
    beep(0.4);
    beep(0.8);
  } catch {}
}

function OneMinuteTimer() {
  const [left, setLeft] = useState(60);
  const [running, setRunning] = useState(false);

  // 새로고침/리로드 시 항상 초기 상태로
  useEffect(() => {
    setLeft(60);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          playBeep();
          setRunning(false);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  return (
    <div className="border rounded-xl px-4 py-3 bg-white">
      <div className="font-semibold mb-2">1분 타이머</div>
      <div className="text-xl font-bold">{String(left).padStart(2, "0")}초</div>

      <div className="flex gap-2 mt-3">
        {!running ? (
          <button
            onClick={() => {
              setLeft(60);
              setRunning(true);
            }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            시작
          </button>
        ) : (
          <button
            onClick={() => setRunning(false)}
            className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm"
          >
            정지
          </button>
        )}
        <button
          onClick={() => {
            setLeft(60);
            setRunning(false);
          }}
          className="border px-3 py-2 rounded-lg text-sm"
        >
          초기화
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Floating Timer (결과 타이머 보기)
============================================================ */
function FloatingTimer({ open, onClose, initSeconds, label }) {
  const [seconds, setSeconds] = useState(initSeconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    setSeconds(initSeconds);
    setRunning(true);
  }, [initSeconds]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          playBeep();
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!open) return null;

  return createPortal(
    <div className="fixed bottom-5 right-5 bg-white shadow-xl border rounded-2xl p-4 w-64 z-[9000]">
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold">{label}</div>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-neutral-600" />
        </button>
      </div>

      <div className="text-center text-3xl font-bold mb-3">
        {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
        {String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </div>

      <div className="flex justify-center gap-2">
        {running ? (
          <button
            onClick={() => setRunning(false)}
            className="px-3 py-1 rounded-lg bg-yellow-500 text-white text-sm"
          >
            일시정지
          </button>
        ) : (
          <button
            onClick={() => setRunning(true)}
            className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm"
          >
            다시 시작
          </button>
        )}

        <button
          onClick={() => setSeconds(initSeconds)}
          className="px-3 py-1 rounded-lg border text-sm"
        >
          초기화
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   Huntcal Loader Hook
============================================================ */
function useHuntcal() {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await loadCSV(HUNTCAL_CSV);
      setRows(
        data.map((r) => ({
          ItemName: r[0],
          MonsterName: r[1],
          Level: Number(r[2] || 0),
          HP: Number(r[3] || 0),
          XP: Number(r[4] || 0),
          DropItemID: r[5],
          DropRate: (() => {
  const v = (r[6] || "").trim();
  if (!v) return 0;

  // 퍼센트 문자열 처리: "0.0080%" → 0.00008
  if (v.endsWith("%")) {
    const num = parseFloat(v.replace("%", ""));
    return num / 100;
  }

  return Number(v) || 0;
})(),
        }))
      );
      setLoaded(true);
    }

    load();
  }, []);

  return { huntcal: rows, loaded };
}

/* ============================================================
   Item AutoComplete Component
============================================================ */
function ItemAuto({ items, value, onChangeText, onSelect }) {
  const [focus, setFocus] = useState(false);

  const list = useMemo(() => {
    if (!value) return items.slice(0, 30);
    const v = value.toLowerCase();
    return items.filter((name) => name.toLowerCase().includes(v));
  }, [items, value]);

  return (
    <div className="relative">
      <Input
        placeholder="아이템 이름 검색"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
      />

      {focus && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-lg z-40 max-h-60 overflow-auto">
          {list.length === 0 && (
            <div className="px-3 py-2 text-neutral-400 text-sm">검색 결과 없음</div>
          )}

          {list.map((name) => (
            <button
              key={name}
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(name);
                setFocus(false);
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Calculation Logic
============================================================ */
function computeExpectedTime(rate, killsPerMin) {
  if (!rate || rate <= 0 || !killsPerMin || killsPerMin <= 0) return null;

  const killsHr = killsPerMin * 60;
  const expected = Math.round(1 / rate);

  const secAvg = Math.round((expected / killsHr) * 3600);

  const n90 = Math.log(1 - 0.9) / Math.log(1 - rate);
  const sec90 = Math.round((n90 / killsHr) * 3600);

  return { expected, killsPerMin, killsPerHr: killsHr, secAvg, sec90 };
}

// 드롭률(확률) -> 퍼센트 문자열로
function shortRate(v) {
  const num = Number(v) * 100; // 확률 -> %
  if (!num) return "0%";

  // 아주 작은 값은 자릿수를 더 준다
  let digits;
  if (num < 0.01) {
    digits = 6;     // 0.000400% 같이
  } else if (num < 0.1) {
    digits = 4;     // 0.0523% 같이
  } else {
    digits = 3;     // 0.008% 같이
  }

  return `${parseFloat(num.toFixed(digits))}%`;
}

/* ============================================================
   Main App
============================================================ */
export default function App() {
  const { huntcal, loaded } = useHuntcal();

  // 입력 모드
  const [mode, setMode] = useState("popular"); // popular | manual
  const [inputMode, setInputMode] = useState("kills"); // 기본값: 1분당 처치 수

  // 아이템 / 몬스터 상태
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemName, setSelectedItemName] = useState("");
  const [selectedMonsterName, setSelectedMonsterName] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);

  // 수치 입력
  const [dropRatePct, setDropRatePct] = useState(""); // % 값 (0.006 등)
  const [monsterXp, setMonsterXp] = useState("");
  const [xpBefore, setXpBefore] = useState("");
  const [xpAfter, setXpAfter] = useState("");
  const [kills1min, setKills1min] = useState("");

  // 출력 / 타이머 상태
  const [submitted, setSubmitted] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerLabel, setTimerLabel] = useState("아이템");

  /* ------------------------------------------------------------
     파생 데이터
  ------------------------------------------------------------ */
  // 아이템 목록 (중복 제거)
  const itemOptions = useMemo(() => {
    const set = new Set();
    huntcal.forEach((r) => {
      if (r.ItemName) set.add(r.ItemName);
    });
    return Array.from(set);
  }, [huntcal]);

  // 선택된 아이템을 드롭하는 몬스터 목록 (중복 제거)
  const monsterOptions = useMemo(() => {
    if (!selectedItemName) return [];
    const map = new Map();
    huntcal.forEach((r) => {
      if (r.ItemName === selectedItemName && r.MonsterName && !map.has(r.MonsterName)) {
        map.set(r.MonsterName, r);
      }
    });
    return Array.from(map.values());
  }, [huntcal, selectedItemName]);

  /* ------------------------------------------------------------
     선택 핸들러
  ------------------------------------------------------------ */
  const handleItemSelect = (name) => {
    setSelectedItemName(name);
    setItemSearch(name);

    setSelectedMonsterName("");
    setSelectedRow(null);
    setDropRatePct("");
    setMonsterXp("");
    setSubmitted(false);
  };
  

  const handleMonsterSelect = (monsterName) => {
    setSelectedMonsterName(monsterName);
    const row =
      monsterOptions.find((m) => m.MonsterName === monsterName) || null;
    setSelectedRow(row || null);

    if (row) {
      setMonsterXp(String(row.XP || ""));
      const pct = (row.DropRate || 0) * 100;
      setDropRatePct(String(pct));
    }else {
      setMonsterXp("");
      setDropRatePct("");
    }
    setSubmitted(false);
  };

  /* ------------------------------------------------------------
     계산 로직 준비
  ------------------------------------------------------------ */
  const rate = (Number(dropRatePct) || 0) / 100;
  const xp = Number(monsterXp) || 0;
  const before = Number(xpBefore) || 0;
  const after = Number(xpAfter) || 0;
  const xpGain = after - before;
  const killsManual = Number(kills1min) || 0;

  // 드롭 몬스터 1마리 경험치
  const dropXp = xp;

  // 실제 처치 속도 (드롭 몬스터 기준)
  const killsPerMin =
    inputMode === "xp"
      ? xpGain > 0 && dropXp > 0
        ? xpGain / dropXp
        : 0
      : killsManual;

  const summaryMetrics = computeExpectedTime(rate, killsPerMin);

  const prob63 =
    summaryMetrics && rate > 0
      ? (1 - Math.pow(1 - rate, summaryMetrics.expected)) * 100
      : null;

  const timeAvg = formatTime(summaryMetrics?.secAvg || 0);
  const time90 = formatTime(summaryMetrics?.sec90 || 0);

  const huntLabel = "드롭 몬스터 기준 사냥 속도";

  const openTimer = (seconds, label) => {
    if (!seconds || seconds <= 0) return;
    setTimerSeconds(seconds);
    setTimerLabel(label || "아이템");
    setShowTimer(true);
  };

  /* ------------------------------------------------------------
     렌더링
  ------------------------------------------------------------ */
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-neutral-50 to-white">
      {/* 헤더 */}
      <header className="w-full text-center py-10">
        <h1 className="text-5xl font-extrabold tracking-tight">얼마나 잡아야 뜰까?</h1>
      </header>

      {/* 메인 */}
      <main className="flex-grow w-full flex justify-center px-6 pb-28">
        <div className="w-full max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-12">
          {/* ========================= LEFT : 입력 카드 ========================= */}
          <Card>
            <CardHeader
              title="아이템 선택"
              icon={<Calculator className="h-5 w-5 text-neutral-500" />}
            />
            <CardContent className="space-y-6">
              {/* 로딩 안내 */}
              {!loaded && (
                <div className="text-xs text-neutral-400">
                  구글 시트에서 데이터를 불러오는 중입니다...
                </div>
              )}

              {/* 인기 아이템 / 직접 입력 탭 */}
              <div className="flex rounded-xl bg-neutral-100 p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                    mode === "popular" ? "bg-white shadow-sm" : "text-neutral-500"
                  }`}
                  onClick={() => setMode("popular")}
                >
                  아이템 선택
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                    mode === "manual" ? "bg-white shadow-sm" : "text-neutral-500"
                  }`}
                  onClick={() => {
                    setMode("manual");
                    setSelectedItemName("");
                    setItemSearch("");
                    setSelectedMonsterName("");
                    setSelectedRow(null);
                    setDropRatePct("");
                    setMonsterXp("");
                    setSubmitted(false);
                  }}
                >
                  드롭률 직접 입력
                </button>
              </div>

              {/* ------------------------ 인기 아이템 모드 ------------------------ */}
              {mode === "popular" && (
                <div className="space-y-5">
                  {/* 목표 아이템 */}
                  <div>
                    <Label>목표 아이템</Label>
                    <ItemAuto
                      items={itemOptions}
                      value={itemSearch}
                      onChangeText={(text) => {
                        setItemSearch(text);
                        if (!text) {
                          setSelectedItemName("");
                          setSelectedMonsterName("");
                          setSelectedRow(null);
                          setDropRatePct("");
                          setSubmitted(false);
                        }
                      }}
                      onSelect={handleItemSelect}
                    />
                  </div>

                  {/* 드롭 몬스터 */}
                  <div>
                    <Label>드롭 몬스터</Label>
                    <div className="relative mt-1">
                     <MonsterSelect
  monsters={monsterOptions}
  value={selectedMonsterName}
  disabled={!selectedItemName || !monsterOptions.length}
  onSelect={handleMonsterSelect}
/>
                    </div>
                  </div>

                 {(selectedRow || dropRatePct) && (
  <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs space-y-1">
    {selectedRow && (
      <>
        <div className="font-semibold text-neutral-900 text-sm">
          {selectedRow.MonsterName}
          {selectedRow.Level ? ` (LV ${selectedRow.Level})` : ""}
        </div>

        {/* --- 3열 테이블 헤더 --- */}
        <div className="flex gap-6 mt-2 text-neutral-500">
          <div className="w-16">HP</div>
          <div className="w-16">경험치</div>
          <div className="w-20">드롭률</div>
        </div>

        {/* --- 3열 값 --- */}
        <div className="flex gap-6 mt-1 font-medium">
          <div className="w-16">{Number(selectedRow.HP).toLocaleString()}</div>
          <div className="w-16">{Number(selectedRow.XP).toLocaleString()}</div>
          <div className="w-20">
  {dropRatePct ? `${Number(dropRatePct).toFixed(4)}%` : "-"}
</div>

        </div>
      </>
    )}
  </div>
)}

                </div>
              )}

              {/* ------------------------ 직접 입력 모드 ------------------------ */}
              {mode === "manual" && (
                <div className="space-y-5">
                  <div>
                   <Label>드롭률 (%)</Label>
<Input
  type="number"
  step="0.0001"
  min="0"
  placeholder="예: 0.006"
  value={dropRatePct}
  onChange={(e) => setDropRatePct(e.target.value)}
/>
<p className="mt-1 text-[11px] text-neutral-500">
  드롭률이 0.006%인 경우 0.006으로 입력하세요.
</p>

                  </div>
                  
                </div>
              )}

              {/* ===================== 측정 방식 (XP / Kills) ===================== */}
              <div className="space-y-3 pt-2">

                <Label>측정 방식</Label>

                <div className="flex rounded-xl bg-neutral-100 p-1">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                      inputMode === "kills" ? "bg-white shadow-sm" : "text-neutral-500"
                    }`}
                    onClick={() => setInputMode("kills")}
                  >
                    1분당 처치 수
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                      inputMode === "xp" ? "bg-white shadow-sm" : "text-neutral-500"
                    }`}
                    onClick={() => setInputMode("xp")}
                  >
                    1분 사냥 경험치
                  </button>
                </div>
              </div>
{/* manual 입력 + XP 방식일 때만 드롭 몬스터 경험치 표시 */}
{mode === "manual" && inputMode === "xp" && (
  <div className="pt-2">
    <Label>드롭 몬스터 경험치</Label>
    <Input
      type="number"
      placeholder="예: 1620"
      value={monsterXp}
      onChange={(e) => setMonsterXp(e.target.value)}
    />
  </div>
)}

              {/* 입력 폼 – Kills 모드 */}
              {inputMode === "kills" && (
                <div className="pt-1 space-y-3">
                  <div>
                    <Label>1분당 처치 수 (드롭 몬스터 기준)</Label>
                    <Input
                      type="number"
                      placeholder="예: 50"
                      value={kills1min}
                      onChange={(e) => setKills1min(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* 입력 폼 – XP 모드 */}
              {inputMode === "xp" && (
                <div className="space-y-4 pt-1">
                  <div>
                    <Label>사냥 전 경험치</Label>
                    <Input
                      type="number"
                      placeholder="예: 1423112"
                      value={xpBefore}
                      onChange={(e) => setXpBefore(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>1분 사냥 후 경험치</Label>
                    <Input
                      type="number"
                      placeholder="예: 1430012"
                      value={xpAfter}
                      onChange={(e) => setXpAfter(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* 항상 보이는 1분 타이머 */}
              <div className="pt-4 space-y-1">
                <OneMinuteTimer />
                <p className="mt-1 text-[11px] text-neutral-500">
                  1분이 끝나면 알림음이 재생됩니다.
                </p>
              </div>

              {/* 계산 버튼 */}
              <button
                type="button"
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
                onClick={() => setSubmitted(true)}
              >
                드롭 예상 시간 계산
              </button>
            </CardContent>
          </Card>

          {/* ========================= RIGHT : 결과 카드 ========================= */}
          <Card>
            <CardHeader
              title="계산 결과"
              icon={<Calculator className="h-5 w-5 text-neutral-500" />}
            />
            <CardContent className="space-y-5">
              {!submitted && (
                <p className="text-neutral-500 text-sm">
                  왼쪽에서 정보를 입력한 뒤{" "}
                  <strong>드롭 예상 시간 계산</strong> 버튼을 눌러 주세요.
                </p>
              )}

              {submitted && !summaryMetrics && (
                <p className="text-rose-500 text-sm">
                  계산에 필요한 값이 충분하지 않습니다. <br />
                  드롭률과 사냥 속도(경험치 또는 1분당 처치 수)를 다시 확인해 주세요.
                </p>
              )}

              {submitted && summaryMetrics && (
                <>
                  {/* 상단 요약 */}
                  <div className="space-y-2 text-xs text-neutral-500">
                    <div className="font-semibold text-neutral-800">{huntLabel}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-neutral-500">기대 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-bold">
                        {summaryMetrics.expected.toLocaleString()} 마리
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-neutral-500">현재 속도</div>
                      <div className="mt-1 text-xl font-bold">
                        {summaryMetrics.killsPerMin.toFixed(1)} 마리/1분
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-neutral-500">1시간 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-bold">
                        {summaryMetrics.killsPerHr.toLocaleString()} 마리
                      </div>
                    </div>
                  </div>

                  {/* 시간 결과 */}
                  <div className="pt-4 mt-2 border-t border-neutral-200 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div>평균적인 기대 시간</div>
                        <div className="text-[11px] text-neutral-500">
                          (드롭 확률{" "}
                          {prob63 != null ? prob63.toFixed(1) : "63.2"}%)
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold">{timeAvg.label}</div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-blue-600"
                          onClick={() =>
                            openTimer(summaryMetrics.secAvg, `평균 기대 시간`)
                          }
                        >
                          타이머 보기
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div>무조건 1개 정도 뜨는 시간</div>
                        <div className="text-[11px] text-neutral-500">
                          (드롭 확률 90.0%)
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold">{time90.label}</div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-blue-600"
                          onClick={() =>
                            openTimer(summaryMetrics.sec90, `90% 도달 시간`)
                          }
                        >
                          타이머 보기
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 결과용 플로팅 타이머 */}
      <FloatingTimer
        open={showTimer}
        onClose={() => setShowTimer(false)}
        initSeconds={timerSeconds}
        label={timerLabel}
      />

      <Analytics />
    </div>
  );
}
