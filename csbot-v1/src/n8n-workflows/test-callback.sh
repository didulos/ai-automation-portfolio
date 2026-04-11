#!/bin/bash
# 카카오 Callback 패턴 테스트 스크립트
# 사용법: bash test-callback.sh <callback-url>
# 예시:   bash test-callback.sh https://webhook.site/abc-123-def

CALLBACK_URL="${1:-}"

if [ -z "$CALLBACK_URL" ]; then
  echo "사용법: bash test-callback.sh <callback-url>"
  echo "예시:   bash test-callback.sh https://webhook.site/abc-123-def"
  echo ""
  echo "callback-url: webhook.site에서 발급받은 URL"
  exit 1
fi

WEBHOOK_URL="${2:-http://localhost:5678/webhook-test/kakao}"

echo "=== 카카오 Callback 테스트 ==="
echo "Webhook:  $WEBHOOK_URL"
echo "Callback: $CALLBACK_URL"
echo ""

echo "[1] 카카오 스킬 요청 전송 중..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{\"userRequest\":{\"callbackUrl\":\"$CALLBACK_URL\",\"utterance\":\"배송 얼마나 걸려요?\",\"user\":{\"id\":\"test_user_1\",\"type\":\"botUserKey\"},\"timezone\":\"Asia/Seoul\"},\"bot\":{\"id\":\"test_bot\",\"name\":\"test_bot\"},\"intent\":{\"id\":\"test_intent\",\"name\":\"test_intent\"},\"action\":{\"id\":\"test_action\",\"name\":\"test_action\",\"params\":{},\"detailParams\":{}}}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "[2] 즉시 응답 (Callback Ack):"
echo "    HTTP: $HTTP_CODE"
echo "    Body: $BODY"
echo ""

if echo "$BODY" | grep -q "useCallback"; then
  echo "[OK] Callback Ack 정상! useCallback: true 확인"
  echo ""
  echo "[3] webhook.site에서 최종 AI 응답 도착을 확인하세요 (최대 60초 소요)"
else
  echo "[FAIL] 예상과 다른 응답입니다. n8n 워크플로우 상태를 확인하세요."
fi
