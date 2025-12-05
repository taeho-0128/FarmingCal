import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Calculator, X } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import React from "react";

/* ============================================================
   v2 이벤트 dataLayer 푸시 헬퍼
============================================================ */
function pushEvent(name, params = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...params });
  } catch (e) {
    console.warn("dataLayer error:", e);
  }
}

/* ============================================================
   Google Sheets CSV URL
============================================================ */
const SHEET =
  "https://docs.google.com/spreadsheets/d/1AsEBaw6Pbrk1t3FxpSO2Nzx_6ltORHnPAbAfve8Xzd8/export?format=csv&gid=";

// 여기 gid는 Huntcal 시트 gid
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
  return lines.slice(1);
}

/* ============================================================
   Card 컴포넌트
============================================================ */
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white shadow-lg ${className}`}>
      {children}
    </div>
  );
}

/* ============================================================
   Monster Select Component
============================================================ */
function MonsterSelect({ monsters, value, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = monsters.find((m) => m.MonsterName === value);
  const isDisabled = disabled || monsters.length === 0;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => {
          if (!isDisabled) setOpen(!open);
        }}
        className={`
          w-full rounded-xl px-4 py-3 text-left text-sm flex justify-between items-center
          transition shadow-sm border border-neutral-300
          ${
            isDisabled
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

/* ============================================================
   Card Header / Content
============================================================ */
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
   OneMinuteTimer (v2 이벤트 추가 적용)
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

          /* v2 이벤트: 1분 타이머 완료 */
          pushEvent("v2_timer_1m_done");

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

              /* v2 이벤트: 1분 타이머 시작 */
              pushEvent("v2_timer_1m_start");
            }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            시작
          </button>
        ) : (
          <button
            onClick={() => {
              setRunning(false);

              /* v2 이벤트: 1분 타이머 일시정지 */
              pushEvent("v2_timer_1m_pause");
            }}
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
   Floating Timer (결과 타이머 보기) — v2 이벤트 추가
============================================================ */
function FloatingTimer({ open, onClose, initSeconds, label }) {
  const [seconds, setSeconds] = useState(initSeconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    setSeconds(initSeconds);
    setRunning(true);

    if (open) {
      /* v2 이벤트: 결과 타이머 열기 */
      pushEvent("v2_timer_view_open", {
        timer_label: label,
        init_seconds: initSeconds,
      });
    }
  }, [initSeconds, open]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          playBeep();
          setRunning(false);

          /* v2 이벤트: 결과 타이머 종료 */
          pushEvent("v2_timer_view_done", {
            timer_label: label,
          });

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
        <button
          onClick={() => {
            /* v2 이벤트: 결과 타이머 닫기 */
            pushEvent("v2_timer_view_close", {
              timer_label: label,
              seconds_left: seconds,
            });

            onClose();
          }}
        >
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
            onClick={() => {
              setRunning(false);
              pushEvent("v2_timer_view_pause", { timer_label: label });
            }}
            className="px-3 py-1 rounded-lg bg-yellow-500 text-white text-sm"
          >
            일시정지
          </button>
        ) : (
          <button
            onClick={() => {
              setRunning(true);
              pushEvent("v2_timer_view_resume", { timer_label: label });
            }}
            className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm"
          >
            다시 시작
          </button>
        )}

        <button
          onClick={() => {
            setSeconds(initSeconds);
            pushEvent("v2_timer_view_reset", { timer_label: label });
          }}
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

            if (v.endsWith("%")) {
              return parseFloat(v.replace("%", "")) / 100;
            }
            return Number(v) || 0;
          })(),
        }))
      );
      setLoaded(true);

      pushEvent("v2_sheet_loaded");
    }
    load();
  }, []);

  return { huntcal: rows, loaded };
}

/* ============================================================
   Item AutoComplete Component — v2 필드 포커스 이벤트 추가
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
        onFocus={() => {
          setFocus(true);
          pushEvent("v2_field_focus", { field_name: "item_search" });
        }}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        onChange={(e) => {
          onChangeText(e.target.value);
          pushEvent("v2_field_input", {
            field_name: "item_search",
            length: e.target.value.length,
          });
        }}
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
                pushEvent("v2_item_select", { item: name });
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
   계산 로직
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
/* ============================================================
   Main App — v2 이벤트 완전 적용
============================================================ */
export default function App() {
  const { huntcal, loaded } = useHuntcal();

  /* ----------------------- 상태 ----------------------- */
  const [mode, setMode] = useState("popular");
  const [inputMode, setInputMode] = useState("kills");

  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemName, setSelectedItemName] = useState("");
  const [selectedMonsterName, setSelectedMonsterName] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);

  const [dropRatePct, setDropRatePct] = useState("");
  const [monsterXp, setMonsterXp] = useState("");
  const [xpBefore, setXpBefore] = useState("");
  const [xpAfter, setXpAfter] = useState("");
  const [kills1min, setKills1min] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerLabel, setTimerLabel] = useState("아이템");

  /* ----------------------- 항목 목록 ----------------------- */
  const itemOptions = useMemo(() => {
    const set = new Set();
    huntcal.forEach((r) => {
      if (r.ItemName) set.add(r.ItemName);
    });
    return Array.from(set);
  }, [huntcal]);

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
     선택 핸들러 — v2 이벤트 포함
  ------------------------------------------------------------ */
  const handleItemSelect = (name) => {
    pushEvent("v2_item_select", { item: name });

    setSelectedItemName(name);
    setItemSearch(name);
    setSelectedMonsterName("");
    setSelectedRow(null);
    setDropRatePct("");
    setMonsterXp("");
    setSubmitted(false);
  };

  const handleMonsterSelect = (monsterName) => {
    pushEvent("v2_monster_select", { monster: monsterName });

    setSelectedMonsterName(monsterName);
    const row =
      monsterOptions.find((m) => m.MonsterName === monsterName) || null;

    setSelectedRow(row);
    if (row) {
  setMonsterXp(String(row.XP || ""));
  const pct = (row.DropRate || 0) * 100;
  setDropRatePct(String(pct));

  /* ★ 자동 drop rate 설정 이벤트 */
  pushEvent("v2_drop_rate_set", {
    drop_rate_source: "auto",
    drop_rate: pct,
    item: selectedItemName,
    monster: monsterName,
  });
  }  else {
      setMonsterXp("");
      setDropRatePct("");
    }
    setSubmitted(false);
    
  };

  /* ------------------------------------------------------------
     계산 준비
  ------------------------------------------------------------ */
  const rate = (Number(dropRatePct) || 0) / 100;
  const xp = Number(monsterXp) || 0;
  const before = Number(xpBefore) || 0;
  const after = Number(xpAfter) || 0;
  const xpGain = after - before;
  const killsManual = Number(kills1min) || 0;

  const killsPerMin =
    inputMode === "xp"
      ? xpGain > 0 && xp > 0
        ? xpGain / xp
        : 0
      : killsManual;

  const summaryMetrics = computeExpectedTime(rate, killsPerMin);

  const huntLabel = "드롭 몬스터 기준 사냥 속도";
  const timeAvg = formatTime(summaryMetrics?.secAvg || 0);
  const time90 = formatTime(summaryMetrics?.sec90 || 0);

  /* ----------------------- 타이머 열기 ----------------------- */
  const openTimer = (seconds, label) => {
  if (!seconds || seconds <= 0) return;

  // 어떤 타이머인지 조건 분기
  if (label.includes("평균")) {
    pushEvent("v2_timer_avg_open", {
      timer_label: label,
      seconds_init: seconds,
    });
  } else if (label.includes("90%")) {
    pushEvent("v2_timer_90_open", {
      timer_label: label,
      seconds_init: seconds,
    });
  }

  setTimerSeconds(seconds);
  setTimerLabel(label || "아이템");
  setShowTimer(true);
};

  /* ============================================================
     렌더링 시작
  ============================================================ */
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-neutral-50 to-white">
      {/* HEADER */}
      <header className="w-full text-center py-10">
        <h1 className="text-5xl font-extrabold tracking-tight">얼마나 잡아야 뜰까?</h1>
      </header>

      {/* MAIN */}
      <main className="flex-grow w-full flex justify-center px-6 pb-28">
        <div className="w-full max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-12">

          {/* LEFT CARD — 입력 */}
          <Card>
            <CardHeader
              title="아이템 선택"
              icon={<Calculator className="h-5 w-5 text-neutral-500" />}
            />
            <CardContent className="space-y-6">
              {!loaded && (
                <div className="text-xs text-neutral-400">구글 시트에서 데이터를 불러오는 중입니다...</div>
              )}

              {/* 탭 */}
              <div className="flex rounded-xl bg-neutral-100 p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                    mode === "popular" ? "bg-white shadow-sm" : "text-neutral-500"
                  }`}
                  onClick={() => {
                    setMode("popular");
                    pushEvent("v2_mode_change", { mode: "popular" });
                  }}
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
                    pushEvent("v2_mode_change", { mode: "manual" });

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

              {/* ---------------- 인기 아이템 모드 ---------------- */}
              {mode === "popular" && (
                <div className="space-y-5">

                  {/* 아이템 검색 */}
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
                        }
                      }}
                      onSelect={handleItemSelect}
                    />
                  </div>

                  {/* 몬스터 선택 */}
                  <div>
                    <Label>드롭 몬스터</Label>
                    <MonsterSelect
                      monsters={monsterOptions}
                      value={selectedMonsterName}
                      disabled={!selectedItemName}
                      onSelect={handleMonsterSelect}
                    />
                  </div>

                  {/* 선택된 몬스터 정보 */}
                  {(selectedRow || dropRatePct) && (
                    <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs space-y-1">
                      {selectedRow && (
                        <>
                          <div className="font-semibold text-neutral-900 text-sm">
                            {selectedRow.MonsterName}
                            {selectedRow.Level ? ` (LV ${selectedRow.Level})` : ""}
                          </div>

                          {/* 테이블 헤더 */}
                          <div className="flex gap-6 mt-2 text-neutral-500">
                            <div className="w-16">HP</div>
                            <div className="w-16">경험치</div>
                            <div className="w-20">드롭률</div>
                          </div>

                          {/* 테이블 값 */}
                          <div className="flex gap-6 mt-1 font-medium">
                            <div className="w-16">{selectedRow.HP.toLocaleString()}</div>
                            <div className="w-16">{selectedRow.XP.toLocaleString()}</div>
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

              {/* ---------------- 직접 입력 모드 ---------------- */}
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
                      onChange={(e) => {
                        setDropRatePct(e.target.value);
                        pushEvent("v2_field_input", {
                          field_name: "manual_drop_rate",
                          length: e.target.value.length,
                        });
                      }}
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">
                      드롭률이 0.006%인 경우 0.006으로 입력하세요.
                    </p>
                  </div>
                </div>
              )}

              {/* ---------------- 측정 방식 선택 ---------------- */}
              <div className="space-y-3 pt-2">
                <Label>측정 방식</Label>

                <div className="flex rounded-xl bg-neutral-100 p-1">
                  <button
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                      inputMode === "kills" ? "bg-white shadow-sm" : "text-neutral-500"
                    }`}
                    onClick={() => {
                      setInputMode("kills");
                      pushEvent("v2_mode_change", { input_mode: "kills" });
                    }}
                  >
                    1분당 처치 수
                  </button>

                  <button
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                      inputMode === "xp" ? "bg-white shadow-sm" : "text-neutral-500"
                    }`}
                    onClick={() => {
                      setInputMode("xp");
                      pushEvent("v2_mode_change", { input_mode: "xp" });
                    }}
                  >
                    1분 사냥 경험치
                  </button>
                </div>

              </div>

              {/* XP 모드에서만 표시 */}
              {mode === "manual" && inputMode === "xp" && (
                <div className="pt-2">
                  <Label>드롭 몬스터 경험치</Label>
                  <Input
                    type="number"
                    placeholder="예: 1620"
                    value={monsterXp}
                    onChange={(e) => {
                      setMonsterXp(e.target.value);
                      pushEvent("v2_field_input", {
                        field_name: "monster_xp",
                        length: e.target.value.length,
                      });
                    }}
                  />
                </div>
              )}

              {/* kills 입력 */}
              {inputMode === "kills" && (
                <div className="pt-1 space-y-3">
                  <div>
                    <Label>1분당 처치 수</Label>
                    <Input
                      type="number"
                      placeholder="예: 50"
                      value={kills1min}
                      onChange={(e) => {
                        setKills1min(e.target.value);
                        pushEvent("v2_field_input", {
                          field_name: "kills_per_min",
                          length: e.target.value.length,
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              {/* XP 입력 */}
              {inputMode === "xp" && (
                <div className="space-y-4 pt-1">
                  <div>
                    <Label>사냥 전 경험치</Label>
                    <Input
                      type="number"
                      placeholder="예: 1423112"
                      value={xpBefore}
                      onChange={(e) => {
                        setXpBefore(e.target.value);
                        pushEvent("v2_field_input", {
                          field_name: "xp_before",
                          length: e.target.value.length,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label>1분 사냥 후 경험치</Label>
                    <Input
                      type="number"
                      placeholder="예: 1430012"
                      value={xpAfter}
                      onChange={(e) => {
                        setXpAfter(e.target.value);
                        pushEvent("v2_field_input", {
                          field_name: "xp_after",
                          length: e.target.value.length,
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 1분 타이머 항상 표시 */}
              <div className="pt-4 space-y-1">
                <OneMinuteTimer />
              </div>

              {/* 계산 버튼 */}
              <button
                type="button"
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
                onClick={() => {
                  setSubmitted(true);

                  pushEvent("v2_calc_click", {
                    item: selectedItemName,
                    monster: selectedMonsterName,
                    drop_rate_source: mode === "manual" ? "manual" : "auto",
                    drop_rate: dropRatePct,
                    mode: inputMode,
                  });
                }}
              >
                드롭 예상 시간 계산
              </button>
            </CardContent>
          </Card>

          {/* RIGHT CARD — 결과 */}
          <Card>
            <CardHeader
              title="계산 결과"
              icon={<Calculator className="h-5 w-5 text-neutral-500" />}
            />
            <CardContent className="space-y-5">
              {!submitted && (
                <p className="text-neutral-500 text-sm">
                  왼쪽에서 정보를 입력한 뒤 <strong>드롭 예상 시간 계산</strong> 버튼을 눌러 주세요.
                </p>
              )}

              {submitted && !summaryMetrics && (
                <p className="text-rose-500 text-sm">
                  계산에 필요한 값이 충분하지 않습니다.
                </p>
              )}

              {submitted && summaryMetrics && (
                <>
                  <div className="space-y-2 text-xs text-neutral-500">
                    <div className="font-semibold text-neutral-800">{huntLabel}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-neutral-500">기대 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-bold">
                        {summaryMetrics.expected.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-neutral-500">현재 속도</div>
                      <div className="mt-1 text-xl font-bold">
                        {summaryMetrics.killsPerMin.toFixed(1)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-neutral-500">1시간 사냥 마리 수</div>
                      <div className="mt-1 text-xl font-bold">
                        {summaryMetrics.killsPerHr.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 시간 계산 결과 */}
                  <div className="pt-4 mt-2 border-t border-neutral-200 space-y-3 text-sm">

                    {/* 평균 시간 */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div>평균적인 기대 시간</div>
                        <div className="text-[11px] text-neutral-500">(드롭 확률 63.2%)</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold">{timeAvg.label}</div>

                        <button
                          type="button"
                          className="text-xs font-semibold text-blue-600"
                          onClick={() => {
                            openTimer(summaryMetrics.secAvg, `평균 기대 시간`);
                          }}
                        >
                          타이머 보기
                        </button>
                      </div>
                    </div>

                    {/* 90% 도달 시간 */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div>무조건 1개 뜨는 시간</div>
                        <div className="text-[11px] text-neutral-500">(드롭 확률 90%)</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold">{time90.label}</div>

                        <button
                          type="button"
                          className="text-xs font-semibold text-blue-600"
                          onClick={() => {
                            pushEvent("v2_timer_90_open", {
                              seconds_init: summaryMetrics.sec90,
                            });
                            openTimer(summaryMetrics.sec90, `90% 도달 시간`);
                          }}
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

      {/* FLOATING TIMER */}
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
