/**
 * generate-onboarding-notify.js
 * 온보딩 알림 워크플로우 생성 스크립트
 * 실행: node generate-onboarding-notify.js
 *
 * 트리거 방법:
 *   onboarding-form 워크플로우의 마지막에
 *   HTTP Request 노드로 POST /webhook/onboarding-notify 호출
 *
 * 전달 payload:
 *   { store_name, store_record_id, created_at, faq_count }
 */

const fs   = require('fs');
const path = require('path');

const workflow = {
  name: "Onboarding Notify",
  nodes: [

    // ── Sticky Note ──────────────────────────────────────────────
    {
      parameters: {
        content: [
          "## 🔔 Onboarding Notify",
          "",
          "새 스토어 등록 시 ArumDri에게 알림 발송",
          "",
          "### Import 후 필수 설정",
          "1. **Telegram Credential** 매핑",
          "   - `Notify via Telegram` 노드",
          "   - Bot Token 필요 (BotFather에서 발급)",
          "2. **Chat ID** 변경",
          "   - `Notify via Telegram` 노드 > chatId",
          "   - 본인 Telegram Chat ID로 변경",
          "3. **Email Credential** 매핑",
          "   - `Notify via Email` 노드",
          "   - SMTP 설정 필요",
          "4. **이메일 주소** 변경",
          "   - fromEmail / toEmail 을 실제 주소로 변경",
          "",
          "### onboarding-form 연결 방법",
          "onboarding-form 워크플로우의 `Create FAQ`",
          "노드 뒤에 HTTP Request 노드 추가:",
          "```",
          "POST http://localhost:5678/webhook/onboarding-notify",
          "Body: {",
          "  store_name: {{ $('Create Store').first().json.fields.StoreName }},",
          "  store_record_id: {{ $('Create Store').first().json.id }},",
          "  created_at: {{ new Date().toISOString() }},",
          "  faq_count: 10",
          "}",
          "```"
        ].join("\n"),
        height: 420,
        width: 340,
        color: 4
      },
      id: "on000001-0000-4000-8000-000000000001",
      name: "Setup Notes",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-240, 60]
    },

    // ── 1. Webhook ────────────────────────────────────────────────
    {
      parameters: {
        httpMethod: "POST",
        path: "onboarding-notify",
        responseMode: "responseNode",
        options: {}
      },
      id: "on000001-0000-4000-8000-000000000002",
      name: "Receive Notify Request",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [200, 300],
      webhookId: "onboarding-notify-webhook"
    },

    // ── 2. Telegram ───────────────────────────────────────────────
    {
      parameters: {
        chatId: "YOUR_TELEGRAM_CHAT_ID",
        text: `={{
"🎉 <b>새 스토어 등록!</b>\\n\\n" +
"🏪 스토어명: <b>" + $json.body.store_name + "</b>\\n" +
"📅 등록 시간: " + new Date($json.body.created_at).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}) + "\\n" +
"📋 FAQ 생성: " + ($json.body.faq_count || 10) + "개\\n\\n" +
"🔗 <a href='https://airtable.com/YOUR_BASE_ID/YOUR_TABLE_ID/" + $json.body.store_record_id + "'>Airtable에서 보기</a>"
}}`,
        additionalFields: {
          parse_mode: "HTML"
        }
      },
      id: "on000001-0000-4000-8000-000000000003",
      name: "Notify via Telegram",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [460, 300],
      credentials: {
        telegramApi: {
          id: "YOUR_TELEGRAM_CREDENTIAL_ID",
          name: "Telegram account"
        }
      },
      notes: "⚠️ Import 후 설정 필요:\n1. Telegram Credential 매핑\n2. chatId를 본인 Chat ID로 변경\n3. Airtable 링크의 Base ID / Table ID 변경",
      onError: "continueRegularOutput"
    },

    // ── 3. Email ──────────────────────────────────────────────────
    {
      parameters: {
        fromEmail: "your-email@gmail.com",
        toEmail:   "your-email@gmail.com",
        subject:   "={{ '[ArumDri CS봇] 새 스토어 등록: ' + $('Receive Notify Request').first().json.body.store_name }}",
        html: `={{
"<div style='font-family: \\"Noto Sans KR\\", Arial, sans-serif; max-width: 560px; margin: 0 auto;'>" +
"<div style='background: #2D5016; padding: 24px 28px; border-radius: 12px 12px 0 0;'>" +
"<h2 style='color: white; margin: 0; font-size: 1.2rem;'>🎉 새 스토어가 등록됐습니다</h2>" +
"</div>" +
"<div style='background: white; padding: 28px; border: 1px solid #e8f5e0; border-top: none; border-radius: 0 0 12px 12px;'>" +
"<table style='width: 100%; border-collapse: collapse;'>" +
"<tr><td style='padding: 10px 0; color: #555; width: 120px;'>스토어명</td>" +
"<td style='padding: 10px 0; font-weight: bold; color: #1a1a1a;'>" + $('Receive Notify Request').first().json.body.store_name + "</td></tr>" +
"<tr><td style='padding: 10px 0; color: #555;'>등록 시간</td>" +
"<td style='padding: 10px 0; color: #1a1a1a;'>" + new Date($('Receive Notify Request').first().json.body.created_at).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}) + "</td></tr>" +
"<tr><td style='padding: 10px 0; color: #555;'>FAQ 생성</td>" +
"<td style='padding: 10px 0; color: #1a1a1a;'>" + ($('Receive Notify Request').first().json.body.faq_count || 10) + "개</td></tr>" +
"<tr><td style='padding: 10px 0; color: #555;'>Record ID</td>" +
"<td style='padding: 10px 0; color: #888; font-size: 0.85rem;'>" + $('Receive Notify Request').first().json.body.store_record_id + "</td></tr>" +
"</table>" +
"<div style='margin-top: 20px; text-align: center;'>" +
"<a href='https://airtable.com/YOUR_BASE_ID/YOUR_TABLE_ID/" + $('Receive Notify Request').first().json.body.store_record_id + "'" +
"   style='display: inline-block; background: #E8781A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;'>" +
"Airtable에서 바로 보기</a>" +
"</div>" +
"<p style='margin-top: 20px; color: #aaa; font-size: 0.8rem; text-align: center;'>ArumDri CS봇 자동 알림</p>" +
"</div></div>"
}}`,
        options: {}
      },
      id: "on000001-0000-4000-8000-000000000004",
      name: "Notify via Email",
      type: "n8n-nodes-base.emailSend",
      typeVersion: 2.1,
      position: [720, 300],
      credentials: {
        smtp: {
          id: "YOUR_SMTP_CREDENTIAL_ID",
          name: "SMTP account"
        }
      },
      notes: "⚠️ Import 후 설정 필요:\n1. SMTP Credential 매핑\n2. fromEmail / toEmail 주소 변경\n3. Airtable 링크의 Base ID / Table ID 변경",
      onError: "continueRegularOutput"
    },

    // ── 4. Respond to Webhook ─────────────────────────────────────
    {
      parameters: {
        respondWith: "json",
        responseBody: `={{ { ok: true, store: $('Receive Notify Request').first().json.body.store_name } }}`
      },
      id: "on000001-0000-4000-8000-000000000005",
      name: "Respond OK",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [980, 300]
    }
  ],

  // 순차 실행: Webhook → Telegram → Email → Respond OK
  // (병렬로 두 노드가 모두 Respond OK로 연결되면 응답이 이중 발송되어 에러 발생)
  connections: {
    "Receive Notify Request": {
      main: [
        [{ node: "Notify via Telegram", type: "main", index: 0 }]
      ]
    },
    "Notify via Telegram": {
      main: [
        [{ node: "Notify via Email", type: "main", index: 0 }]
      ]
    },
    "Notify via Email": {
      main: [
        [{ node: "Respond OK", type: "main", index: 0 }]
      ]
    }
  },

  settings: {
    executionOrder: "v1",
    binaryMode: "separate",
    availableInMCP: false
  }
};

const outPath = path.join(__dirname, 'onboarding-notify.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf-8');
console.log('✅ onboarding-notify.json 생성 완료:', outPath);
console.log('   노드 수:', workflow.nodes.length);
