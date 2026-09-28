import { useState } from "react";

type Mode = "manual" | "handover";

interface Submission {
  timestamp: string;
  mode: Mode;
  companyName: string;
  email: string;
  taskType: string;
  successorRole: string;
  sampleChars: number;
  fileNames: string[];
  genSeconds: number;
  starRating: number;
  savedHours: string | null;
  continueChoice: string | null;
  priceChoice: string | null;
}

export default function AXManualTab() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<Mode>("manual");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [taskType, setTaskType] = useState("cs");
  const [successorRole, setSuccessorRole] = useState("");
  const [uploadText, setUploadText] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadingPct, setLoadingPct] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("업무 데이터를 분석하는 중...");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [priceChoice, setPriceChoice] = useState<string | null>(null);
  const [continueChoice, setContinueChoice] = useState<string | null>(null);
  const [savedHours, setSavedHours] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [genSeconds, setGenSeconds] = useState(0);

  const MANUAL_LOADING_MSGS = [
    "업무 데이터를 분석하는 중...",
    "반복 업무 패턴을 식별하는 중...",
    "최적 프롬프트 구조를 설계하는 중...",
    "AI 자동화 시나리오를 생성하는 중...",
    "매뉴얼 초안을 완성하는 중...",
  ];
  const HANDOVER_LOADING_MSGS = [
    "축적된 업무 맥락을 검색하는 중...",
    "퇴사자 담당 업무를 식별하는 중...",
    "후임자 권한 범위로 필터링하는 중...",
    "원본 출처 링크를 연결하는 중...",
    "인수인계 브리핑을 완성하는 중...",
  ];
  const LOADING_MSGS = mode === "handover" ? HANDOVER_LOADING_MSGS : MANUAL_LOADING_MSGS;

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

  const MAX_FILE_BYTES = 1_000_000;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 파일 재선택 허용
    if (files.length === 0) return;

    const tooBig = files.filter(f => f.size > MAX_FILE_BYTES).map(f => f.name);
    const ok = files.filter(f => f.size <= MAX_FILE_BYTES);
    setFileError(tooBig.length ? `${tooBig.join(", ")} — 1MB를 넘어 제외했습니다.` : null);
    if (ok.length === 0) return;

    const chunks = await Promise.all(ok.map(async f => `--- ${f.name} ---\n${await f.text()}`));
    setUploadText(prev => [prev, ...chunks].filter(Boolean).join("\n\n"));
    setFileNames(prev => [...new Set([...prev, ...ok.map(f => f.name)])]);
  };

  const BRIEFING_SECTIONS = [
    { icon: "📌", title: "진행 중이던 업무 및 현재 상태", source: "프로젝트 위키 · 2026-09-12 회의록", body: "인계 대상 업무 3건이 진행 중입니다.\n1) 9월 캠페인 성과 리포트 — 초안 작성 완료, 최종 검수 대기\n2) 신규 거래처 계약 검토 — 법무 회신 대기 중 (예상 회신일 확인 필요)\n3) 월간 정기 보고 — 매월 마지막 주 금요일 제출" },
    { icon: "🤝", title: "주요 이해관계자 및 커뮤니케이션 경로", source: "Slack #marketing · 거래처 연락처 시트", body: "내부: 디자인팀(배너 요청 시 최소 3일 전 전달), 개발팀(트래킹 코드 요청은 지라 티켓으로)\n외부: 주요 대행사 담당자 2명 — 주간 정기 미팅 화요일 오전\n※ 개인 연락처는 후임자 권한 범위 밖이라 표시되지 않습니다." },
    { icon: "⚠️", title: "주의사항 · 과거 문제 이력", source: "2026-06 인시던트 기록", body: "6월 캠페인 집행 시 예산 승인 절차를 건너뛰어 정산 지연이 발생했습니다. 집행 전 반드시 경영지원 승인을 먼저 받으세요.\n리포트 지표 정의가 팀마다 다르니 기준 문서를 먼저 확인하세요." },
    { icon: "🔑", title: "계정 · 권한 인계 현황", source: "Continuum 오프보딩 로그", body: "차단 완료: 이메일, Slack, 협업 도구 (API 연동 앱)\n인계 필요: 광고 플랫폼 관리자 권한, 분석 도구 뷰어 권한\n수동 확인 필요: 폐쇄형 ERP 계정 (RPA 옵션 미적용 상태)" },
  ];

  const startLoading = () => {
    setStep(2);
    setLoadingPct(0);
    const start = Date.now();
    let pct = 0;
    let msgIdx = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 3.5 + 1;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
        setTimeout(() => { setGenSeconds(Math.round((Date.now() - start) / 100) / 10); setStep(3); }, 600);
      }
      setLoadingPct(Math.min(Math.round(pct), 100));
      const newIdx = Math.floor((pct / 100) * LOADING_MSGS.length);
      if (newIdx !== msgIdx && newIdx < LOADING_MSGS.length) { msgIdx = newIdx; setLoadingMsg(LOADING_MSGS[msgIdx]); }
    }, 120);
  };

  const submitFeedback = () => {
    if (starRating === 0) return;
    const record: Submission = {
      timestamp: new Date().toISOString(),
      mode, companyName, email, taskType, successorRole,
      sampleChars: uploadText.length, fileNames,
      genSeconds, starRating, savedHours, continueChoice, priceChoice,
    };
    try {
      const key = "ax_manual_submissions";
      const prior: Submission[] = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([...prior, record]));
    } catch { /* localStorage unavailable, skip persistence */ }
    setSubmitted(true);
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

  const canStart = Boolean(companyName && email && (mode === "manual" || successorRole));

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
            {mode === "handover" ? <>퇴사·인사이동 시<br /><span style={{ color: "#6366f1" }}>AI 인수인계 브리핑</span> 자동 생성</> : <>소규모 스타트업을 위한<br /><span style={{ color: "#6366f1" }}>맞춤형 AX 매뉴얼</span> 자동 생성</>}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.75 }}>
            {mode === "handover" ? "축적된 업무 맥락을 후임자 직급에 맞춰 필터링하고, 원본 출처 링크를 붙인 브리핑을 생성합니다." : "반복 업무를 AI에게 넘기세요. 맞춤형 프롬프트 매뉴얼을 만들어드립니다."}
          </p>
        </div>

        <div style={{ display: "inline-flex", padding: 4, background: "#e9ebf2", borderRadius: 11, marginBottom: 24 }}>
          {([["manual", "평상시 · 업무 매뉴얼"], ["handover", "이벤트 · 인수인계 브리핑"]] as [Mode, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setMode(v)} style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s",
              background: mode === v ? "#fff" : "transparent",
              color: mode === v ? "#111827" : "#6b7280",
              boxShadow: mode === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          {(mode === "handover"
            ? [{ value: "5시간", label: "수작업 대비 평균 절감(추정·검증전)" }, { value: "42%", label: "퇴사 시 증발하는 개인 고유 지식 비중" }, { value: genSeconds ? `${genSeconds}초` : "실측중", label: "이번 브리핑 생성 소요시간" }]
            : [{ value: genSeconds ? `${genSeconds}초` : "실측중", label: "이번 매뉴얼 생성 소요시간" }, { value: "3배↑", label: "업무 처리 속도(추정·검증전)" }, { value: "4종", label: "생성 프롬프트 수" }]
          ).map(kpi => (
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
            {mode === "handover" && (
              <div>
                <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 }}>후임자 직급/역할 *</label>
                <input value={successorRole} onChange={e => setSuccessorRole(e.target.value)} placeholder="예: 신입 마케팅 매니저"
                  style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 13px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 8 }}>{mode === "handover" ? "퇴사자가 담당하던 업무 영역 *" : "가장 비효율적인 반복 업무 *"}</label>
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
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 6 }}>{mode === "handover" ? "인수인계 관련 메모" : "업무 샘플 데이터"} <span style={{ color: "#9ca3af", fontWeight: 400 }}>(선택)</span></label>
              <textarea value={uploadText} onChange={e => setUploadText(e.target.value)}
                placeholder={mode === "handover" ? "진행 중이던 프로젝트, 담당 거래처, 미완료 업무 등을 적어주세요." : "실제 업무 내용, CS 답변 예시, 회의록 샘플 등을 붙여넣어 주세요."} rows={3}
                style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 13px", fontSize: 12, color: "#374151", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65, fontFamily: "Inter, sans-serif" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "#f9fafb", border: "1px dashed #c7d2fe", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#6366f1", cursor: "pointer" }}>
                  📎 파일 첨부
                  <input type="file" accept=".txt,.md,.csv,.json" multiple onChange={handleFiles} style={{ display: "none" }} />
                </label>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>txt · md · csv · json (파일당 최대 1MB)</span>
              </div>

              {fileNames.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {fileNames.map(name => (
                    <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: "#4338ca" }}>
                      ✓ {name}
                    </span>
                  ))}
                </div>
              )}
              {fileError && <p style={{ fontSize: 11, color: "#dc2626", margin: "8px 0 0" }}>{fileError}</p>}
              {uploadText && <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>입력된 샘플 데이터 {uploadText.length.toLocaleString()}자</p>}
            </div>
          </div>
          <button onClick={() => { if (canStart) startLoading(); }} style={{
            marginTop: 16, width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: canStart ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f3f4f6",
            color: canStart ? "#fff" : "#9ca3af",
            border: "none", cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? "0 4px 16px rgba(99,102,241,0.3)" : "none", transition: "all 0.2s",
          }}>{canStart ? (mode === "handover" ? "✦  AI 인수인계 브리핑 생성 시작" : "✦  AI 매뉴얼 생성 시작") : (mode === "handover" && companyName && email ? "후임자 직급을 입력해주세요" : "회사명과 이메일을 입력해주세요")}</button>
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
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>{mode === "handover" ? "AI가 인수인계 브리핑을 생성하고 있습니다" : "AI가 매뉴얼을 생성하고 있습니다"}</h2>
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
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{mode === "handover" ? "AI 인수인계 브리핑" : "AX 매뉴얼 결과"}</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{mode === "handover" ? `${successorRole || "후임자"} 권한 범위로 필터링된 브리핑` : "AI가 분석한 업무 자동화 프롬프트 세트"}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ padding: "9px 16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontWeight: 500, color: "#6b7280", cursor: "pointer" }}>← 처음으로</button>
            <button onClick={() => setStep(4)} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>다음: 피드백 →</button>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>⏱ 이번 생성 소요 시간 (실측)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#6366f1" }}>{genSeconds}초</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>수작업 대비 절감 시간은 아래 피드백에서 직접 입력받아 검증합니다</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {(mode === "handover"
              ? [{ v: "5시간", l: "수작업 계정정리 기준*" }, { v: "42%", l: "퇴사 시 증발 지식*" }, { v: "미검증", l: "실제 절감 시간" }]
              : [{ v: `${PROMPTS.length}개`, l: "생성 프롬프트" }, { v: "미검증", l: "반복 업무 비중" }, { v: "미검증", l: "연간 절감 인건비" }]
            ).map(it => (
              <div key={it.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: it.v === "미검증" ? "#9ca3af" : "#6366f1" }}>{it.v}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{it.l}</div>
              </div>
            ))}
          </div>
          <p style={{ width: "100%", fontSize: 10, color: "#9ca3af", margin: 0 }}>* 출처: Nudge Security(2025), Panopto(2018) 외부 조사값이며 본 제품의 검증 결과가 아닙니다.</p>
        </div>

        {mode === "handover" && (
          <>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: "0 0 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>브리핑 · 후임자 인가 범위 내</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {BRIEFING_SECTIONS.map((b, i) => (
                <div key={b.title} style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15 }}>{b.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{b.title}</span>
                    </div>
                    <button onClick={() => handleCopy(100 + i, b.body)} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: copiedIdx === 100 + i ? "#dcfce7" : "#f3f4f6", border: copiedIdx === 100 + i ? "1px solid #86efac" : "1px solid #e5e7eb", color: copiedIdx === 100 + i ? "#16a34a" : "#6b7280",
                    }}>{copiedIdx === 100 + i ? "✓ 복사됨" : "복사"}</button>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <p style={{ fontSize: 12, color: "#374151", margin: "0 0 8px", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{b.body}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6366f1" }}>
                      <span>🔗</span><span>출처: {b.source}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 11, padding: 14, marginBottom: 32 }}>
              <p style={{ fontSize: 12, color: "#92400e", margin: 0, lineHeight: 1.7 }}>
                이 브리핑은 회사에 축적된 업무 맥락이 있을 때 생성됩니다. 현재 PoC에서는 예시 구조를 보여드리며, 실제 데이터 연동은 유료 베타에서 제공됩니다.
              </p>
            </div>
          </>
        )}

        {mode === "manual" && (
        <>
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
        </>
        )}
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
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>이 결과물로 몇 시간을 아끼셨나요?</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>직접 처리했다면 걸렸을 시간 기준 (본전 조건: 건당 5.3시간)</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {["1시간 미만","1~3시간","3~5시간","5시간 이상"].map(opt => (
                  <button key={opt} onClick={() => setSavedHours(opt)} style={{ padding: "10px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                    background: savedHours===opt ? "#eef2ff" : "#f9fafb", border: `1.5px solid ${savedHours===opt ? "#6366f1" : "#e5e7eb"}`, color: savedHours===opt ? "#6366f1" : "#6b7280",
                  }}>{opt}</button>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>유료 베타에 참여하시겠습니까?</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>퇴사·이동 발생 시 AI 인수인계 브리핑 + 계정 권한 자동 차단</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {["예, 유료 베타를 서면으로 신청하겠습니다","내부 검토 후 결정하겠습니다","아직 판단이 어렵습니다"].map(opt => (
                  <button key={opt} onClick={() => setContinueChoice(opt)} style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    background: continueChoice===opt ? "#eef2ff" : "#f9fafb", border: `1.5px solid ${continueChoice===opt ? "#6366f1" : "#e5e7eb"}`, color: continueChoice===opt ? "#6366f1" : "#374151",
                  }}><span style={{ marginRight: 8 }}>{continueChoice===opt ? "●" : "○"}</span>{opt}</button>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>퇴사·인사이동 1건당 인수인계 브리핑, 얼마면 쓰시겠습니까?</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>월 구독(7.5만 원, RAG 환경 + 계정 권한 차단)에 더해 건당 과금됩니다</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[{ price: "건당 1.5만 원", sub: "수작업 비용의 약 13%" },{ price: "건당 3만 원", sub: "인수인계 가치 대비 15%" },{ price: "건당 5만 원", sub: "인수인계 가치 대비 25%" },{ price: "이 가격엔 안 쓰겠다", sub: "지불 의사 없음" }].map(opt => (
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
              <button onClick={submitFeedback} style={{
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
              <button onClick={() => { setStep(1); setSubmitted(false); setStarRating(0); setPriceChoice(null); setContinueChoice(null); setSavedHours(null); setCompanyName(""); setEmail(""); setSuccessorRole(""); setUploadText(""); setFileNames([]); setFileError(null); setGenSeconds(0); }} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", color: "#fff" }}>새 매뉴얼 생성</button>
            </div>
          </div>
        )}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
