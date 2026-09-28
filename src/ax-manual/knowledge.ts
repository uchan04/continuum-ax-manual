export interface Manual {
  id: string;
  taskType: string;
  label: string;
  createdAt: string;
  genSeconds: number;
  sampleChars: number;
  fileNames: string[];
  /** 브리핑 생성 입력용. 세션 메모리에만 두고 제출 기록에는 넣지 않는다. */
  sample?: string;
}

/** 사업계획서 6번: 퇴사(권한 차단) 또는 입사(권한 발급) 양쪽이 같은 축적을 쓴다. */
export type EventKind = "leave" | "join";

export interface BriefingSection {
  icon: string;
  title: string;
  body: string;
  /** 이 섹션이 나온 근거. 축적된 매뉴얼이거나 계정 처리 로그. */
  source: string;
  derivedFrom: "manual" | "account";
}

/**
 * 업무 유형별 핵심 포인트. 브리핑은 여기서 바로 나오는 게 아니라
 * 축적된 매뉴얼에 이 유형이 있을 때만 해당 섹션이 생긴다.
 * 퇴사·입사 양쪽에서 같은 내용을 쓰므로 방향을 타지 않게 적는다.
 */
const HANDOVER_BY_TASK: Record<string, { icon: string; body: string }> = {
  cs: { icon: "💬", body: "미응대 문의와 에스컬레이션 기준을 확인하세요. 반복 문의는 축적된 응대 프롬프트로 바로 처리할 수 있고, 환불·보상 건은 승인 절차를 먼저 확인해야 합니다." },
  minutes: { icon: "📋", body: "정기 회의 일정과 참석 범위를 확인하세요. 지난 회의의 미해결 액션 아이템이 남아 있으니 담당자와 기한을 먼저 확인해야 합니다." },
  docs: { icon: "📝", body: "작성 중이던 문서와 승인 대기 건을 확인하세요. 사내 문서 양식과 톤 기준이 매뉴얼에 정리돼 있습니다." },
  data: { icon: "📊", body: "정기 리포트 주기와 지표 정의를 확인하세요. 팀마다 지표 해석이 달라 기준 문서를 먼저 봐야 합니다." },
  email: { icon: "✉️", body: "외부 발송 메일의 톤과 승인 기준을 확인하세요. 대외 공지성 메일은 발송 전 검토가 필요합니다." },
  report: { icon: "📈", body: "보고 라인과 제출 주기를 확인하세요. 정기 보고 양식은 매뉴얼에 축적돼 있습니다." },
};

/**
 * 브리핑은 축적된 매뉴얼에서 파생된다. 축적이 없으면 업무 섹션도 없다.
 * 계정·권한 섹션만 계정 처리 로그에서 따로 나온다.
 */
export function buildBriefing(manuals: Manual[], accountRun: boolean, kind: EventKind = "leave"): BriefingSection[] {
  const suffix = kind === "join" ? "업무 인수" : "업무 인계";
  const fromManuals = manuals.map<BriefingSection>(m => {
    const preset = HANDOVER_BY_TASK[m.taskType] ?? { icon: "📌", body: "해당 업무의 확인 사항입니다." };
    return {
      icon: preset.icon,
      title: `${m.label} ${suffix}`,
      body: preset.body,
      source: `${m.label} 매뉴얼 · ${m.createdAt}`,
      derivedFrom: "manual",
    };
  });

  return accountRun ? [...fromManuals, ...accountSection(kind)] : fromManuals;
}

/** 계정 섹션은 LLM 이 아니라 계정 처리 로그에서 나온다 — 지어내면 안 되는 사실. */
export function accountSection(kind: EventKind = "leave"): BriefingSection[] {
  const leave = kind === "leave";
  return [{
    icon: "🔑",
    title: leave ? "계정 · 권한 차단 현황" : "계정 · 권한 발급 현황",
    body: leave
      ? "API 연동 앱은 차단 완료됐습니다. 폐쇄형 ERP는 RPA 옵션 대상이고, 그 외 계정은 수동 확인이 필요합니다."
      : "API 연동 앱은 발급 완료됐습니다. 폐쇄형 ERP는 RPA 옵션 대상이고, 그 외 계정은 수동 개설이 필요합니다.",
    source: leave ? "Continuum 오프보딩 로그" : "Continuum 온보딩 로그",
    derivedFrom: "account",
  }];
}

/** 축적이 없으면 브리핑을 만들 수 없다 — 이 제품의 전제. */
export function canBrief(manuals: Manual[]): boolean {
  return manuals.length > 0;
}
