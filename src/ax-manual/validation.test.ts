// 러너 없이 실행: node --experimental-strip-types src/ax-manual/validation.test.ts
import assert from "node:assert/strict";
import { missingFeedbackFields, autoRevocableCount } from "./validation.ts";

const complete = {
  starRating: 4,
  savedHours: "3~5시간",
  continueChoice: "예, 유료 베타를 서면으로 신청하겠습니다",
  priceChoice: "건당 3만 원",
};

// 다 채우면 통과한다.
assert.deepEqual(missingFeedbackFields(complete), []);

// 별점만 있고 나머지가 비면 통과시키지 않는다 (이전 버그: 별점만으로 제출됐음).
assert.deepEqual(
  missingFeedbackFields({ starRating: 5, savedHours: null, continueChoice: null, priceChoice: null }),
  ["절감 시간", "유료 베타 의사", "적정 가격"],
);

// 별점 0은 미응답으로 본다.
assert.deepEqual(missingFeedbackFields({ ...complete, starRating: 0 }), ["만족도 별점"]);

// "안 쓰겠다"도 유효한 응답이다 — 지불 의사 없음을 기록해야 하므로 막으면 안 된다.
assert.deepEqual(missingFeedbackFields({ ...complete, priceChoice: "이 가격엔 안 쓰겠다" }), []);

// 수동 확인 대상은 자동 차단 건수에서 빠진다.
assert.equal(
  autoRevocableCount([{ via: "auto" }, { via: "rpa" }, { via: "manual" }]),
  2,
);

console.log("validation: 모든 검사 통과");
