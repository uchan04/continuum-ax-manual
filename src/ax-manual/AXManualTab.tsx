import { useState } from "react";

export default function AXManualTab({ onLogout }: { onLogout?: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [taskType, setTaskType] = useState("cs");
  const [uploadText, setUploadText] = useState("");
  const [loadingPct, setLoadingPct] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("업무 데이터를 분석하는 중...");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [priceChoice, setPriceChoice] = useState<string | null>(null);
  const [continueChoice, setContinueChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const LOADING_MSGS = [
    "업무 데이터를 분석하는 중...",
    "반복 업무 패턴을 식별하는 중...",
    "최적 프롬프트 구조를 설계하는 중...",
    "AI 자동화 시나리오를 생성하는 중...",
    "매뉴얼 초안을 완성하는 중...",
  ];

  const TASK_OPTIONS = [
    { value: "cs", label: "CS 응대" },
    { value: "minutes", label: "회의록 작성" },
    { value: "docs", label: "문서 작성" },
    { value: "data", label: "데이터 분석" },
    { value: "email", label: "이메일 작성" },
    { value: "report", label: "보고서 작성" },
  ];

  const PROMPTS = [
    { label: "CS 응대 자동화", icon: "💬", prompt: "다음 고객 문의를 분석하고, 회사 정책에 맞는 공손하고 명확한 답변 초안을 작성해줘. 핵심 불만 포인트를 먼저 인식하고, 해결책을 단계별로 설명한 뒤 다음 액션을 제안해줘.\n\n문의 내용: [고객 문의 내용 붙여넣기]" },
    { label: "회의록 자동 정리", icon: "📋", prompt: "다음 회의 내용을 구조화된 회의록으로 정리해줘. 형식: 1) 회의 목적 2) 주요 논의사항 (불릿 포인트) 3) 결정된 사항 4) 액션 아이템 (담당자/기한 포함) 5) 다음 회의 안건.\n\n회의 내용: [회의 내용 붙여넣기]" },
    { label: "문서 초안 작성", icon: "📝", prompt: "다음 키워드와 요구사항을 바탕으로 비즈니스 문서 초안을 작성해줘. 전문적이고 간결한 문체를 유지하고, 핵심 내용이 첫 단락에 오도록 해줘. 각 섹션은 소제목으로 구분해줘.\n\n요구사항: [문서 요구사항 작성]" },
    { label: "데이터 분석 리포트", icon: "📊", prompt: "다음 데이터를 분석하고 실행 가능한 인사이트를 포함한 리포트를 작성해줘. 구성: 1) 핵심 요약 (3줄 이내) 2) 주요 트렌드 분석 3) 이상치 또는 주목할 포인트 4) 권장 액션 3가지.\n\n데이터: [데이터 붙여넣기]" },
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
      const newIdx = Math.floor((pct / 100) * LOADING_MSGS.length);
      if (newIdx !== msgIdx && newIdx < LOADING_MSGS.length) { msgIdx = newIdx; setLoadingMsg(LOADING_MSGS[msgIdx]); }
    }, 120);
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  // 스텝퍼 헤더 (탭 내부용 — 로그아웃 없이 스텝만)
  const Stepper = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 24 }}>
      {[1,2,3,4].map(n => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button
            onClick={() => n < step && setStep(n as 1|2|3|4)}
            style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, border: "none", padding: 0,
              background: step > n ? "#16a34a" : step === n ? "#6366f1" : "#e5e7eb",
              color: step >= n ? "#fff" : "#9ca3af",
              cursor: n < step ? "pointer" : "default",
            }}
          >{step > n ? "✓" : n}</button>
          {n < 4 && <div style={{ width: 24, height: 1, background: step > n ? "#16a34a" : "#d1d5db" }} />}
        </div>
      ))}
      <span style={{ marginLeft: 12, fontSize: 12, color: "#9ca3af" }}>
        {["정보 입력", "AI 생성 중", "결과 확인", "피드백"][step - 1]}
      </span>
    </div>
  );

  const s: React.CSSProperties = { height: "100%", overflowY: "auto", padding: "28px 32px", fontFamily: "Inter, system-ui, sans-serif" };

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  if (step === 1) return (
    <div style={s}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Stepper />
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 999, padding: "5px 16px", marginBottom: 18, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 8, color: "#6366f1" }}>●</span>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, letterSpacing: "0.06em" }}>AX MANUAL PoC · BETA</span>
          </div>
          <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.25, letterSpacing: "-0.03em" }}>
            소규모 스타트업을 위한<br /><span style={{ color: "#6366f1" }}>맞춤형 AX 매뉴얼</span> 자동 생성
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.75 }}>반복 업무를 AI에게 넘기세요. 30초 안에 맞춤형 프롬프트 매뉴얼을 만들어드립니다.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          {[{ value: "주 14시간", label: "평균 절감 시간" }, { value: "3배↑", label: "업무 처리 속도" }, { value: "30초", label: "매뉴얼 생성 시간" }].map(kpi => (
            <div key={kpi.label} style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#6366f1", marginBottom: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, padding: "26px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#111827" }}>시작하기</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 }}>회사명 *</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="예: 스타트업 주식회사"
                style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 13px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 }}>업무용 이메일 *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com"
                style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 13px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 8 }}>가장 비효율적인 반복 업무 *</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {TASK_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setTaskType(opt.value)} style={{
                    padding: "9px 12px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                    background: taskType === opt.value ? "#eef2ff" : "#f9fafb",
                    borderColor: taskType === opt.value ? "#6366f1" : "#e5e7eb",
                    color: taskType === opt.value ? "#6366f1" : "#6b7280", transition: "all 0.15s",
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 }}>업무 샘플 데이터 <span style={{ color: "#9ca3af", fontWeight: 400 }}>(선택)</span></label>
              <textarea value={uploadText} onChange={e => setUploadText(e.target.value)} placeholder="실제 업무 내용, CS 답변 예시, 회의록 샘플 등을 붙여넣어 주세요." rows={3}
                style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 13px", fontSize: 12, color: "#374151", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.65, fontFamily: "Inter, sans-serif" }} />
            </div>
          </div>
          <button onClick={() => { if (companyName && email) startLoading(); }} style={{
            marginTop: 16, width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: companyName && email ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f3f4f6",
            color: companyName && email ? "#fff" : "#9ca3af",
            border: "none", cursor: companyName && email ? "pointer" : "not-allowed",
            boxShadow: companyName && email ? "0 4px 16px rgba(99,102,241,0.3)" : "none", transition: "all 0.2s",
          }}>{companyName && email ? "✦  AI 매뉴얼 생성 시작" : "회사명과 이메일을 입력해주세요"}</button>
          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: "8px 0 0" }}>무료 체험 · 신용카드 불필요 · 데이터는 분석 후 즉시 삭제</p>
        </div>
      </div>
    </div>
  );

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  if (step === 2) return (
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
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>AI가 매뉴얼을 생성하고 있습니다</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 28px", lineHeight: 1.6 }}>{loadingMsg}</p>
        <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>진행률</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>{loadingPct}%</span>
          </div>
          <div style={{ height: 7, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ height: "100%", width: `${loadingPct}%`, background: "linear-gradient(90deg,#6366f1,#a5b4fc)", borderRadius: 4, transition: "width 0.18s ease" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {LOADING_MSGS.map((msg, i) => {
              const done = loadingPct >= ((i+1)/LOADING_MSGS.length)*100;
              const active = !done && loadingPct >= (i/LOADING_MSGS.length)*100;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700,
                    background: done ? "#16a34a" : active ? "#6366f1" : "#f3f4f6", color: done||active ? "#fff" : "#d1d5db" }}>{done ? "✓" : active ? "●" : i+1}</div>
                  <span style={{ fontSize: 11, color: done ? "#16a34a" : active ? "#111827" : "#9ca3af", fontWeight: active ? 600 : 400 }}>{msg}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  if (step === 3) return (
    <div style={s}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Stepper />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 6, padding: "3px 10px", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>✓ 생성 완료</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>AX 매뉴얼 결과</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>AI가 분석한 업무 자동화 프롬프트 세트</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ padding: "9px 16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontWeight: 500, color: "#6b7280", cursor: "pointer" }}>← 처음으로</button>
            <button onClick={() => setStep(4)} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>다음: 피드백 →</button>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>⏱ 예상 시간 절감</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>주당 <span style={{ color: "#6366f1" }}>14시간</span></div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>월 56시간 · 연 672시간 절감 예상</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[{ v: "4개", l: "자동화 시나리오" }, { v: "87%", l: "반복 업무 비중" }, { v: "₩840만", l: "연간 절감 인건비" }].map(it => (
              <div key={it.v} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#6366f1" }}>{it.v}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{it.l}</div>
              </div>
            ))}
          </div>
        </div>

        <h3 style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: "0 0 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>생성된 프롬프트 세트</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {PROMPTS.map((p, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15 }}>{p.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.label}</span>
                </div>
                <button onClick={() => handleCopy(i, p.prompt)} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: copiedIdx === i ? "#dcfce7" : "#f3f4f6", border: copiedIdx === i ? "1px solid #86efac" : "1px solid #e5e7eb", color: copiedIdx === i ? "#16a34a" : "#6b7280",
                }}>{copiedIdx === i ? "✓ 복사됨" : "복사"}</button>
              </div>
              <div style={{ padding: "12px 14px", background: "#fafafa" }}>
                <pre style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#374151", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{p.prompt}</pre>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: "0 0 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Before / After 비교</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
          <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 11, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginBottom: 8 }}>BEFORE — 수동 처리 (25분)</div>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>고객 문의 확인 → Slack 메시지 → 답변 초안 → 검토 → 수정 → 발송. 매번 양식이 달라 품질 편차 발생.</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid #86efac", borderRadius: 11, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, marginBottom: 8 }}>AFTER — AI 지원 (3분)</div>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>프롬프트에 문의 내용 붙여넣기 → AI 답변 초안 (30초) → 검토 및 발송. 일관된 품질, 89% 시간 단축.</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 4 ─────────────────────────────────────────────────────────────────
  return (
    <div style={s}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <Stepper />
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>매뉴얼이 준비됐습니다!</h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>잠깐, 소중한 의견을 들려주세요.<br />더 나은 제품을 만드는 데 큰 도움이 됩니다.</p>
        </div>

        {!submitted ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 14px" }}>생성된 매뉴얼에 얼마나 만족하셨나요?</p>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onMouseEnter={() => setHoverStar(n)} onMouseLeave={() => setHoverStar(0)} onClick={() => setStarRating(n)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 30, padding: 3, transition: "transform 0.1s", transform: (hoverStar||starRating)>=n ? "scale(1.2)" : "scale(1)" }}>
                    <span style={{ color: (hoverStar||starRating)>=n ? "#f59e0b" : "#d1d5db" }}>★</span>
                  </button>
                ))}
              </div>
              {starRating > 0 && <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", margin: "8px 0 0" }}>{["","개선이 많이 필요해요","보통이에요","괜찮았어요","좋았어요!","매우 만족해요! 🚀"][starRating]}</p>}
            </div>

            <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>자동화 툴 형태로 계속 이용하시겠습니까?</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>매월 업데이트 AI 프롬프트 세트, 분석 리포트, 팀 협업 기능 포함</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {["예, 계속 이용하고 싶습니다","팀에 소개해보고 싶습니다","아직 판단이 어렵습니다"].map(opt => (
                  <button key={opt} onClick={() => setContinueChoice(opt)} style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    background: continueChoice===opt ? "#eef2ff" : "#f9fafb", border: `1.5px solid ${continueChoice===opt ? "#6366f1" : "#e5e7eb"}`, color: continueChoice===opt ? "#6366f1" : "#374151",
                  }}><span style={{ marginRight: 8 }}>{continueChoice===opt ? "●" : "○"}</span>{opt}</button>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>월 구독 서비스 적정 가격은?</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>팀 기준 (최대 10인)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[{ price: "$50/월", sub: "약 ₩70,000" },{ price: "$70/월", sub: "약 ₩98,000" },{ price: "$100/월", sub: "약 ₩140,000" },{ price: "$150/월", sub: "약 ₩210,000" }].map(opt => (
                  <button key={opt.price} onClick={() => setPriceChoice(opt.price)} style={{ padding: "12px 13px", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    background: priceChoice===opt.price ? "#eef2ff" : "#f9fafb", border: `1.5px solid ${priceChoice===opt.price ? "#6366f1" : "#e5e7eb"}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: priceChoice===opt.price ? "#6366f1" : "#111827" }}>{opt.price}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ padding: "12px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>← 이전</button>
              <button onClick={() => { if (starRating>0) setSubmitted(true); }} style={{
                flex: 1, padding: "12px 0", borderRadius: 9, fontSize: 14, fontWeight: 700, border: "none",
                cursor: starRating>0 ? "pointer" : "not-allowed",
                background: starRating>0 ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f3f4f6",
                color: starRating>0 ? "#fff" : "#9ca3af",
                boxShadow: starRating>0 ? "0 4px 16px rgba(99,102,241,0.3)" : "none", transition: "all 0.2s",
              }}>{starRating>0 ? "피드백 제출하기" : "별점을 선택해주세요"}</button>
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 16, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>소중한 의견 감사합니다!</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 18px", lineHeight: 1.7 }}>이메일로 최종 매뉴얼 PDF를 발송해드렸습니다.<br />정식 출시 시 우선 알림을 드릴게요.</p>
            <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "9px 14px", display: "inline-block", marginBottom: 18 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#6366f1" }}>{email || "user@company.com"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setStep(3)} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280" }}>매뉴얼 다시 보기</button>
              <button onClick={() => { setStep(1); setSubmitted(false); setStarRating(0); setPriceChoice(null); setContinueChoice(null); setCompanyName(""); setEmail(""); }} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", color: "#fff" }}>새 매뉴얼 생성</button>
            </div>
          </div>
        )}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
