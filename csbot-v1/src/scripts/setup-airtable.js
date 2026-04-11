#!/usr/bin/env node
/**
 * Airtable 베이스 셋업 스크립트
 * 실행: node src/scripts/setup-airtable.js
 *
 * 1단계: 기존 "Table 1", "test_scope_check" 등 불필요 테이블은 수동 삭제 필요 (API 미지원)
 * 2단계: Stores, FAQs, Conversations 테이블 생성 (스키마 포함)
 * 3단계: 시드 데이터 투입 (Stores 1건 + FAQs 10건)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// .env
const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});
const BASE_ID = env.AIRTABLE_BASE_ID;
const PAT = env.AIRTABLE_PAT;

// ============================================================
// HTTP 헬퍼
// ============================================================
function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.airtable.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode} ${method} ${urlPath}: ${body}`));
        } else {
          resolve(body ? JSON.parse(body) : {});
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function createTable(name, fields) {
  return request('POST', `/v0/meta/bases/${BASE_ID}/tables`, { name, fields });
}

function createRecords(tableName, records) {
  return request('POST', `/v0/${BASE_ID}/${encodeURIComponent(tableName)}`, { records });
}

// ============================================================
// 테이블 스키마 정의
// ============================================================
const STORES_FIELDS = [
  { name: 'StoreName', type: 'singleLineText' },
  { name: 'OwnerName', type: 'singleLineText' },
  { name: 'KakaoChannelID', type: 'singleLineText' },
  { name: 'ShippingCarrier', type: 'singleLineText' },
  { name: 'ShippingDays', type: 'number', options: { precision: 0 } },
  { name: 'ShipOutDays', type: 'number', options: { precision: 0 } },
  { name: 'CutoffTime', type: 'singleLineText' },
  { name: 'ReturnPolicy', type: 'multilineText' },
  { name: 'ExchangePeriod', type: 'number', options: { precision: 0 } },
  { name: 'ReturnPeriod', type: 'number', options: { precision: 0 } },
  { name: 'ReturnShippingCost', type: 'number', options: { precision: 0 } },
  { name: 'RefundDays', type: 'number', options: { precision: 0 } },
  { name: 'BusinessHours', type: 'singleLineText' },
  { name: 'BusinessDays', type: 'singleLineText' },
  { name: 'HolidayInfo', type: 'singleLineText' },
  { name: 'ResponseTime', type: 'singleLineText' },
  { name: 'TrackingUrl', type: 'url' },
  { name: 'ContactPhone', type: 'phoneNumber' },
  { name: 'JejuAvailable', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
  { name: 'JejuExtraCost', type: 'number', options: { precision: 0 } },
  { name: 'OverseasAvailable', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
  { name: 'OverseasCountries', type: 'singleLineText' },
  { name: 'TaxInvoiceAvailable', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
  { name: 'TaxInvoiceContact', type: 'email' },
  { name: 'PaymentMethods', type: 'multilineText' },
  { name: 'InstallmentInfo', type: 'singleLineText' },
  { name: 'RestockInfo', type: 'singleLineText' },
  { name: 'ProductDetailGuide', type: 'multilineText' },
  { name: 'CustomNotes', type: 'multilineText' },
  { name: 'IsActive', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
];

// FAQs - StoreID는 link field, 테이블 생성 후 추가
const FAQS_FIELDS = [
  { name: 'FAQName', type: 'singleLineText' },
  { name: 'Category', type: 'singleSelect', options: {
    choices: [
      { name: '배송조회' }, { name: '배송소요일' }, { name: '교환' },
      { name: '반품환불' }, { name: '주문취소' }, { name: '재입고' },
      { name: '영업시간' }, { name: '결제' }, { name: '상품정보' },
      { name: '배송지역' }, { name: '기타' }
    ]
  }},
  { name: 'QuestionPatterns', type: 'multilineText' },
  { name: 'AnswerTemplate', type: 'multilineText' },
  { name: 'Variables', type: 'multilineText' },
  { name: 'IsActive', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
  { name: 'Priority', type: 'number', options: { precision: 0 } },
];

const CONVERSATIONS_FIELDS = [
  { name: 'SessionID', type: 'singleLineText' },
  { name: 'Channel', type: 'singleSelect', options: {
    choices: [{ name: 'kakao' }, { name: 'web_widget' }]
  }},
  { name: 'CustomerMessage', type: 'multilineText' },
  { name: 'BotResponse', type: 'multilineText' },
  { name: 'MatchedCategory', type: 'singleLineText' },
  { name: 'WasFallback', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
  { name: 'ResponseTimeMs', type: 'number', options: { precision: 0 } },
];

// ============================================================
// 시드 데이터
// ============================================================
const STORE_SEED = {
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

function buildFaqSeeds(storeRecordId) {
  const faq = (cat, pri, patterns, template, vars) => ({
    fields: {
      FAQName: cat,
      StoreID: [storeRecordId],
      Category: cat,
      Priority: pri,
      QuestionPatterns: JSON.stringify(patterns),
      AnswerTemplate: template,
      Variables: JSON.stringify(vars),
      IsActive: true
    }
  });

  return [
    faq('배송조회', 1,
      ['제 주문 언제 와요', '택배 운송장 번호 알려주세요', '주문한 지 3일 됐는데 아직 안 왔어요', '배송 조회', '택배 어디쯤 왔어요'],
      '안녕하세요! {{StoreName}} 입니다 😊\n\n배송 조회는 아래 방법으로 확인하실 수 있어요:\n\n배송사: {{ShippingCarrier}}\n조회 링크: {{TrackingUrl}}\n\n운송장 번호는 배송 시작 후 발송되는 카카오 알림톡에서 확인하실 수 있어요.\n추가 문의는 언제든 말씀해 주세요!',
      ['StoreName', 'ShippingCarrier', 'TrackingUrl']),
    faq('배송소요일', 2,
      ['주문하면 며칠 만에 와요', '오늘 주문하면 이번 주 내로 받을 수 있나요', '배송 얼마나 걸려요', '배송 기간', '배송 일정'],
      '배송 안내드릴게요! 🚚\n\n결제 완료 후 {{ShipOutDays}}영업일 이내 출고되며, 출고 후 {{ShippingDays}}영업일 내 수령 가능합니다.\n※ {{CutoffTime}} 이전 결제 건은 당일 출고 처리됩니다. (주말·공휴일 제외)',
      ['ShipOutDays', 'ShippingDays', 'CutoffTime']),
    faq('교환', 3,
      ['사이즈 교환 가능한가요', '교환하고 싶어요', '상품이 불량이에요', '색깔이 달라요', '교환 기간'],
      '교환은 수령 후 {{ExchangePeriod}}일 이내, 미사용·미개봉 상태에서 가능합니다.\n주문번호와 교환 사유를 알려주시면 빠르게 안내드리겠습니다.',
      ['ExchangePeriod']),
    faq('반품환불', 4,
      ['반품하고 싶어요', '환불은 어떻게 신청해요', '불량품 받았는데 전액 환불 가능한가요', '반품 배송비', '환불 기간'],
      '반품/환불 안내드릴게요.\n\n반품 가능 기간: 수령 후 {{ReturnPeriod}}일 이내\n반품 배송비: 단순 변심 {{ReturnShippingCost}}원(고객 부담), 상품 불량·오배송 무료\n\n반품 신청: 네이버 앱 → 주문 내역 → 반품 신청\n환불은 반품 상품 확인 후 {{RefundDays}}영업일 이내 처리됩니다.',
      ['ReturnPeriod', 'ReturnShippingCost', 'RefundDays']),
    faq('주문취소', 5,
      ['주문 취소할 수 있나요', '아직 발송 전이면 취소해 주세요', '주문 취소 어떻게 해요', '방금 주문했는데 취소', '취소 방법'],
      '주문 취소 안내드릴게요!\n\n출고 전이라면 직접 취소 가능해요:\n네이버 앱 → 주문 내역 → 취소 신청\n\n이미 출고된 경우 취소가 불가하며, 배송 완료 후 반품으로 진행해 주셔야 해요.\n취소 후 환불은 결제 수단에 따라 {{RefundDays}}영업일 내 처리됩니다.',
      ['RefundDays']),
    faq('재입고', 6,
      ['품절인데 언제 다시 들어오나요', '재입고 예정 있나요', '재입고 알림 신청할 수 있나요', '품절', 'L 사이즈 재입고'],
      '재입고 문의 주셨군요!\n\n현재 해당 상품은 일시 품절 상태예요.\n재입고 알림은 상품 페이지에서 신청하실 수 있어요:\n상품 페이지 → [재입고 알림 신청] 버튼\n\n재입고 확정 시 알림톡으로 바로 안내드릴게요.',
      []),
    faq('영업시간', 7,
      ['고객센터 운영시간', '몇 시까지 운영해요', '주말 상담 가능한가요', '언제 답변 받을 수 있어요', '지금 문의하면 언제 답변'],
      '{{StoreName}} 운영시간은 {{BusinessHours}}, {{BusinessDays}}입니다.\n{{HolidayInfo}}이며, 운영시간 외 문의는 {{ResponseTime}} 이내 순차 답변드리고 있습니다.',
      ['StoreName', 'BusinessHours', 'BusinessDays', 'HolidayInfo', 'ResponseTime']),
    faq('결제', 8,
      ['무통장 입금 계좌 알려주세요', '세금계산서 발행 가능한가요', '카드 할부 몇 개월까지', '결제 수단', '결제 방법'],
      '결제 관련 안내드릴게요 💳\n\n사용 가능한 결제 수단: {{PaymentMethods}}\n\n세금계산서 발행 가능합니다. 구매 후 {{TaxInvoiceContact}}로 사업자등록증과 함께 요청해 주세요.\n\n카드 무이자 할부: {{InstallmentInfo}}',
      ['PaymentMethods', 'TaxInvoiceContact', 'InstallmentInfo']),
    faq('상품정보', 9,
      ['이 제품 소재가 뭔가요', '사이즈 가이드 알려주세요', '세탁은 어떻게 해야 해요', '상품 정보', '제품 사양'],
      '상품 정보 안내드릴게요!\n\n자세한 정보는 상품 상세 페이지에서 확인하실 수 있어요:\n{{ProductDetailGuide}}\n\n그래도 궁금한 점이 있으시면 구체적인 상품명과 질문을 남겨주세요.\n담당자가 직접 확인 후 안내드릴게요!',
      ['ProductDetailGuide']),
    faq('배송지역', 10,
      ['제주도 배송 되나요', '해외 배송 가능한가요', '도서산간 지역인데 추가 요금 있나요', '제주도 추가 배송비', '해외 배송'],
      '배송 가능 지역 안내드릴게요!\n\n제주도·도서산간 배송 가능, 추가 배송비: {{JejuExtraCost}}원\n\n현재 해외 배송은 지원하지 않습니다.',
      ['JejuExtraCost']),
  ];
}

// ============================================================
// 실행
// ============================================================
async function main() {
  console.log('=== Airtable 베이스 셋업 시작 ===\n');

  // 1. 기존 테이블 확인
  console.log('[0/4] 기존 테이블 확인...');
  const meta = await request('GET', `/v0/meta/bases/${BASE_ID}/tables`);
  const existing = meta.tables.map(t => t.name);
  console.log(`  기존 테이블: ${existing.join(', ')}\n`);

  // 2. Stores 테이블 생성
  let storesTableId;
  if (existing.includes('Stores')) {
    console.log('[1/4] Stores 테이블 이미 존재 — 건너뜀');
    storesTableId = meta.tables.find(t => t.name === 'Stores').id;
  } else {
    console.log('[1/4] Stores 테이블 생성 중...');
    const res = await createTable('Stores', STORES_FIELDS);
    storesTableId = res.id;
    console.log(`  ✓ Stores 생성 완료 (${storesTableId})`);
  }

  // 3. FAQs 테이블 생성 (StoreID link 포함)
  let faqsTableId;
  if (existing.includes('FAQs')) {
    console.log('[2/4] FAQs 테이블 이미 존재 — 건너뜀');
    faqsTableId = meta.tables.find(t => t.name === 'FAQs').id;
  } else {
    console.log('[2/4] FAQs 테이블 생성 중...');
    const faqFields = [
      ...FAQS_FIELDS,
      { name: 'StoreID', type: 'multipleRecordLinks', options: { linkedTableId: storesTableId } },
    ];
    const res = await createTable('FAQs', faqFields);
    faqsTableId = res.id;
    console.log(`  ✓ FAQs 생성 완료 (${faqsTableId})`);
  }

  // 4. Conversations 테이블 생성
  if (existing.includes('Conversations')) {
    console.log('[3/4] Conversations 테이블 이미 존재 — 건너뜀');
  } else {
    console.log('[3/4] Conversations 테이블 생성 중...');
    const convFields = [
      ...CONVERSATIONS_FIELDS,
      { name: 'StoreID', type: 'multipleRecordLinks', options: { linkedTableId: storesTableId } },
      { name: 'MatchedFAQID', type: 'multipleRecordLinks', options: { linkedTableId: faqsTableId } },
    ];
    await createTable('Conversations', convFields);
    console.log('  ✓ Conversations 생성 완료');
  }

  // 5. 시드 데이터 투입
  console.log('\n[4/4] 시드 데이터 투입 중...');

  // Store — 기존 레코드 확인
  const existingStores = await request('GET', `/v0/${BASE_ID}/${encodeURIComponent('Stores')}?maxRecords=1`);
  let storeRecordId;
  if (existingStores.records && existingStores.records.length > 0) {
    storeRecordId = existingStores.records[0].id;
    console.log(`  Stores 레코드 이미 존재 — 건너뜀 (${storeRecordId})`);
  } else {
    console.log('  Stores 레코드 생성...');
    const storeRes = await createRecords('Stores', [STORE_SEED]);
    storeRecordId = storeRes.records[0].id;
    console.log(`  ✓ Store: ${storeRes.records[0].fields.StoreName} (${storeRecordId})`);
  }

  // FAQs — 기존 레코드 확인
  const existingFaqs = await request('GET', `/v0/${BASE_ID}/${encodeURIComponent('FAQs')}?maxRecords=1`);
  if (existingFaqs.records && existingFaqs.records.length > 0) {
    console.log(`  FAQs 레코드 이미 존재 (${existingFaqs.records.length}건+) — 건너뜀`);
    console.log('\n=== 완료 (기존 데이터 유지) ===');
    return;
  }

  // FAQs (10건)
  console.log('  FAQs 레코드 생성 (10건)...');
  const faqSeeds = buildFaqSeeds(storeRecordId);
  const faqRes = await createRecords('FAQs', faqSeeds);
  faqRes.records.forEach(r => {
    console.log(`  ✓ FAQ: ${r.fields.Category} (Priority: ${r.fields.Priority})`);
  });

  console.log(`\n=== 완료 ===`);
  console.log(`Stores: 1건 | FAQs: ${faqRes.records.length}건`);
  console.log(`Store Record ID: ${storeRecordId}`);
  console.log(`\n※ 불필요한 "Table 1", "test_scope_check" 테이블은 Airtable 웹에서 수동 삭제해 주세요.`);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
