// 실행: npm test
// 모델이 형식을 흔들어도 섹션을 건져내는지 확인한다. 네트워크 호출은 하지 않는다.
import assert from "node:assert/strict";
import { handleBrief, type BriefRequest } from "./brief.ts";

const req: BriefRequest = {
  successorRole: "신입 마케팅 매니저",
  manuals: [{ label: "CS 응대", taskType: "cs", createdAt: "2026-09-28" }],
};

const originalFetch = globalThis.fetch;

/** 마지막으로 OpenRouter 에 보낸 요청 본문. 프롬프트 검사용. */
let sentBody: { messages: { role: string; content: string }[] };

/** OpenRouter 응답을 흉내낸다. */
function mockFetch(content: string, usage = { prompt_tokens: 500, completion_tokens: 200, cost: 0.0004 }) {
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sentBody = JSON.parse(String(init.body));
    return new Response(
      JSON.stringify({ choices: [{ message: { content } }], usage, model: "test-model" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as unknown as typeof fetch;
}

try {
  // 순수 JSON
  mockFetch('{"sections":[{"title":"CS 인계","body":"미응대 문의를 확인하세요.","sourceLabel":"CS 응대 매뉴얼"}]}');
  let r = await handleBrief(req, "test-key");
  assert.equal(r.sections.length, 1);
  assert.equal(r.sections[0].title, "CS 인계");
  // 원가가 원화로 환산되어야 한다 (사업계획서 692원 검증에 쓰임).
  assert.ok(r.usage.costKrw > 0, "costKrw 환산 실패");
  assert.equal(r.usage.promptTokens, 500);

  // 코드펜스로 감싸도 파싱된다.
  mockFetch('```json\n{"sections":[{"title":"A","body":"본문","sourceLabel":"S"}]}\n```');
  r = await handleBrief(req, "test-key");
  assert.equal(r.sections.length, 1);

  // 앞뒤에 설명이 붙어도 파싱된다.
  mockFetch('네, 작성했습니다.\n{"sections":[{"title":"A","body":"본문","sourceLabel":"S"}]}\n도움이 되셨길.');
  r = await handleBrief(req, "test-key");
  assert.equal(r.sections.length, 1);

  // body 가 빈 섹션은 버린다 (화면에 빈 카드가 뜨면 안 됨).
  mockFetch('{"sections":[{"title":"A","body":"","sourceLabel":"S"},{"title":"B","body":"실제 내용","sourceLabel":"S"}]}');
  r = await handleBrief(req, "test-key");
  assert.equal(r.sections.length, 1);
  assert.equal(r.sections[0].title, "B");

  // 무료 모델이라 cost 가 0이어도 깨지지 않아야 한다.
  mockFetch('{"sections":[{"title":"A","body":"본문","sourceLabel":"S"}]}', { prompt_tokens: 10, completion_tokens: 5, cost: 0 });
  r = await handleBrief(req, "test-key");
  assert.equal(r.usage.costKrw, 0);

  // 입사(join)면 프롬프트가 온보딩으로 바뀌어야 한다 — 안 바뀌면 입사자에게 "인계" 브리핑이 간다.
  mockFetch('{"sections":[{"title":"A","body":"본문","sourceLabel":"S"}]}');
  await handleBrief({ ...req, eventKind: "join" }, "test-key");
  assert.match(sentBody.messages[0].content, /온보딩/);
  assert.match(sentBody.messages[1].content, /입사자/);

  await handleBrief(req, "test-key");   // eventKind 생략 시 기본은 퇴사
  assert.match(sentBody.messages[0].content, /퇴사자/);

  // JSON 이 아예 없으면 에러로 알린다 (조용히 빈 브리핑을 내면 안 됨).
  mockFetch("죄송합니다, 생성할 수 없습니다.");
  await assert.rejects(() => handleBrief(req, "test-key"), /JSON/);

  // 축적이 없으면 호출 전에 막는다.
  await assert.rejects(
    () => handleBrief({ successorRole: "매니저", manuals: [] }, "test-key"),
    /매뉴얼이 없으면/,
  );

  console.log("brief: 모든 검사 통과");
} finally {
  globalThis.fetch = originalFetch;
}
