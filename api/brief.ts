// 축적된 매뉴얼에서 인수인계 브리핑을 생성한다.
// 로컬(Vite 미들웨어)과 배포(Vercel 함수) 양쪽에서 같은 handleBrief 를 쓴다.
// API 키는 서버에서만 읽으며 절대 클라이언트 번들에 들어가지 않는다.

export interface BriefRequest {
  successorRole: string;
  /** 사업계획서 6번: 퇴사(인계) 또는 입사(인수). 기본은 퇴사. */
  eventKind?: "leave" | "join";
  manuals: { label: string; taskType: string; createdAt: string; sample?: string }[];
}

export interface BriefSection {
  title: string;
  body: string;
  sourceLabel: string;
}

export interface BriefResult {
  sections: BriefSection[];
  usage: { promptTokens: number; completionTokens: number; costUsd: number; costKrw: number };
  model: string;
  elapsedMs: number;
}

// 사업계획서 10번: 건당 설계 상한 5,000원. 넘으면 검색 설계가 잘못된 것이므로 드러낸다.
const KRW_PER_USD = 1383.3;
const DEFAULT_MODEL = "google/gemma-4-31b-it:free";

const systemPrompt = (kind: "leave" | "join") => `${kind === "join"
  ? "당신은 신규 입사자가 맡게 될 업무의 온보딩 브리핑을 작성합니다."
  : "당신은 퇴사자의 업무를 후임자에게 인계하는 브리핑을 작성합니다."}

규칙:
- 반드시 주어진 매뉴얼 목록에 근거해서만 작성하세요. 없는 사실을 지어내지 마세요.
- 매뉴얼 1건당 섹션 1개를 만드세요. 매뉴얼 수와 섹션 수가 같아야 합니다.
- 담당자의 직급/역할에 맞춰 설명 수준을 조절하세요.
- 각 섹션 body는 2~4문장의 한국어로, 담당자가 당장 해야 할 일이 드러나게 쓰세요.
- 개인 연락처나 민감정보는 쓰지 마세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트를 붙이지 마세요.
{"sections":[{"title":"...","body":"...","sourceLabel":"..."}]}

sourceLabel 에는 근거가 된 매뉴얼의 이름을 그대로 넣으세요.`;

function buildUserPrompt(req: BriefRequest): string {
  const list = req.manuals
    .map((m, i) => {
      const sample = m.sample?.trim();
      // 샘플은 앞부분만 넣는다 — 원본 전량 투입은 사업계획서가 배제한 방식.
      const excerpt = sample ? `\n   샘플 발췌: ${sample.slice(0, 600)}` : "";
      return `${i + 1}. ${m.label} 매뉴얼 (작성일 ${m.createdAt})${excerpt}`;
    })
    .join("\n");

  const join = req.eventKind === "join";
  return `${join ? "입사자" : "후임자"}: ${req.successorRole}

축적된 매뉴얼 ${req.manuals.length}건:
${list}

위 ${req.manuals.length}건 각각에 대해 ${join ? "온보딩" : "인계"} 섹션을 작성하세요.`;
}

/** 모델이 코드펜스나 설명을 붙여도 JSON 을 건져낸다. */
function parseSections(content: string): BriefSection[] {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : content).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("모델 응답에서 JSON을 찾지 못했습니다.");

  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed.sections)) throw new Error("응답에 sections 배열이 없습니다.");

  return parsed.sections
    .filter((s: unknown): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s: Record<string, unknown>) => ({
      title: String(s.title ?? "인계 사항"),
      body: String(s.body ?? ""),
      sourceLabel: String(s.sourceLabel ?? ""),
    }))
    .filter((s: BriefSection) => s.body.length > 0);
}

export async function handleBrief(req: BriefRequest, apiKey: string, model = DEFAULT_MODEL): Promise<BriefResult> {
  if (!req.manuals?.length) throw new Error("축적된 매뉴얼이 없으면 브리핑을 만들 수 없습니다.");
  if (!req.successorRole?.trim()) throw new Error("담당자 직급이 필요합니다.");

  const started = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "Continuum AX Manual PoC",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt(req.eventKind ?? "leave") },
        { role: "user", content: buildUserPrompt(req) },
      ],
      // 사업계획서 10번: 토큰 예산 상한을 코드로 강제한다.
      max_tokens: 1200,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
    model?: string;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("모델이 빈 응답을 반환했습니다.");

  const costUsd = Number(data.usage?.cost ?? 0);
  return {
    sections: parseSections(content),
    usage: {
      promptTokens: Number(data.usage?.prompt_tokens ?? 0),
      completionTokens: Number(data.usage?.completion_tokens ?? 0),
      costUsd,
      costKrw: Math.round(costUsd * KRW_PER_USD * 100) / 100,
    },
    model: data.model ?? model,
    elapsedMs: Date.now() - started,
  };
}

/** Vercel 서버리스 진입점. 로컬에서는 vite.config.ts 의 미들웨어가 같은 함수를 부른다. */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST만 허용됩니다." }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY가 설정되지 않았습니다." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  try {
    const body = (await request.json()) as BriefRequest;
    const result = await handleBrief(body, apiKey, process.env.OPENROUTER_MODEL);
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "알 수 없는 오류" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
