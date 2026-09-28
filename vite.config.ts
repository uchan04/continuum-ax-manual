import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { handleBrief, type BriefRequest } from './api/brief.ts'

/**
 * 로컬 개발에서 /api/brief 를 처리한다. 배포(Vercel)에서는 api/brief.ts 의
 * default export 가 같은 handleBrief 를 부르므로 코드 경로가 하나다.
 * 키는 서버 측 env 에서만 읽어 번들에 들어가지 않는다.
 */
function briefApi(env: Record<string, string>): Plugin {
  return {
    name: 'brief-api',
    configureServer(server) {
      server.middlewares.use('/api/brief', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ error: 'POST만 허용됩니다.' }))
        }
        const apiKey = env.OPENROUTER_API_KEY
        res.setHeader('Content-Type', 'application/json')
        if (!apiKey) {
          res.statusCode = 500
          return res.end(JSON.stringify({ error: '.env 에 OPENROUTER_API_KEY 를 설정해주세요.' }))
        }
        let raw = ''
        req.on('data', chunk => { raw += chunk })
        req.on('end', async () => {
          try {
            const body = JSON.parse(raw) as BriefRequest
            const result = await handleBrief(body, apiKey, env.OPENROUTER_MODEL)
            res.end(JSON.stringify(result))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : '알 수 없는 오류' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // VITE_ 접두사 없는 변수까지 읽되, 서버 미들웨어 안에서만 쓴다.
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), tailwindcss(), briefApi(env)] }
})
