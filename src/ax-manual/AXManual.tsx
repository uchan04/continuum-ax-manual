import { useState } from "react";
import logoImg from "../assets/logo-new.png";
import AXSurvey from "./AXSurvey";

export default function AXManualPoC({ onComplete, onLogout }: { onComplete?: () => void; onLogout?: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [taskType, setTaskType] = useState("cs");
  const [uploadText, setUploadText] = useState("");
  const [loadingPct, setLoadingPct] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("업무 데이터를 분석하는 중...");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const LOADING_MSGS = [
    "업무 데이터를 분석하는 중...",
    "반복 업무 패턴을 식별하는 중...",
    "최적 프롬프트 구조를 설계하는 중...",
    "AI 자동화 시나리오를 생성하는 중...",
    "매뉴얼 초안을 완성하는 중...",
  ];

  const startLoading = () => {
    setStep(2);
    setLoadingPct(0);
    let pct = 0;
    let msgIdx = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 3.5 + 1;
      if (pct >= 100) { pct = 100; clearInterval(iv); setTimeout(() => setStep(3), 600); }
      setLoadingPct(Math.min(Math.round(pct), 100));
      const newMsgIdx = Math.floor((pct / 100) * LOADING_MSGS.length);
      if (newMsgIdx !== msgIdx && newMsgIdx < LOADING_MSGS.length) {
        msgIdx = newMsgIdx;
        setLoadingMsg(LOADING_MSGS[msgIdx]);
      }
    }, 120);
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  const PROMPTS = [
    { label: "CS 응대 자동화", icon: "💬", prompt: "다음 고객 문의를 분석하고, 회사 정책에 맞는 공손하고 명확한 답변 초안을 작성해줘. 핵심 불만 포인트를 먼저 인식하고, 해결책을 단계별로 설명한 뒤 다음 액션을 제안해줘.\n\n문의 내용: [고객 문의 내용 붙여넣기]" },
    { label: "회의록 자동 정리", icon: "📋", prompt: "다음 회의 내용을 구조화된 회의록으로 정리해줘. 형식: 1) 회의 목적 2) 주요 논의사항 (불릿 포인트) 3) 결정된 사항 4) 액션 아이템 (담당자/기한 포함) 5) 다음 회의 안건.\n\n회의 내용: [회의 내용 붙여넣기]" },
    { label: "문서 초안 작성", icon: "📝", prompt: "다음 키워드와 요구사항을 바탕으로 비즈니스 문서 초안을 작성해줘. 전문적이고 간결한 문체를 유지하고, 핵심 내용이 첫 단락에 오도록 해줘. 각 섹션은 소제목으로 구분해줘.\n\n요구사항: [문서 요구사항 작성]" },
    { label: "데이터 분석 리포트", icon: "📊", prompt: "다음 데이터를 분석하고 실행 가능한 인사이트를 포함한 리포트를 작성해줘. 구성: 1) 핵심 요약 (3줄 이내) 2) 주요 트렌드 분석 3) 이상치 또는 주목할 포인트 4) 권장 액션 3가지.\n\n데이터: [데이터 붙여넣기]" },
  ];

  const TASK_OPTIONS = [
    { value: "cs", label: "CS 응대" },
    { value: "minutes", label: "회의록 작성" },
    { value: "docs", label: "문서 작성" },
    { value: "data", label: "데이터 분석" },
    { value: "email", label: "이메일 작성" },
    { value: "report", label: "보고서 작성" },
  ];

  const s: React.CSSProperties = { fontFamily: "Inter, system-ui, sans-serif" };

  const PocHeader = () => (
    <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8eaf0", display: "flex", alignItems: "center", padding: "0 28px", flexShrink: 0, justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src={logoImg} alt="Continuum" style={{ height: 44, objectFit: "contain" }} />
        <span style={{ fontSize: 10, color: "#9ca3af", background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>AX PoC</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, background: step > n ? "#16a34a" : step === n ? "#6366f1" : "#e5e7eb", color: step >= n ? "#fff" : "#9ca3af" }}>{step > n ? "✓" : n}</div>
              {n < 4 && <div style={{ width: 16, height: 1, background: step > n ? "#16a34a" : "#d1d5db" }} />}
            </div>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: "#e5e7eb" }} />
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: 7, cursor: "pointer", fontSize: 12, color: "#6b7280" }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 5l3 3-3 3M13 8H6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          로그아웃
        </button>
      </div>
    </div>
  );

  // ── Screen 1 ───────────────────────────────────────────────────────────────
  if (step === 1) return (
    <div style={{ ...s, display: "flex", flexDirection: "column", height: "100vh", background: "#f0f2f7" }}>
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8eaf0", display: "flex", alignItems: "center", padding: "0 28px", flexShrink: 0, justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoImg} alt="Continuum" style={{ height: 44, objectFit: "contain" }} />
          <span style={{ fontSize: 10, color: "#9ca3af", background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>AX PoC</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {[1,2,3,4].map(n => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, background: step > n ? "#16a34a" : step === n ? "#6366f1" : "#e5e7eb", color: step >= n ? "#fff" : "#9ca3af" }}>{step > n ? "✓" : n}</div>
                {n < 4 && <div style={{ width: 16, height: 1, background: step > n ? "#16a34a" : "#d1d5db" }} />}
              </div>
            ))}
          </div>
          <div style={{ width: 1, height: 18, background: "#e5e7eb" }} />
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#6b7280" }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 5l3 3-3 3M13 8H6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 48px" }}>
        <div style={{ textAlign: "center", padding: "40px 0 36px", maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 999, padding: "6px 18px", marginBottom: 24, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 8, color: "#6366f1" }}>●</span>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, letterSpacing: "0.06em" }}>AX MANUAL PoC · BETA</span>
          </div>
          <h1 style={{ margin: "0 0 14px", fontSize: 36, fontWeight: 800, color: "#111827", lineHeight: 1.25, letterSpacing: "-0.03em" }}>
            소규모 스타트업을 위한<br />
            <span style={{ color: "#6366f1" }}>맞춤형 AX 매뉴얼</span> 자동 생성
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.75 }}>
            반복 업무를 AI에게 넘기세요. 회사 데이터를 분석해<br />즉시 사용 가능한 프롬프트 매뉴얼을 30초 안에 만들어드립니다.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, maxWidth: 800, margin: "0 auto 20px" }}>
          {[
            { value: "주 14시간", label: "평균 절감 시간" },
            { value: "3배↑", label: "업무 처리 속도" },
            { value: "30초", label: "매뉴얼 생성 시간" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, padding: "24px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#6366f1", letterSpacing: "-0.03em", marginBottom: 6 }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 18, padding: "28px 28px", maxWidth: 800, margin: "0 auto", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: "0 0 22px", fontSize: 16, fontWeight: 700, color: "#111827" }}>시작하기</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 }}>회사명 *</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="예: 스타트업 주식회사"
                style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "11px 14px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 }}>업무용 이메일 *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com"
                style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "11px 14px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 8 }}>가장 비효율적인 반복 업무 *</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {TASK_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setTaskType(opt.value)} style={{
                    padding: "10px 12px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                    background: taskType === opt.value ? "#eef2ff" : "#f9fafb",
                    borderColor: taskType === opt.value ? "#6366f1" : "#e5e7eb",
                    color: taskType === opt.value ? "#6366f1" : "#6b7280",
                    transition: "all 0.15s",
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 }}>업무 샘플 데이터 <span style={{ color: "#9ca3af", fontWeight: 400 }}>(선택)</span></label>
              <textarea value={uploadText} onChange={e => setUploadText(e.target.value)}
                placeholder="실제 업무 내용, CS 답변 예시, 회의록 샘플 등을 붙여넣어 주세요." rows={3}
                style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "11px 14px", fontSize: 12, color: "#374151", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.65, fontFamily: "Inter, sans-serif" }} />
            </div>
          </div>
          <button onClick={() => { if (companyName && email) startLoading(); }} style={{
            marginTop: 18, width: "100%", padding: "13px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: companyName && email ? "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)" : "#f3f4f6",
            color: companyName && email ? "#fff" : "#9ca3af",
            border: "none", cursor: companyName && email ? "pointer" : "not-allowed",
            boxShadow: companyName && email ? "0 4px 16px rgba(99,102,241,0.35)" : "none", transition: "all 0.2s",
          }}>
            {companyName && email ? "✦  AI 매뉴얼 생성 시작" : "회사명과 이메일을 입력해주세요"}
          </button>
          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: "10px 0 0" }}>무료 체험 · 신용카드 불필요 · 데이터는 분석 후 즉시 삭제</p>
        </div>
      </div>
    </div>
  );

  // ── Screen 2 ───────────────────────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ ...s, display: "flex", flexDirection: "column", height: "100vh", background: "#f0f2f7" }}>
      <PocHeader />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 500, textAlign: "center", padding: "0 24px" }}>
          <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 32px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", animation: "pulse-orb 2.4s ease-in-out infinite" }} />
            <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid #c7d2fe", animation: "spin 4s linear infinite" }} />
            <div style={{ position: "absolute", inset: 16, borderRadius: "50%", border: "1.5px dashed #a5b4fc", animation: "spin 7s linear infinite reverse" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
                <span style={{ fontSize: 22, color: "#fff" }}>✦</span>
              </div>
            </div>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>AI가 매뉴얼을 생성하고 있습니다</h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 32px", lineHeight: 1.6 }}>{loadingMsg}</p>
          <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, padding: "22px 26px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>진행률</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#6366f1" }}>{loadingPct}%</span>
            </div>
            <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", width: `${loadingPct}%`, background: "linear-gradient(90deg, #6366f1, #a5b4fc)", borderRadius: 4, transition: "width 0.18s ease" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {LOADING_MSGS.map((msg, i) => {
                const done = loadingPct >= ((i + 1) / LOADING_MSGS.length) * 100;
                const active = !done && loadingPct >= (i / LOADING_MSGS.length) * 100;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700,
                      background: done ? "#16a34a" : active ? "#6366f1" : "#f3f4f6",
                      color: done || active ? "#fff" : "#d1d5db",
                      animation: active ? "pulse-orb 1.5s ease-in-out infinite" : "none",
                    }}>{done ? "✓" : active ? "●" : i + 1}</div>
                    <span style={{ fontSize: 12, color: done ? "#16a34a" : active ? "#111827" : "#9ca3af", fontWeight: active ? 600 : 400 }}>{msg}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Screen 3 ───────────────────────────────────────────────────────────────
  if (step === 3) return (
    <div style={{ ...s, display: "flex", flexDirection: "column", height: "100vh", background: "#f0f2f7" }}>
      <PocHeader />
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 6, padding: "3px 10px", marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>✓ 생성 완료</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>AX 매뉴얼 결과</h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>AI가 분석한 업무 자동화 프롬프트 세트</p>
            </div>
            <button onClick={() => setStep(4)} style={{ padding: "10px 22px", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
              다음: 피드백 제출 →
            </button>
          </div>
          <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, padding: "20px 24px", marginBottom: 18, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>⏱ 예상 시간 절감</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1 }}>주당 <span style={{ color: "#6366f1" }}>14시간</span></div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>월 56시간 · 연 672시간 절감 예상</div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {[{ v: "4개", l: "자동화 시나리오" }, { v: "87%", l: "반복 업무 비중" }, { v: "₩840만", l: "연간 절감 인건비" }].map(it => (
                <div key={it.v} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#6366f1" }}>{it.v}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{it.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", margin: "0 0 12px", letterSpacing: "0.06em", textTransform: "uppercase" }}>생성된 프롬프트 세트</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PROMPTS.map((p, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{p.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.label}</span>
                    </div>
                    <button onClick={() => handleCopy(i, p.prompt)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                      background: copiedIdx === i ? "#dcfce7" : "#f3f4f6",
                      border: copiedIdx === i ? "1px solid #86efac" : "1px solid #e5e7eb",
                      color: copiedIdx === i ? "#16a34a" : "#6b7280",
                    }}>{copiedIdx === i ? "✓ 복사됨" : "복사"}</button>
                  </div>
                  <div style={{ padding: "14px 16px", background: "#fafafa" }}>
                    <pre style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#374151", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{p.prompt}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", margin: "0 0 12px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Before / After 비교</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginBottom: 10 }}>BEFORE — 수동 처리 (25분)</div>
              <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>고객 문의 확인 → 담당자에게 Slack 메시지 → 답변 초안 직접 작성 → 검토 요청 → 수정 → 발송. 매번 양식이 달라 품질 편차 발생.</p>
            </div>
            <div style={{ background: "#fff", border: "1px solid #86efac", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, marginBottom: 10 }}>AFTER — AI 지원 (3분)</div>
              <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>프롬프트에 문의 내용 붙여넣기 → AI 답변 초안 생성 (30초) → 검토 및 발송. 일관된 품질, 89% 시간 단축.</p>
            </div>
          </div>
          <div style={{ height: 32 }} />
        </div>
      </div>
    </div>
  );

  // ── Screen 4 ───────────────────────────────────────────────────────────────
  return (
    <AXSurvey
      onComplete={onComplete}
      onLogout={onLogout}
    />
  );
}
