export interface FeedbackAnswers {
  starRating: number;
  savedHours: string | null;
  continueChoice: string | null;
  priceChoice: string | null;
}

/**
 * 3개월 검증에서 원가·가치·가격 결론을 내려면 네 값이 모두 있어야 한다.
 * 하나라도 비면 제출을 막고, 빠진 항목명을 그대로 버튼에 띄운다.
 */
export function missingFeedbackFields(a: FeedbackAnswers): string[] {
  return [
    a.starRating === 0 && "만족도 별점",
    !a.savedHours && "절감 시간",
    !a.continueChoice && "유료 베타 의사",
    !a.priceChoice && "적정 가격",
  ].filter(Boolean) as string[];
}

export type RevokeVia = "auto" | "rpa" | "manual";

/** 수동 확인 대상은 자동 차단 시퀀스에서 제외한다. */
export function autoRevocableCount(accounts: { via: RevokeVia }[]): number {
  return accounts.filter(a => a.via !== "manual").length;
}
