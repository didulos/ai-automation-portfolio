/**
 * generate-onboarding-complete.js
 * 온보딩 완료 페이지 워크플로우 생성 스크립트
 * 실행: node generate-onboarding-complete.js
 *
 * 역할:
 *   onboarding-form 워크플로우에서 폼 제출 완료 후
 *   리다이렉트 대상이 되는 브랜드 HTML 완료 페이지
 *
 * 엔드포인트:
 *   GET /webhook/onboarding-complete
 */

const fs   = require('fs');
const path = require('path');

const completionHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>등록 완료 — ArumDri CS봇</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Noto Sans KR', Arial, sans-serif;
    background: #f5f7f2;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .card {
    background: white;
    border-radius: 16px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 4px 24px rgba(0,0,0,.10);
    overflow: hidden;
  }
  .header {
    background: #2D5016;
    padding: 28px 32px;
    text-align: center;
  }
  .header h1 {
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
  }
  .header .icon { font-size: 2.5rem; margin-bottom: 10px; }
  .body { padding: 32px; }
  .body p {
    color: #444;
    line-height: 1.75;
    font-size: .95rem;
    margin-bottom: 24px;
  }
  .steps {
    background: #f6faf0;
    border-radius: 10px;
    padding: 20px 24px;
    margin-bottom: 24px;
  }
  .steps h3 {
    color: #2D5016;
    font-size: .9rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .steps ol { padding-left: 18px; }
  .steps li {
    color: #444;
    font-size: .875rem;
    line-height: 1.9;
  }
  .badge {
    display: block;
    background: #E8781A;
    color: white;
    border-radius: 8px;
    padding: 14px;
    text-align: center;
    font-weight: 700;
    font-size: .9rem;
    letter-spacing: .02em;
  }
  .footer {
    padding: 16px 32px;
    border-top: 1px solid #f0f0f0;
    text-align: center;
    color: #aaa;
    font-size: .8rem;
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="icon">✅</div>
    <h1>스토어 등록이 완료됐습니다!</h1>
  </div>
  <div class="body">
    <p>
      CS봇이 즉시 활성화되었습니다.<br>
      아래 단계로 바로 테스트해 보세요.
    </p>
    <div class="steps">
      <h3>🚀 다음 단계</h3>
      <ol>
        <li>웹 채팅 위젯 버튼 클릭</li>
        <li>"배송 얼마나 걸려요?" 입력</li>
        <li>스토어 정보로 답변 확인</li>
      </ol>
    </div>
    <span class="badge">ArumDri CS봇 활성화 완료</span>
  </div>
  <div class="footer">ArumDri CS봇 자동 온보딩</div>
</div>
</body>
</html>`;

const workflow = {
  name: "Onboarding Complete Page",
  nodes: [

    // ── Sticky Note ──────────────────────────────────────────────
    {
      parameters: {
        content: [
          "## ✅ Onboarding Complete Page",
          "",
          "onboarding-form 워크플로우에서 폼 제출 완료 후",
          "리다이렉트되는 브랜드 HTML 완료 페이지",
          "",
          "### 연결 방법",
          "onboarding-form 워크플로우의 Form Trigger 노드:",
          "- Respond When: **Workflow Finishes**",
          "- Respond With: **Redirect**",
          "- Redirect URL:",
          "  `http://localhost:5678/webhook/onboarding-complete`",
          "",
          "### Production 배포 시",
          "Redirect URL을 실제 n8n 도메인으로 변경:",
          "`https://YOUR_N8N_DOMAIN/webhook/onboarding-complete`"
        ].join("\n"),
        height: 320,
        width: 320,
        color: 4
      },
      id: "oc000001-0000-4000-8000-000000000001",
      name: "Setup Notes",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-220, 80]
    },

    // ── 1. Webhook (GET) ─────────────────────────────────────────
    {
      parameters: {
        httpMethod: "GET",
        path: "onboarding-complete",
        responseMode: "responseNode",
        options: {}
      },
      id: "oc000001-0000-4000-8000-000000000002",
      name: "Receive Complete Request",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [200, 300],
      webhookId: "onboarding-complete-webhook"
    },

    // ── 2. Respond with HTML ─────────────────────────────────────
    {
      parameters: {
        respondWith: "text",
        responseBody: completionHtml,
        options: {
          responseHeaders: {
            entries: [
              { name: "Content-Type", value: "text/html; charset=utf-8" }
            ]
          }
        }
      },
      id: "oc000001-0000-4000-8000-000000000003",
      name: "Show Completion Page",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [460, 300]
    }
  ],

  connections: {
    "Receive Complete Request": {
      main: [
        [{ node: "Show Completion Page", type: "main", index: 0 }]
      ]
    }
  },

  settings: {
    executionOrder: "v1",
    binaryMode: "separate",
    availableInMCP: false
  }
};

const outPath = path.join(__dirname, 'onboarding-complete.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf-8');
console.log('✅ onboarding-complete.json 생성 완료:', outPath);
console.log('   노드 수:', workflow.nodes.length);
