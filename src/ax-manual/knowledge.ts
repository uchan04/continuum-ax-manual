export interface Manual {
  id: string;
  taskType: string;
  label: string;
  createdAt: string;
  genSeconds: number;
  sampleChars: number;
  fileNames: string[];
}

export interface BriefingSection {
  icon: string;
  title: string;
  body: string;
  /** 이 섹션이 나온 근거. 축적된 매뉴얼이거나 오프보딩 로그. */
  source: string;
  derivedFrom: "manual" | "offboarding";
}

/**
 * 업무 유형별 인계 내용. 브리핑은 여기서 바로 나오는 게 아니라
 * 축적된 매뉴얼에 이 유형이 있을 때만 해당 섹션이 생긴다.
 */
const HANDOVER_BY_TASK: Record<string, { icon: string; body: string }> = {
  cs: { icon: "💬", body: "미응대 문의와 에스컬레이션 기준을 인계합니다. 반복 문의는 축적된 응대 프롬프트로 바로 처리할 수 있고, 환불·보상 건은 승인 절차를 먼저 확인하세요." },
  minutes: { icon: "📋", body: "정기 회의 일정과 참석 범위를 인계합니다. 지난 회의의 미해결 액션 아이템이 남아 있으니 담당자와 기한을 먼저 확인하세요." },
  docs: { icon: "📝", body: "작성 중이던 문서와 승인 대기 건을 인계합니다. 사내 문서 양식과 톤 기준이 매뉴얼에 정리돼 있습니다." },
  data: { icon: "📊", body: "정기 리포트 주기와 지표 정의를 인계합니다. 팀마다 지표 해석이 달라 기준 문서를 먼저 확인해야 합니다." },
  email: { icon: "✉️", body: "외부 발송 메일의 톤과 승인 기준을 인계합니다. 대외 공지성 메일은 발송 전 검토가 필요합니다." },
  report: { icon: "📈", body: "보고 라인과 제출 주기를 인계합니다. 정기 보고 양식은 매뉴얼에 축적돼 있습니다." },
};

/**
 * 브리핑은 축적된 매뉴얼에서 파생된다. 축적이 없으면 업무 섹션도 없다.
 * 계정·권한 섹션만 오프보딩 로그에서 따로 나온다.
 */
export function buildBriefing(manuals: Manual[], revokeRun: boolean): BriefingSection[] {
  const fromManuals = manuals.map<BriefingSection>(m => {
    const preset = HANDOVER_BY_TASK[m.taskType] ?? { icon: "📌", body: "해당 업무의 인계 사항입니다." };
    return {
      icon: preset.icon,
      title: `${m.label} 업무 인계`,
      body: preset.body,
      source: `${m.label} 매뉴얼 · ${m.createdAt}`,
      derivedFrom: "manual",
    };
  });

  if (!revokeRun) return fromManuals;

  return [
    ...fromManuals,
    {
      icon: "🔑",
      title: "계정 · 권한 인계 현황",
      body: "API 연동 앱은 차단 완료됐습니다. 폐쇄형 ERP는 RPA 옵션 대상이고, 그 외 계정은 수동 확인이 필요합니다.",
      source: "Continuum 오프보딩 로그",
      derivedFrom: "offboarding",
    },
  ];
}

/** 축적이 없으면 브리핑을 만들 수 없다 — 이 제품의 전제. */
export function canBrief(manuals: Manual[]): boolean {
  return manuals.length > 0;
}
