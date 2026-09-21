import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWizard } from "./WizardContext";
import PocHeader from "./steps/PocHeader";

interface Props {
  onComplete?: () => void;
  onLogout?: () => void;
}

export default function AXSurvey({ onComplete, onLogout }: Props) {
  const navigate = useNavigate();
  const { email } = useWizard();
  const [starRating, setStarRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [priceChoice, setPriceChoice] = useState<string | null>(null);
  const [continueChoice, setContinueChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f0f2f7", fontFamily: "Inter, system-ui, sans-serif" }}>
      <PocHeader onLogout={onLogout} maxReached={4} />
      <div style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 540 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>매뉴얼이 준비됐습니다!</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>잠깐, 소중한 의견을 들려주세요.<br />더 나은 제품을 만드는 데 큰 도움이 됩니다.</p>
          </div>

          {!submitted ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* 별점 */}
              <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>생성된 매뉴얼에 얼마나 만족하셨나요?</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onMouseEnter={() => setHoverStar(n)} onMouseLeave={() => setHoverStar(0)} onClick={() => setStarRating(n)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 34, padding: 4, transition: "transform 0.1s", transform: (hoverStar || starRating) >= n ? "scale(1.2)" : "scale(1)" }}>
                      <span style={{ color: (hoverStar || starRating) >= n ? "#f59e0b" : "#d1d5db" }}>★</span>
                    </button>
                  ))}
                </div>
                {starRating > 0 && (
                  <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", margin: "10px 0 0" }}>
                    {["","개선이 많이 필요해요","보통이에요","괜찮았어요","좋았어요!","매우 만족해요! 🚀"][starRating]}
                  </p>
                )}
              </div>

              {/* 계속 이용 의향 */}
              <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>이 매뉴얼을 자동화 툴 형태로 계속 이용하시겠습니까?</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 14px" }}>매월 업데이트되는 맞춤형 AI 프롬프트 세트, 사용량 분석 리포트, 팀 협업 기능 포함</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["예, 계속 이용하고 싶습니다","팀에 소개해보고 싶습니다","아직 판단이 어렵습니다"].map(opt => (
                    <button key={opt} onClick={() => setContinueChoice(opt)} style={{ padding: "11px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      background: continueChoice === opt ? "#eef2ff" : "#f9fafb",
                      border: `1.5px solid ${continueChoice === opt ? "#6366f1" : "#e5e7eb"}`,
                      color: continueChoice === opt ? "#6366f1" : "#374151",
                    }}>
                      <span style={{ marginRight: 8 }}>{continueChoice === opt ? "●" : "○"}</span>{opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 가격 */}
              <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>월 구독 서비스로 출시된다면, 적정 가격은?</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 14px" }}>팀 기준 (최대 10인)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { price: "$50/월", sub: "약 ₩70,000" },
                    { price: "$70/월", sub: "약 ₩98,000" },
                    { price: "$100/월", sub: "약 ₩140,000" },
                    { price: "$150/월", sub: "약 ₩210,000" },
                  ].map(opt => (
                    <button key={opt.price} onClick={() => setPriceChoice(opt.price)} style={{ padding: "13px 14px", borderRadius: 9, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      background: priceChoice === opt.price ? "#eef2ff" : "#f9fafb",
                      border: `1.5px solid ${priceChoice === opt.price ? "#6366f1" : "#e5e7eb"}`,
                    }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: priceChoice === opt.price ? "#6366f1" : "#111827" }}>{opt.price}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => navigate("/step-3")} style={{ padding: "14px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>
                  ← 이전
                </button>
                <button
                  onClick={() => { if (starRating > 0) { setSubmitted(true); setTimeout(() => onComplete?.(), 2200); } }}
                  style={{
                    flex: 1, padding: "14px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none",
                    cursor: starRating > 0 ? "pointer" : "not-allowed",
                    background: starRating > 0 ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f3f4f6",
                    color: starRating > 0 ? "#fff" : "#9ca3af",
                    boxShadow: starRating > 0 ? "0 4px 16px rgba(99,102,241,0.35)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {starRating > 0 ? "피드백 제출하기" : "별점을 선택해주세요"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #f0f0f5", borderRadius: 16, padding: "44px 36px", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🙏</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>소중한 의견 감사합니다!</h3>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.7 }}>
                입력하신 이메일로 최종 매뉴얼 PDF를 발송해드렸습니다.<br />정식 출시 시 우선 알림을 드릴게요.
              </p>
              <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "10px 16px", display: "inline-block", marginBottom: 20 }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#6366f1" }}>{email || "user@company.com"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => navigate("/step-3")} style={{ padding: "10px 20px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280" }}>매뉴얼 다시 보기</button>
                <button onClick={() => onComplete?.()} style={{ padding: "10px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>퇴사 처리 센터 입장 →</button>
              </div>
            </div>
          )}
          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}
