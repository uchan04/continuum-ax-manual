# Continuum AX Manual PoC

평상시 업무 매뉴얼을 축적하고, 퇴사·인사이동이 발생하면 그 맥락에서
후임자 맞춤 인수인계 브리핑을 생성하는 검증용 프로토타입.

## 실행

```bash
npm install
cp .env.example .env    # OPENROUTER_API_KEY 채우기
npm run dev             # http://localhost:5173
npm test                # 로직 검사 (러너 없이 Node 로 실행)
```

`.env` 없이도 화면은 돌아갑니다. 브리핑 생성 시 AI 호출이 실패하고
규칙 기반 대체 브리핑이 나오며, 그 사실이 화면에 표시됩니다.

## API 키 취급

키는 **절대 브라우저로 보내지 않습니다.**

```
브라우저 → /api/brief → OpenRouter
              ↑ 키는 여기서만 읽음
```

- 로컬: `vite.config.ts` 의 미들웨어가 `api/brief.ts` 의 `handleBrief` 호출
- 배포: `api/brief.ts` 의 default export 가 서버리스 함수로 동작

양쪽이 같은 함수를 쓰므로 코드 경로는 하나입니다.

`OPENROUTER_API_KEY` 에 `VITE_` 접두사를 붙이면 키가 번들에 박혀
사이트를 여는 누구나 꺼내 쓸 수 있습니다. 붙이지 마세요.

빌드 후 유출 여부 확인:

```bash
npm run build && grep -c "openrouter" dist/assets/*.js   # 0 이어야 정상
```

## 배포 (Vercel)

```bash
vercel                                          # 최초 연결
vercel env add OPENROUTER_API_KEY               # 키 등록
vercel --prod
```

`api/brief.ts` 가 자동으로 서버리스 함수(`/api/brief`)가 됩니다.

## 원가 측정

브리핑 생성 후 화면에 건당 실측 원가(원), 입출력 토큰 수, 소요 시간이
표시되고 제출 기록에도 남습니다. 사업계획서의 "건당 692원에 묶을 수
있는가" 검증 항목에 대응합니다.

무료 모델(`:free`)은 `usage.cost` 가 0으로 내려와 원가가 0원으로 찍힙니다.
실제 단가를 재려면 `.env` 의 `OPENROUTER_MODEL` 을 유료 모델로 바꿔
한 번 측정하세요.

## 검증 데이터 회수

제출 응답은 `VITE_COLLECTOR_URL` 설정 시 웹훅으로 전송되고,
미설정이면 브라우저 localStorage 에만 쌓입니다. 완료 화면의
"응답 내보내기 (JSON)" 으로 언제든 회수할 수 있습니다.

기록되는 값: 축적 매뉴얼 수·업무 유형, 브리핑 섹션 수, 건당 원가와
토큰 수, 만족도, 탐색 시간 절감, 유료 베타 의사, 적정 가격.

퇴사자 이름·근무일과 업무 샘플 원문은 **저장하지 않습니다.**
제3자 개인정보이고, 화면의 "샘플 원문은 저장하지 않습니다" 고지와
어긋나기 때문입니다.
