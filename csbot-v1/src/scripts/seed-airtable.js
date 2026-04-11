#!/usr/bin/env node
/**
 * Airtable 시드 데이터 투입 스크립트
 * 실행: node src/scripts/seed-airtable.js
 *
 * Stores 1행 + FAQs 10행 (PRD S01~S10 전체 시나리오)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// .env 파일 간이 파서
const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const BASE_ID = env.AIRTABLE_BASE_ID;
const PAT = env.AIRTABLE_PAT;

if (!BASE_ID || !PAT) {
  console.error('ERROR: .env에 AIRTABLE_BASE_ID, AIRTABLE_PAT 필요');
  process.exit(1);
}

// ============================================================
// Airtable API 헬퍼
// ============================================================
function airtableRequest(tableName, method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${BASE_ID}/${encodeURIComponent(tableName)}`,
      method,
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${body}`));
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Airtable batch create (최대 10건씩)
async function batchCreate(tableName, records) {
  const results = [];
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const res = await airtableRequest(tableName, 'POST', { records: batch });
    results.push(...res.records);
    if (i + 10 < records.length) {
      await new Promise(r => setTimeout(r, 250)); // rate limit
    }
  }
  return results;
}

// ============================================================
// Stores 시드 데이터
// ============================================================
const storeRecord = {
  fields: {
    StoreName: '하루마루 생활용품',
    OwnerName: '김민지',
    KakaoChannelID: '@harumaru_shop',
    ShippingCarrier: 'CJ대한통운',
    ShippingDays: 3,
    ShipOutDays: 1,
    CutoffTime: '오후 2시',
    ExchangePeriod: 7,
    ReturnPeriod: 7,
    ReturnShippingCost: 3000,
    RefundDays: 3,
    BusinessHours: '09:00~18:00',
    BusinessDays: '월~금',
    HolidayInfo: '주말·공휴일 휴무',
    ResponseTime: '2시간 이내',
    TrackingUrl: 'https://www.cjlogistics.com/ko/tool/parcel/tracking',
    ContactPhone: '010-1234-5678',
    JejuAvailable: true,
    JejuExtraCost: 3000,
    OverseasAvailable: false,
    OverseasCountries: '',
    TaxInvoiceAvailable: true,
    TaxInvoiceContact: 'tax@harumaru.co.kr',
    PaymentMethods: '신용카드 / 네이버페이 / 무통장입금',
    InstallmentInfo: '5만원 이상 2~12개월 무이자',
    RestockInfo: '',
    ProductDetailGuide: '상품 페이지 상세 설명을 참고해 주세요',
    IsActive: true
  }
};

// ============================================================
// FAQs 시드 데이터 (PRD S01~S10)
// ============================================================
function makeFaq(storeRecordId, category, priority, patterns, template, variables) {
  return {
    fields: {
      StoreID: [storeRecordId],
      Category: category,
      Priority: priority,
      QuestionPatterns: JSON.stringify(patterns),
      AnswerTemplate: template,
      Variables: JSON.stringify(variables),
      IsActive: true
    }
  };
}

function buildFaqs(storeRecordId) {
  return [
    // S01. 배송 조회
    makeFaq(storeRecordId, '배송조회', 1,
      ['제 주문 언제 와요', '택배 운송장 번호 알려주세요', '주문한 지 3일 됐는데 아직 안 왔어요', '배송 조회', '택배 어디쯤 왔어요'],
      '안녕하세요! {{StoreName}} 입니다 😊\n\n배송 조회는 아래 방법으로 확인하실 수 있어요:\n\n배송사: {{ShippingCarrier}}\n조회 링크: {{TrackingUrl}}\n\n운송장 번호는 배송 시작 후 발송되는 카카오 알림톡에서 확인하실 수 있어요.\n추가 문의는 언제든 말씀해 주세요!',
      ['StoreName', 'ShippingCarrier', 'TrackingUrl']
    ),

    // S02. 배송 소요일
    makeFaq(storeRecordId, '배송소요일', 2,
      ['주문하면 며칠 만에 와요', '오늘 주문하면 이번 주 내로 받을 수 있나요', '배송 얼마나 걸려요', '배송 기간', '배송 일정'],
      '배송 안내드릴게요! 🚚\n\n결제 완료 후 {{ShipOutDays}}영업일 이내 출고되며, 출고 후 {{ShippingDays}}영업일 내 수령 가능합니다.\n※ {{CutoffTime}} 이전 결제 건은 당일 출고 처리됩니다. (주말·공휴일 제외)',
      ['ShipOutDays', 'ShippingDays', 'CutoffTime']
    ),

    // S03. 교환
    makeFaq(storeRecordId, '교환', 3,
      ['사이즈 교환 가능한가요', '교환하고 싶어요', '상품이 불량이에요', '색깔이 달라요', '교환 기간'],
      '교환은 수령 후 {{ExchangePeriod}}일 이내, 미사용·미개봉 상태에서 가능합니다.\n주문번호와 교환 사유를 알려주시면 빠르게 안내드리겠습니다.',
      ['ExchangePeriod']
    ),

    // S04. 반품/환불
    makeFaq(storeRecordId, '반품환불', 4,
      ['반품하고 싶어요', '환불은 어떻게 신청해요', '불량품 받았는데 전액 환불 가능한가요', '반품 배송비', '환불 기간'],
      '반품/환불 안내드릴게요.\n\n반품 가능 기간: 수령 후 {{ReturnPeriod}}일 이내\n반품 배송비: 단순 변심 {{ReturnShippingCost}}원(고객 부담), 상품 불량·오배송 무료\n\n반품 신청: 네이버 앱 → 주문 내역 → 반품 신청\n환불은 반품 상품 확인 후 {{RefundDays}}영업일 이내 처리됩니다.',
      ['ReturnPeriod', 'ReturnShippingCost', 'RefundDays']
    ),

    // S05. 주문 취소
    makeFaq(storeRecordId, '주문취소', 5,
      ['주문 취소할 수 있나요', '아직 발송 전이면 취소해 주세요', '주문 취소 어떻게 해요', '방금 주문했는데 취소', '취소 방법'],
      '주문 취소 안내드릴게요!\n\n출고 전이라면 직접 취소 가능해요:\n네이버 앱 → 주문 내역 → 취소 신청\n\n이미 출고된 경우 취소가 불가하며, 배송 완료 후 반품으로 진행해 주셔야 해요.\n취소 후 환불은 결제 수단에 따라 {{RefundDays}}영업일 내 처리됩니다.',
      ['RefundDays']
    ),

    // S06. 재입고
    makeFaq(storeRecordId, '재입고', 6,
      ['품절인데 언제 다시 들어오나요', '재입고 예정 있나요', '재입고 알림 신청할 수 있나요', '품절', 'L 사이즈 재입고'],
      '재입고 문의 주셨군요!\n\n현재 해당 상품은 일시 품절 상태예요.\n재입고 알림은 상품 페이지에서 신청하실 수 있어요:\n상품 페이지 → [재입고 알림 신청] 버튼\n\n재입고 확정 시 알림톡으로 바로 안내드릴게요.',
      []
    ),

    // S07. 영업시간
    makeFaq(storeRecordId, '영업시간', 7,
      ['고객센터 운영시간', '몇 시까지 운영해요', '주말 상담 가능한가요', '언제 답변 받을 수 있어요', '지금 문의하면 언제 답변'],
      '{{StoreName}} 운영시간은 {{BusinessHours}}, {{BusinessDays}}입니다.\n{{HolidayInfo}}이며, 운영시간 외 문의는 {{ResponseTime}} 이내 순차 답변드리고 있습니다.',
      ['StoreName', 'BusinessHours', 'BusinessDays', 'HolidayInfo', 'ResponseTime']
    ),

    // S08. 결제/세금계산서
    makeFaq(storeRecordId, '결제', 8,
      ['무통장 입금 계좌 알려주세요', '세금계산서 발행 가능한가요', '카드 할부 몇 개월까지', '결제 수단', '결제 방법'],
      '결제 관련 안내드릴게요 💳\n\n사용 가능한 결제 수단: {{PaymentMethods}}\n\n세금계산서 발행 가능합니다. 구매 후 {{TaxInvoiceContact}}로 사업자등록증과 함께 요청해 주세요.\n\n카드 무이자 할부: {{InstallmentInfo}}',
      ['PaymentMethods', 'TaxInvoiceContact', 'InstallmentInfo']
    ),

    // S09. 상품 정보
    makeFaq(storeRecordId, '상품정보', 9,
      ['이 제품 소재가 뭔가요', '사이즈 가이드 알려주세요', '세탁은 어떻게 해야 해요', '상품 정보', '제품 사양'],
      '상품 정보 안내드릴게요!\n\n자세한 정보는 상품 상세 페이지에서 확인하실 수 있어요:\n{{ProductDetailGuide}}\n\n그래도 궁금한 점이 있으시면 구체적인 상품명과 질문을 남겨주세요.\n담당자가 직접 확인 후 안내드릴게요!',
      ['ProductDetailGuide']
    ),

    // S10. 도서산간/해외 배송
    makeFaq(storeRecordId, '배송지역', 10,
      ['제주도 배송 되나요', '해외 배송 가능한가요', '도서산간 지역인데 추가 요금 있나요', '제주도 추가 배송비', '해외 배송'],
      '배송 가능 지역 안내드릴게요!\n\n제주도·도서산간 배송 가능, 추가 배송비: {{JejuExtraCost}}원\n\n현재 해외 배송은 지원하지 않습니다.',
      ['JejuExtraCost']
    )
  ];
}

// ============================================================
// 실행
// ============================================================
async function main() {
  console.log('=== Airtable 시드 데이터 투입 시작 ===\n');

  // 1. Stores 생성
  console.log('[1/2] Stores 레코드 생성 중...');
  const storeResult = await batchCreate('Stores', [storeRecord]);
  const storeRecordId = storeResult[0].id;
  console.log(`  ✓ Store 생성 완료: ${storeResult[0].fields.StoreName} (${storeRecordId})\n`);

  // 2. FAQs 생성
  console.log('[2/2] FAQs 레코드 생성 중 (10건)...');
  const faqRecords = buildFaqs(storeRecordId);
  const faqResult = await batchCreate('FAQs', faqRecords);
  faqResult.forEach(r => {
    console.log(`  ✓ FAQ 생성: ${r.fields.Category} (Priority: ${r.fields.Priority})`);
  });

  console.log(`\n=== 완료: Stores ${storeResult.length}건, FAQs ${faqResult.length}건 ===`);
  console.log(`\nStore Record ID: ${storeRecordId}`);
  console.log('이 ID를 n8n 워크플로우 테스트 시 store_id로 사용하세요.');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
