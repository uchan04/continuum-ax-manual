import { useState } from "react";
import { missingFeedbackFields } from "./validation";
import { buildBriefing, canBrief, accountSection, type Manual, type BriefingSection } from "./knowledge";

interface BriefCost {
  krw: number;
  promptTokens: number;
  completionTokens: number;
  model: string;
  elapsedMs: number;
}

type SyncState = "idle" | "sending" | "sent" | "local-only" | "failed";
/** 평상시 축적(1~3) → 퇴사 이벤트(4) → 피드백(5). 사업계획서 작동방식 순서 그대로. */
type Phase = 1 | 2 | 3 | 4 | 5;

interface Submission {
  timestamp: string;
  companyName: string;
  email: string;
  successorRole: string;
  manualCount: number;
  manualTypes: string[];
  totalGenSeconds: number;
  revokeRun: boolean;
  briefingSections: number;
  /** 실제 LLM 호출 원가. 사업계획서 8번 검증항목 ② (건당 692원 성립 여부). */
  briefCostKrw: number | null;
  briefModel: string | null;
  briefPromptTokens: number | null;
  briefCompletionTokens: number | null;
  starRating: number;
  searchTimeSaved: string | null;
  continueChoice: string | null;
  priceChoice: string | null;
}

const TASK_OPTIONS = [
  { value: "cs", label: "CS 응대" },
  { value: "minutes", label: "회의록 작성" },
  { value: "docs", label: "문서 작성" },
  { value: "data", label: "데이터 분석" },
  { value: "email", label: "이메일 작성" },
  { value: "report", label: "보고서 작성" },
];

const PROMPT_BY_TASK: Record<string, { icon: string; prompt: string }> = {
  cs: { icon: "💬", prompt: "다음 고객 문의를 분석하고, 회사 정책에 맞는 공손하고 명확한 답변 초안을 작성해줘. 핵심 불만 포인트를 먼저 인식하고, 해결책을 단계별로 설명한 뒤 다음 액션을 제안해줘.\n\n문의 내용: [고객 문의 내용 붙여넣기]" },
  minutes: { icon: "📋", prompt: "다음 회의 내용을 구조화된 회의록으로 정리해줘. 형식: 1) 회의 목적 2) 주요 논의사항 3) 결정된 사항 4) 액션 아이템 (담당자/기한 포함) 5) 다음 회의 안건.\n\n회의 내용: [회의 내용 붙여넣기]" },
  docs: { icon: "📝", prompt: "다음 요구사항을 바탕으로 비즈니스 문서 초안을 작성해줘. 전문적이고 간결한 문체를 유지하고, 핵심 내용이 첫 단락에 오도록 해줘. 각 섹션은 소제목으로 구분해줘.\n\n요구사항: [문서 요구사항 작성]" },
  data: { icon: "📊", prompt: "다음 데이터를 분석하고 실행 가능한 인사이트를 포함한 리포트를 작성해줘. 구성: 1) 핵심 요약 (3줄 이내) 2) 주요 트렌드 3) 이상치 4) 권장 액션 3가지.\n\n데이터: [데이터 붙여넣기]" },
  email: { icon: "✉️", prompt: "다음 용건으로 비즈니스 이메일을 작성해줘. 수신자와의 관계에 맞는 톤을 유지하고, 요청사항과 기한을 명확히 드러내줘.\n\n용건: [메일 용건 작성]" },
  report: { icon: "📈", prompt: "다음 내용을 정기 보고서 형식으로 정리해줘. 구성: 1) 기간 내 주요 성과 2) 진행 중 과제와 현황 3) 리스크 4) 다음 기간 계획.\n\n내용: [보고 내용 붙여넣기]" },
};

// 사업계획서 작동방식 #2 — API가 열린 앱은 자동, 폐쇄형 ERP는 RPA, 그 외는 수동.
const ACCOUNTS = [
  { name: "이메일 · 캘린더", via: "auto" as const },
  { name: "Slack", via: "auto" as const },
  { name: "협업 도구 (문서·위키)", via: "auto" as const },
  { name: "광고 플랫폼", via: "auto" as const },
  { name: "이카운트 ERP", via: "rpa" as const },
  { name: "사내 그룹웨어", via: "manual" as const },
];

const STORAGE_KEY = "ax_manual_submissions";
const MAX_FILE_BYTES = 1_000_000;

export default function AXManualTab() {
  const [phase, setPhase] = useState<Phase>(1);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");

  // 평상시 축적
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [taskType, setTaskType] = useState("cs");
  const [uploadText, setUploadText] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadingPct, setLoadingPct] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 퇴사 이벤트
  const [leaverName, setLeaverName] = useState("");
  const [lastDay, setLastDay] = useState("");
  const [successorRole, setSuccessorRole] = useState("");
  const [revokeStarted, setRevokeStarted] = useState(false);
  const [revokedCount, setRevokedCount] = useState(0);
  const [briefingReady, setBriefingReady] = useState(false);
  const [briefing, setBriefing] = useState<BriefingSection[]>([]);
  const [briefingState, setBriefingState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [briefCost, setBriefCost] = useState<BriefCost | null>(null);

  // 피드백
  const [starRating, setStarRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [searchTimeSaved, setSearchTimeSaved] = useState<string | null>(null);
  const [priceChoice, setPriceChoice] = useState<string | null>(null);
  const [continueChoice, setContinueChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const LOADING_MSGS = [
    "업무 데이터를 분석하는 중...",
    "반복 업무 패턴을 식별하는 중...",
    "최적 프롬프트 구조를 설계하는 중...",
    "벡터 DB에 업무 맥락을 축적하는 중...",
    "매뉴얼을 완성하는 중...",
  ];

  const missingFields = missingFeedbackFields({ starRating, savedHours: searchTimeSaved, continueChoice, priceChoice });
  const canSubmit = missingFields.length === 0;
  const totalGenSeconds = Math.round(manuals.reduce((sum, m) => sum + m.genSeconds, 0) * 10) / 10;

  const saveLocally = (record: Submission) => {
    try {
      const prior: Submission[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...prior, record]));
    } catch { /* 시크릿 모드 등 — 웹훅 전송은 계속 시도 */ }
  };

  const sendToCollector = async (record: Submission): Promise<SyncState> => {
    const url = import.meta.env.VITE_COLLECTOR_URL;
    if (!url) return "local-only";
    try {
      // 구글 앱스스크립트 웹훅은 프리플라이트를 막는 경우가 많아 no-cors 로 보낸다.
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, mode: "no-cors", body: JSON.stringify(record) });
      return "sent";
    } catch {
      return "failed";
    }
  };

  const exportSubmissions = () => {
    const blob = new Blob([localStorage.getItem(STORAGE_KEY) || "[]"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ax-submissions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const submitFeedback = async () => {
    if (!canSubmit) return;
    const record: Submission = {
      timestamp: new Date().toISOString(),
      companyName, email, successorRole,
      manualCount: manuals.length,
      manualTypes: manuals.map(m => m.taskType),
      totalGenSeconds,
      // 퇴사자 이름·근무일은 제3자 개인정보라 저장하지 않고 사용 여부만 남긴다.
      revokeRun: revokeStarted,
      briefingSections: briefing.length,
      briefCostKrw: briefCost?.krw ?? null,
      briefModel: briefCost?.model ?? null,
      briefPromptTokens: briefCost?.promptTokens ?? null,
      briefCompletionTokens: briefCost?.completionTokens ?? null,
      starRating, searchTimeSaved, continueChoice, priceChoice,
    };
    saveLocally(record);
    setSubmitted(true);
    setSyncState("sending");
    setSyncState(await sendToCollector(record));
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const tooBig = files.filter(f => f.size > MAX_FILE_BYTES).map(f => f.name);
    const ok = files.filter(f => f.size <= MAX_FILE_BYTES);
    setFileError(tooBig.length ? `${tooBig.join(", ")} — 1MB를 넘어 제외했습니다.` : null);
    if (ok.length === 0) return;
    const chunks = await Promise.all(ok.map(async f => `--- ${f.name} ---\n${await f.text()}`));
    setUploadText(prev => [prev, ...chunks].filter(Boolean).join("\n\n"));
    setFileNames(prev => [...new Set([...prev, ...ok.map(f => f.name)])]);
  };

  const generateManual = () => {
    setPhase(2);
    setLoadingPct(0);
    setLoadingMsg(LOADING_MSGS[0]);
    const start = Date.now();
    let pct = 0;
    let msgIdx = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 3.5 + 1;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
        const opt = TASK_OPTIONS.find(t => t.value === taskType)!;
        setManuals(prev => [...prev, {
          id: `${taskType}-${Date.now()}`,
          taskType, label: opt.label,
          createdAt: new Date().toISOString().slice(0, 10),
          genSeconds: Math.round((Date.now() - start) / 100) / 10,
          sampleChars: uploadText.length,
          fileNames,
          sample: uploadText,
        }]);
        setUploadText(""); setFileNames([]); setFileError(null);
        setTimeout(() => setPhase(3), 500);
      }
      setLoadingPct(Math.min(Math.round(pct), 100));
      const newIdx = Math.floor((pct / 100) * LOADING_MSGS.length);
      if (newIdx !== msgIdx && newIdx < LOADING_MSGS.length) { msgIdx = newIdx; setLoadingMsg(LOADING_MSGS[msgIdx]); }
    }, 120);
  };

  // 축적된 매뉴얼을 서버로 보내 실제 LLM 으로 브리핑을 생성한다.
  // 키는 서버에만 있으므로 여기서는 /api/brief 만 부른다.
  const generateBriefing = async () => {
    setBriefingReady(true);
    setBriefingState("loading");
    setBriefingError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successorRole,
          manuals: manuals.map(m => ({ label: m.label, taskType: m.taskType, createdAt: m.createdAt, sample: m.sample })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`);

      const sections: BriefingSection[] = data.sections.map((s: { title: string; body: string; sourceLabel: string }) => ({
        icon: "📌",
        title: s.title,
        body: s.body,
        source: s.sourceLabel || "축적 매뉴얼",
        derivedFrom: "manual" as const,
      }));
      setBriefing(revokeStarted ? [...sections, ...accountSection] : sections);
      setBriefCost({ krw: data.usage.costKrw, promptTokens: data.usage.promptTokens, completionTokens: data.usage.completionTokens, model: data.model, elapsedMs: data.elapsedMs });
      setBriefingState("done");
    } catch (e) {
      // 실패해도 데모가 멈추면 안 되므로 규칙 기반 브리핑으로 되돌린다.
      setBriefing(buildBriefing(manuals, revokeStarted));
      setBriefCost(null);
      setBriefingError(e instanceof Error ? e.message : "알 수 없는 오류");
      setBriefingState("error");
    }
  };

  const runRevoke = () => {
    setRevokeStarted(true);
    ACCOUNTS.forEach((acc, i) => {
      if (acc.via === "manual") return; // 수동 대상은 자동 시퀀스에서 제외
      setTimeout(() => setRevokedCount(i + 1), 400 * (i + 1));
    });
  };

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const resetAll = () => {
    setPhase(1); setCompanyName(""); setEmail("");
    setManuals([]); setTaskType("cs"); setUploadText(""); setFileNames([]); setFileError(null);
    setLeaverName(""); setLastDay(""); setSuccessorRole("");
    setRevokeStarted(false); setRevokedCount(0); setBriefingReady(false);
    setBriefing([]); setBriefingState("idle"); setBriefingError(null); setBriefCost(null);
    setStarRating(0); setSearchTimeSaved(null); setPriceChoice(null); setContinueChoice(null);
    setSubmitted(false); setSyncState("idle");
  };

  const s: React.CSSProperties = { height: "100%", overflowY: "auto", padding: "28px 32px", fontFamily: "Inter, system-ui, sans-serif" };
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
  const input: React.CSSProperties = { width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 13px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" };
  const label: React.CSSProperties = { fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 };

  // 타임라인 — 평상시 축적과 이벤트가 순서대로 이어진다는 걸 화면에 드러낸다.
  const Timeline = () => {
    const stages = [
      { at: [1, 2, 3] as Phase[], label: "평상시 · 지식 축적", note: manuals.length > 0 ? `매뉴얼 ${manuals.length}건` : "매뉴얼 0건" },
      { at: [4] as Phase[], label: "이벤트 · 퇴사 인수인계", note: briefingReady ? `브리핑 ${briefing.length}개 섹션` : "미발생" },
      { at: [5] as Phase[], label: "피드백", note: submitted ? "제출 완료" : "대기" },
    ];
    return (
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 26 }}>
        {stages.map((st, i) => {
          const active = st.at.includes(phase);
          const done = phase > Math.max(...st.at);
          return (
            <div key={st.label} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: active ? "#eef2ff" : done ? "#f0fdf4" : "#f9fafb", border: `1px solid ${active ? "#c7d2fe" : done ? "#bbf7d0" : "#f0f0f5"}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#4338ca" : done ? "#16a34a" : "#9ca3af" }}>
                  {done ? "✓ " : ""}{st.label}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{st.note}</div>
              </div>
              {i < stages.length - 1 && <span style={{ fontSize: 14, color: "#d1d5db" }}>→</span>}
            </div>
          );
        })}
      </div>
    );
  };

  // ── 1. 매뉴얼 작성 입력 ────────────────────────────────────────────────────
  if (phase === 1) {
    const first = manuals.length === 0;
    const canStart = Boolean(companyName && email);
    return (
      <div style={s}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Timeline />
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 999, padding: "5px 16px", marginBottom: 16, background: "#fff" }}>
              <span style={{ fontSize: 8, color: "#6366f1" }}>●</span>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, letterSpacing: "0.06em" }}>STEP 1 · 평상시 지식 축적</span>
            </div>
            <h1 style={{ margin: "0 0 12px", fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1.3, letterSpacing: "-0.03em" }}>
              업무 매뉴얼을 만들수록<br /><span style={{ color: "#6366f1" }}>인수인계 브리핑</span>이 채워집니다
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.75 }}>
              평상시 쌓은 매뉴얼이 벡터 DB에 축적되고, 퇴사·이동이 발생하면<br />그 맥락에서 후임자 맞춤 브리핑이 생성됩니다.
            </p>
          </div>

          <div style={{ ...card, padding: "26px 28px" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
              {first ? "첫 매뉴얼 만들기" : `매뉴얼 추가하기 (현재 ${manuals.length}건 축적)`}
              {first && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "#16a34a", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 5, padding: "2px 8px" }}>무료</span>}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {first && (
                <>
                  <div>
                    <label style={label}>회사명 *</label>
                    <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="예: 스타트업 주식회사" style={input} />
                  </div>
                  <div>
                    <label style={label}>업무용 이메일 *</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" style={input} />
                  </div>
                </>
              )}
              <div>
                <label style={label}>이번에 매뉴얼로 만들 업무 *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {TASK_OPTIONS.map(opt => {
                    const already = manuals.some(m => m.taskType === opt.value);
                    return (
                      <button key={opt.value} onClick={() => setTaskType(opt.value)} style={{
                        padding: "9px 12px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                        background: taskType === opt.value ? "#eef2ff" : "#f9fafb",
                        borderColor: taskType === opt.value ? "#6366f1" : "#e5e7eb",
                        color: taskType === opt.value ? "#6366f1" : "#6b7280",
                      }}>{already ? "✓ " : ""}{opt.label}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={label}>업무 샘플 데이터 <span style={{ color: "#9ca3af", fontWeight: 400 }}>(선택 · 넣을수록 브리핑이 정확해집니다)</span></label>
                <textarea value={uploadText} onChange={e => setUploadText(e.target.value)} rows={3}
                  placeholder="실제 업무 내용, CS 답변 예시, 회의록 샘플 등을 붙여넣어 주세요."
                  style={{ ...input, fontSize: 12, resize: "vertical", lineHeight: 1.65 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "#f9fafb", border: "1px dashed #c7d2fe", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#6366f1", cursor: "pointer" }}>
                    📎 파일 첨부
                    <input type="file" accept=".txt,.md,.csv,.json" multiple onChange={handleFiles} style={{ display: "none" }} />
                  </label>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>txt · md · csv · json (파일당 최대 1MB)</span>
                </div>
                {fileNames.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {fileNames.map(n => (
                      <span key={n} style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: "#4338ca" }}>✓ {n}</span>
                    ))}
                  </div>
                )}
                {fileError && <p style={{ fontSize: 11, color: "#dc2626", margin: "8px 0 0" }}>{fileError}</p>}
                {uploadText && <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>입력된 샘플 데이터 {uploadText.length.toLocaleString()}자</p>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {!first && (
                <button onClick={() => setPhase(3)} style={{ padding: "12px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>← 축적 현황</button>
              )}
              <button onClick={() => canStart && generateManual()} style={{
                flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none",
                background: canStart ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f3f4f6",
                color: canStart ? "#fff" : "#9ca3af", cursor: canStart ? "pointer" : "not-allowed",
                boxShadow: canStart ? "0 4px 16px rgba(99,102,241,0.3)" : "none",
              }}>{canStart ? "✦  매뉴얼 생성" : "회사명과 이메일을 입력해주세요"}</button>
            </div>
            <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: "8px 0 0" }}>첫 매뉴얼 무료 · 신용카드 불필요 · 샘플 원문은 저장하지 않습니다</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. 생성 중 ─────────────────────────────────────────────────────────────
  if (phase === 2) return (
    <div style={{ ...s, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 28px" }}>
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: "2px solid #c7d2fe", animation: "spin 4s linear infinite" }} />
          <div style={{ position: "absolute", inset: 14, borderRadius: "50%", border: "1.5px dashed #a5b4fc", animation: "spin 7s linear infinite reverse" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
              <span style={{ fontSize: 18, color: "#fff" }}>✦</span>
            </div>
          </div>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>매뉴얼을 생성하고 맥락을 축적하는 중</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 28px" }}>{loadingMsg}</p>
        <div style={{ ...card, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>진행률</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>{loadingPct}%</span>
          </div>
          <div style={{ height: 7, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ height: "100%", width: `${loadingPct}%`, background: "linear-gradient(90deg,#6366f1,#a5b4fc)", borderRadius: 4, transition: "width 0.18s ease" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {LOADING_MSGS.map((msg, i) => {
              const done = loadingPct >= ((i + 1) / LOADING_MSGS.length) * 100;
              const active = !done && loadingPct >= (i / LOADING_MSGS.length) * 100;
              return (
                <div key={msg} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, background: done ? "#16a34a" : active ? "#6366f1" : "#f3f4f6", color: done || active ? "#fff" : "#d1d5db" }}>{done ? "✓" : active ? "●" : i + 1}</div>
                  <span style={{ fontSize: 11, color: done ? "#16a34a" : active ? "#111827" : "#9ca3af", fontWeight: active ? 600 : 400 }}>{msg}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // ── 3. 축적 현황 (허브) ────────────────────────────────────────────────────
  if (phase === 3) return (
    <div style={s}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Timeline />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 6, padding: "3px 10px", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>✓ 축적 완료</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{companyName || "우리 회사"}의 지식 베이스</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>매뉴얼 {manuals.length}건 · 생성 소요 합계 {totalGenSeconds}초 (실측)</p>
          </div>
          <button onClick={() => setPhase(1)} style={{ padding: "9px 18px", background: "#fff", border: "1px solid #6366f1", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#6366f1", cursor: "pointer" }}>+ 매뉴얼 추가</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {manuals.map(m => {
            const p = PROMPT_BY_TASK[m.taskType];
            return (
              <div key={m.id} style={{ ...card, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{p?.icon ?? "📌"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{m.label} 매뉴얼</span>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{m.createdAt} · {m.genSeconds}초</span>
                  </div>
                  {p && (
                    <button onClick={() => copy(m.id, p.prompt)} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: copiedKey === m.id ? "#dcfce7" : "#f3f4f6", border: `1px solid ${copiedKey === m.id ? "#86efac" : "#e5e7eb"}`, color: copiedKey === m.id ? "#16a34a" : "#6b7280" }}>
                      {copiedKey === m.id ? "✓ 복사됨" : "복사"}</button>
                  )}
                </div>
                {p && (
                  <div style={{ padding: "12px 14px", background: "#fafafa" }}>
                    <pre style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#374151", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{p.prompt}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ ...card, padding: "20px 22px", borderColor: "#fde68a", background: "#fffbeb" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#92400e", margin: "0 0 6px" }}>퇴사 · 인사이동이 발생했다면</h3>
          <p style={{ fontSize: 12, color: "#92400e", margin: "0 0 14px", lineHeight: 1.7 }}>
            지금 축적된 <strong>{manuals.length}건</strong>의 매뉴얼에서 후임자 맞춤 브리핑이 생성됩니다.
            축적이 많을수록 브리핑이 촘촘해집니다.
          </p>
          <button onClick={() => setPhase(4)} disabled={!canBrief(manuals)} style={{
            padding: "11px 22px", borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none",
            background: canBrief(manuals) ? "#dc2626" : "#e5e7eb", color: canBrief(manuals) ? "#fff" : "#9ca3af",
            cursor: canBrief(manuals) ? "pointer" : "not-allowed",
          }}>퇴사 이벤트 입력 →</button>
        </div>
        <div style={{ height: 32 }} />
      </div>
    </div>
  );

  // ── 4. 퇴사 이벤트 ─────────────────────────────────────────────────────────
  if (phase === 4) {
    const canBrief4 = Boolean(leaverName && successorRole);
    return (
      <div style={s}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Timeline />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>퇴사 · 인사이동 처리</h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>계정 권한을 차단하고, 축적된 매뉴얼에서 브리핑을 생성합니다.</p>

          <div style={{ ...card, padding: "22px 24px", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label}>퇴사자 이름 *</label>
                <input value={leaverName} onChange={e => setLeaverName(e.target.value)} placeholder="예: 김OO" style={input} />
              </div>
              <div>
                <label style={label}>마지막 근무일 <span style={{ color: "#9ca3af", fontWeight: 400 }}>(선택)</span></label>
                <input type="date" value={lastDay} onChange={e => setLastDay(e.target.value)} style={input} />
              </div>
            </div>
            <div>
              <label style={label}>후임자 직급/역할 * <span style={{ color: "#9ca3af", fontWeight: 400 }}>— 이 직급의 인가 범위로 브리핑이 필터링됩니다</span></label>
              <input value={successorRole} onChange={e => setSuccessorRole(e.target.value)} placeholder="예: 신입 마케팅 매니저" style={input} />
            </div>
          </div>

          {/* 계정 권한 차단 */}
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: "0 0 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>계정 · 권한 차단</h3>
          <div style={{ ...card, padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {lastDay ? `마지막 근무일 ${lastDay} 기준` : "마지막 근무일 미입력"} · 자동 차단 대상 {ACCOUNTS.filter(a => a.via !== "manual").length}건
              </div>
              {!revokeStarted && (
                <button onClick={runRevoke} disabled={!leaverName} style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none",
                  background: leaverName ? "#dc2626" : "#e5e7eb", color: leaverName ? "#fff" : "#9ca3af", cursor: leaverName ? "pointer" : "not-allowed" }}>
                  원클릭 권한 차단 실행
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {ACCOUNTS.map((acc, i) => {
                const done = revokeStarted && acc.via !== "manual" && revokedCount > i;
                const running = revokeStarted && acc.via !== "manual" && revokedCount === i;
                const badge = acc.via === "auto" ? "API 연동" : acc.via === "rpa" ? "RPA · 월 구독" : "수동 확인 필요";
                return (
                  <div key={acc.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: done ? "#f0fdf4" : "#f9fafb", border: `1px solid ${done ? "#bbf7d0" : "#f0f0f5"}` }}>
                    <span style={{ width: 16, textAlign: "center", fontSize: 12, color: done ? "#16a34a" : running ? "#6366f1" : "#d1d5db" }}>{done ? "✓" : running ? "●" : acc.via === "manual" ? "!" : "○"}</span>
                    <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{acc.name}</span>
                    <span style={{ fontSize: 10, color: acc.via === "manual" ? "#b45309" : "#6b7280", background: acc.via === "manual" ? "#fef3c7" : "#f3f4f6", border: `1px solid ${acc.via === "manual" ? "#fde68a" : "#e5e7eb"}`, borderRadius: 5, padding: "2px 7px" }}>{badge}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, width: 62, textAlign: "right", color: done ? "#16a34a" : running ? "#6366f1" : "#9ca3af" }}>{done ? "차단됨" : running ? "차단 중" : acc.via === "manual" ? "대기" : "미처리"}</span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 10, color: "#9ca3af", margin: "12px 0 0", lineHeight: 1.6 }}>
              PoC 시뮬레이션입니다. 실제 SaaS·ERP 계정은 차단되지 않으며, API 연동과 RPA는 유료 베타에서 제공됩니다.
            </p>
          </div>

          {/* 브리핑 */}
          {!briefingReady ? (
            <button onClick={() => canBrief4 && generateBriefing()} style={{
              width: "100%", padding: "13px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none",
              background: canBrief4 ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f3f4f6",
              color: canBrief4 ? "#fff" : "#9ca3af", cursor: canBrief4 ? "pointer" : "not-allowed",
              boxShadow: canBrief4 ? "0 4px 16px rgba(99,102,241,0.3)" : "none",
            }}>{canBrief4 ? `✦  축적된 매뉴얼 ${manuals.length}건에서 브리핑 생성` : "퇴사자 이름과 후임자 직급을 입력해주세요"}</button>
          ) : (
            <>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: "0 0 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                브리핑 · {successorRole} 인가 범위
              </h3>
              {briefingState === "loading" && (
                <div style={{ ...card, padding: "28px 24px", textAlign: "center", marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, margin: "0 auto 12px", borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#6366f1", animation: "spin 0.9s linear infinite" }} />
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>축적된 매뉴얼 {manuals.length}건을 AI가 읽고 브리핑을 작성하는 중...</p>
                </div>
              )}

              {briefingState === "error" && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "#991b1b", margin: 0, lineHeight: 1.7 }}>
                    <strong>AI 호출 실패</strong> — {briefingError}<br />
                    아래는 규칙 기반으로 생성한 대체 브리핑입니다. 원가 측정은 이번 건에서 불가합니다.
                  </p>
                </div>
              )}

              {briefingState === "done" && briefCost && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "#15803d", margin: "0 0 6px", fontWeight: 600 }}>이번 브리핑 실측 원가</p>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: "#166534" }}>
                    <span><strong>{briefCost.krw.toLocaleString()}원</strong> (건당)</span>
                    <span>입력 {briefCost.promptTokens.toLocaleString()} · 출력 {briefCost.completionTokens.toLocaleString()} 토큰</span>
                    <span>{(briefCost.elapsedMs / 1000).toFixed(1)}초</span>
                  </div>
                  <p style={{ fontSize: 10, color: "#16a34a", margin: "6px 0 0" }}>
                    모델 {briefCost.model} · 사업계획서 기준 건당 설계 상한 5,000원
                    {briefCost.krw === 0 && " · 무료 모델이라 0원으로 표시되며, 유료 모델 전환 시 실제 단가가 찍힙니다"}
                  </p>
                </div>
              )}

              {briefingState !== "loading" && briefing.length > 0 && (
                <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "#4338ca", margin: 0, lineHeight: 1.7 }}>
                    이 브리핑 {briefing.length}개 섹션 중 <strong>{briefing.filter(b => b.derivedFrom === "manual").length}개</strong>는
                    평상시 축적한 매뉴얼에서 나왔습니다. 매뉴얼을 더 쌓으면 섹션이 늘어납니다.
                  </p>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                {briefing.map((b, i) => (
                  <div key={b.title} style={{ ...card, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15 }}>{b.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{b.title}</span>
                      </div>
                      <button onClick={() => copy(`b${i}`, b.body)} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: copiedKey === `b${i}` ? "#dcfce7" : "#f3f4f6", border: `1px solid ${copiedKey === `b${i}` ? "#86efac" : "#e5e7eb"}`, color: copiedKey === `b${i}` ? "#16a34a" : "#6b7280" }}>
                        {copiedKey === `b${i}` ? "✓ 복사됨" : "복사"}</button>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <p style={{ fontSize: 12, color: "#374151", margin: "0 0 8px", lineHeight: 1.75 }}>{b.body}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: b.derivedFrom === "manual" ? "#6366f1" : "#6b7280" }}>
                        <span>🔗</span>
                        <span>출처: {b.source}</span>
                        {b.derivedFrom === "manual" && <span style={{ fontSize: 10, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 4, padding: "1px 6px" }}>축적 매뉴얼</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setPhase(3)} style={{ padding: "12px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>← 축적 현황</button>
                <button onClick={() => briefingState !== "loading" && setPhase(5)} disabled={briefingState === "loading"} style={{ flex: 1, padding: "12px 0", borderRadius: 9, fontSize: 14, fontWeight: 700, border: "none",
                  background: briefingState === "loading" ? "#f3f4f6" : "linear-gradient(135deg,#6366f1,#818cf8)",
                  color: briefingState === "loading" ? "#9ca3af" : "#fff",
                  cursor: briefingState === "loading" ? "not-allowed" : "pointer" }}>다음: 피드백 →</button>
              </div>
            </>
          )}
          <div style={{ height: 32 }} />
        </div>
      </div>
    );
  }

  // ── 5. 피드백 ──────────────────────────────────────────────────────────────
  return (
    <div style={s}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Timeline />
        {!submitted ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>브리핑을 확인하셨습니다</h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>네 가지만 답해주시면 검증이 끝납니다.</p>
            </div>

            <div style={{ ...card, padding: "20px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 14px" }}>브리핑 품질에 얼마나 만족하셨나요?</p>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onMouseEnter={() => setHoverStar(n)} onMouseLeave={() => setHoverStar(0)} onClick={() => setStarRating(n)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 30, padding: 3, transform: (hoverStar || starRating) >= n ? "scale(1.2)" : "scale(1)", transition: "transform 0.1s" }}>
                    <span style={{ color: (hoverStar || starRating) >= n ? "#f59e0b" : "#d1d5db" }}>★</span>
                  </button>
                ))}
              </div>
              {starRating > 0 && <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", margin: "8px 0 0" }}>{["", "개선이 많이 필요해요", "보통이에요", "괜찮았어요", "좋았어요!", "매우 만족해요! 🚀"][starRating]}</p>}
            </div>

            <div style={{ ...card, padding: "20px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>이 브리핑이 없었다면, 같은 내용을 찾는 데 얼마나 걸렸을까요?</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>후임자가 자료를 뒤지고 동료에게 묻는 시간 기준 (본전 조건: 건당 5.3시간)</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {["1시간 미만", "1~3시간", "3~5시간", "5시간 이상"].map(opt => (
                  <button key={opt} onClick={() => setSearchTimeSaved(opt)} style={{ padding: "10px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: searchTimeSaved === opt ? "#eef2ff" : "#f9fafb", border: `1.5px solid ${searchTimeSaved === opt ? "#6366f1" : "#e5e7eb"}`, color: searchTimeSaved === opt ? "#6366f1" : "#6b7280" }}>{opt}</button>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: "20px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>유료 베타에 참여하시겠습니까?</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>월 구독으로 맥락이 계속 축적되고, 퇴사·이동 시 브리핑이 생성됩니다</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {["예, 유료 베타를 서면으로 신청하겠습니다", "내부 검토 후 결정하겠습니다", "아직 판단이 어렵습니다"].map(opt => (
                  <button key={opt} onClick={() => setContinueChoice(opt)} style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left",
                    background: continueChoice === opt ? "#eef2ff" : "#f9fafb", border: `1.5px solid ${continueChoice === opt ? "#6366f1" : "#e5e7eb"}`, color: continueChoice === opt ? "#6366f1" : "#374151" }}>
                    <span style={{ marginRight: 8 }}>{continueChoice === opt ? "●" : "○"}</span>{opt}</button>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: "20px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>퇴사·이동 1건당 브리핑, 얼마면 쓰시겠습니까?</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>월 구독(7.5만 원, 맥락 축적 + 계정 권한 차단)에 더해 건당 과금됩니다</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[{ price: "건당 1.5만 원", sub: "수작업 비용의 약 13%" }, { price: "건당 3만 원", sub: "인수인계 가치 대비 15%" }, { price: "건당 5만 원", sub: "인수인계 가치 대비 25%" }, { price: "이 가격엔 안 쓰겠다", sub: "지불 의사 없음" }].map(opt => (
                  <button key={opt.price} onClick={() => setPriceChoice(opt.price)} style={{ padding: "12px 13px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                    background: priceChoice === opt.price ? "#eef2ff" : "#f9fafb", border: `1.5px solid ${priceChoice === opt.price ? "#6366f1" : "#e5e7eb"}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: priceChoice === opt.price ? "#6366f1" : "#111827" }}>{opt.price}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPhase(4)} style={{ padding: "12px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>← 이전</button>
              <button onClick={submitFeedback} style={{
                flex: 1, padding: "12px 0", borderRadius: 9, fontSize: 14, fontWeight: 700, border: "none",
                cursor: canSubmit ? "pointer" : "not-allowed",
                background: canSubmit ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f3f4f6",
                color: canSubmit ? "#fff" : "#9ca3af",
                boxShadow: canSubmit ? "0 4px 16px rgba(99,102,241,0.3)" : "none",
              }}>{canSubmit ? "피드백 제출하기" : `${missingFields.join(" · ")} 응답이 필요합니다`}</button>
            </div>
          </div>
        ) : (
          <div style={{ ...card, padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>소중한 의견 감사합니다!</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 18px", lineHeight: 1.7 }}>
              매뉴얼 {manuals.length}건 축적 · 브리핑 {briefing.length}개 섹션이 기록됐습니다.<br />정식 출시 시 우선 알림을 드릴게요.
            </p>
            <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "9px 14px", display: "inline-block", marginBottom: 14 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#6366f1" }}>{email || "user@company.com"}</span>
            </div>
            {syncState !== "idle" && (
              <p style={{ fontSize: 11, margin: "0 0 18px", color: syncState === "failed" ? "#dc2626" : "#9ca3af" }}>
                {syncState === "sending" && "응답 전송 중..."}
                {syncState === "sent" && "✓ 응답이 수집 서버로 전송됐습니다"}
                {syncState === "local-only" && "이 브라우저에만 저장됨 · 수집 서버(VITE_COLLECTOR_URL) 미설정"}
                {syncState === "failed" && "전송 실패 — 이 브라우저에는 저장됐습니다. 아래에서 내보내 주세요."}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setPhase(4)} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280" }}>브리핑 다시 보기</button>
              <button onClick={exportSubmissions} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280" }}>응답 내보내기 (JSON)</button>
              <button onClick={resetAll} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", color: "#fff" }}>처음부터</button>
            </div>
          </div>
        )}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
