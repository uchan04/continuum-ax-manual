// 실행: npm test
import assert from "node:assert/strict";
import { buildBriefing, canBrief, type Manual } from "./knowledge.ts";

const manual = (taskType: string, label: string): Manual => ({
  id: `${taskType}-1`, taskType, label,
  createdAt: "2026-09-28", genSeconds: 4.2, sampleChars: 120, fileNames: [],
});

// 축적이 없으면 브리핑을 만들 수 없다 — 제품의 전제.
assert.equal(canBrief([]), false);
assert.deepEqual(buildBriefing([], true).filter(s => s.derivedFrom === "manual"), []);

// 축적된 매뉴얼 수만큼 업무 섹션이 나온다.
const two = [manual("cs", "CS 응대"), manual("data", "데이터 분석")];
const sections = buildBriefing(two, false);
assert.equal(sections.length, 2);
assert.equal(sections.every(s => s.derivedFrom === "manual"), true);

// 각 섹션의 출처는 그 매뉴얼을 가리켜야 한다 (인과가 화면에 보여야 함).
assert.match(sections[0].source, /CS 응대 매뉴얼/);
assert.match(sections[1].source, /데이터 분석 매뉴얼/);

// 권한 차단을 실행했을 때만 계정 섹션이 붙는다.
assert.equal(buildBriefing(two, false).some(s => s.derivedFrom === "offboarding"), false);
assert.equal(buildBriefing(two, true).some(s => s.derivedFrom === "offboarding"), true);

// 알 수 없는 업무 유형도 섹션은 생성되어야 한다 (빠뜨리면 인계 누락).
assert.equal(buildBriefing([manual("unknown", "기타")], false).length, 1);

console.log("knowledge: 모든 검사 통과");
