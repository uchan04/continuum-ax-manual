import { useNavigate, useLocation } from "react-router-dom";
import logoImg from "../../assets/logo-new.png";

const STEPS = [
  { n: 1, path: "/step-1" },
  { n: 2, path: "/step-2" },
  { n: 3, path: "/step-3" },
  { n: 4, path: "/step-4" },
];

interface Props {
  onLogout?: () => void;
  maxReached?: number;
}

export default function PocHeader({ onLogout, maxReached = 1 }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = STEPS.findIndex(s => s.path === pathname) + 1 || 1;

  return (
    <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8eaf0", display: "flex", alignItems: "center", padding: "0 28px", flexShrink: 0, justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src={logoImg} alt="Continuum" style={{ height: 44, objectFit: "contain" }} />
        <span style={{ fontSize: 10, color: "#9ca3af", background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>AX PoC</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {STEPS.map(({ n, path }) => {
            const done = current > n;
            const active = current === n;
            const reachable = n <= maxReached;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <button
                  onClick={() => reachable && navigate(path)}
                  style={{
                    width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, border: "none", padding: 0,
                    background: done ? "#16a34a" : active ? "#6366f1" : "#e5e7eb",
                    color: done || active ? "#fff" : "#9ca3af",
                    cursor: reachable ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                >
                  {done ? "✓" : n}
                </button>
                {n < 4 && <div style={{ width: 16, height: 1, background: done ? "#16a34a" : "#d1d5db" }} />}
              </div>
            );
          })}
        </div>

        <div style={{ width: 1, height: 18, background: "#e5e7eb" }} />
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: 7, cursor: "pointer", fontSize: 12, color: "#6b7280" }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 5l3 3-3 3M13 8H6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          로그아웃
        </button>
      </div>
    </div>
  );
}
