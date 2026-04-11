"""
메모 분류기 (Memo Classifier)
==============================
Notion 페이지의 뒤섞인 메모들을 Claude API로 분류하여
"글들 정리" DB에 자동 저장하고, 원본에 처리 완료 표시를 합니다.

사용법:
  1. .env 파일에 API 키 설정
  2. python memo_classifier.py --dry-run    (미리보기)
  3. python memo_classifier.py              (실행)
  4. python memo_classifier.py --page-id <ID>  (특정 페이지)

필요 패키지:
  pip install anthropic requests python-dotenv --break-system-packages
"""

import os
import re
import json
import time
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
import anthropic

# ──────────────────────────────────────────────
# 설정
# ──────────────────────────────────────────────

load_dotenv()

NOTION_API_KEY = os.getenv("NOTION_API_KEY")
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# 글들 정리 DB의 data source ID (Notion에서 확인한 값)
TARGET_DB_ID = "2eb0da3f-5145-800d-9e93-e06f46faa137"

# 기본 소스 페이지 ID (집에 사갈것들)
DEFAULT_SOURCE_PAGE_ID = "3060da3f-5145-800b-bf35-c3807c4719f2"

# 기존 카테고리 목록 (글들 정리 DB에서 가져온 것)
CATEGORIES = [
    "영단어 및 IT 용어",
    "To Do list",
    "잡글",
    "AI와 대화",
    "AI 비즈니스",
    "회사일",
    "각종 정보",
    "개인 활동 알아두면 좋은것",
    "집안일",
    "Notion 공부",
    "AI 관련 글들",
    "인문적 노트",
]

# Claude API 배치 크기 (한 번에 분류할 메모 수)
BATCH_SIZE = 25

# Notion API 요청 간격 (초) - Rate limit 방지
API_DELAY = 0.35

# 처리 완료 표시 문자 (카테고리 포함)
# 예: "✅ [AI 비즈니스] 1. 원래 메모 텍스트"
DONE_PREFIX = "✅ "


def make_done_marker(category: str) -> str:
    """카테고리 포함 완료 표시 생성"""
    return f"✅ [{category}] "

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Notion API 헬퍼
# ──────────────────────────────────────────────

NOTION_BASE = "https://api.notion.com/v1"
NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}


def notion_get(endpoint: str, params: dict = None) -> dict:
    """Notion API GET 요청"""
    time.sleep(API_DELAY)
    resp = requests.get(
        f"{NOTION_BASE}{endpoint}",
        headers=NOTION_HEADERS,
        params=params,
    )
    resp.raise_for_status()
    return resp.json()


def notion_post(endpoint: str, data: dict) -> dict:
    """Notion API POST 요청"""
    time.sleep(API_DELAY)
    resp = requests.post(
        f"{NOTION_BASE}{endpoint}",
        headers=NOTION_HEADERS,
        json=data,
    )
    if resp.status_code >= 400:
        log.error(f"Notion API 에러: {resp.status_code} - {resp.text[:200]}")
    resp.raise_for_status()
    return resp.json()


def notion_patch(endpoint: str, data: dict) -> dict:
    """Notion API PATCH 요청"""
    time.sleep(API_DELAY)
    resp = requests.patch(
        f"{NOTION_BASE}{endpoint}",
        headers=NOTION_HEADERS,
        json=data,
    )
    if resp.status_code >= 400:
        log.error(f"Notion API 에러: {resp.status_code} - {resp.text[:200]}")
    resp.raise_for_status()
    return resp.json()


# ──────────────────────────────────────────────
# 1단계: Notion 페이지에서 메모 읽기
# ──────────────────────────────────────────────


def extract_text_from_rich_text(rich_text_array: list) -> str:
    """Notion rich_text 배열에서 평문 텍스트 추출"""
    return "".join(rt.get("plain_text", "") for rt in rich_text_array)


def fetch_all_blocks(page_id: str) -> list:
    """
    페이지의 모든 블록을 가져온다 (페이지네이션 처리).
    Notion API는 한 번에 최대 100개 블록만 반환하므로
    next_cursor를 따라가며 전부 수집한다.
    """
    blocks = []
    cursor = None

    while True:
        params = {"page_size": 100}
        if cursor:
            params["start_cursor"] = cursor

        data = notion_get(f"/blocks/{page_id}/children", params)
        blocks.extend(data.get("results", []))

        if data.get("has_more"):
            cursor = data["next_cursor"]
        else:
            break

    log.info(f"총 {len(blocks)}개 블록 수집 완료")
    return blocks


def parse_memos_from_blocks(blocks: list) -> list:
    """
    블록 리스트에서 개별 메모를 파싱한다.

    패턴: "번호. 내용" 형태
    - 이미 ✅ 표시된 것은 건너뜀
    - 연속된 비번호 블록은 이전 번호의 메모에 병합

    반환: [{"number": int, "text": str, "block_ids": [str], "raw_texts": [str]}]
    """
    memos = []
    current_memo = None
    number_pattern = re.compile(r"^(\d+)\.\s*(.+)")

    for block in blocks:
        block_id = block["id"]
        block_type = block["type"]

        # 텍스트 추출 (다양한 블록 타입 지원)
        text = ""
        if block_type in ("paragraph", "bulleted_list_item", "numbered_list_item",
                          "to_do", "toggle", "callout", "quote"):
            rich_text = block.get(block_type, {}).get("rich_text", [])
            text = extract_text_from_rich_text(rich_text).strip()
        elif block_type == "heading_1":
            rich_text = block.get("heading_1", {}).get("rich_text", [])
            text = extract_text_from_rich_text(rich_text).strip()
        elif block_type == "heading_2":
            rich_text = block.get("heading_2", {}).get("rich_text", [])
            text = extract_text_from_rich_text(rich_text).strip()
        elif block_type == "heading_3":
            rich_text = block.get("heading_3", {}).get("rich_text", [])
            text = extract_text_from_rich_text(rich_text).strip()

        if not text:
            continue

        # 이미 처리된 메모 건너뛰기
        if text.startswith(DONE_PREFIX):
            current_memo = None
            continue

        # 번호 패턴 매칭
        match = number_pattern.match(text)
        if match:
            # 이전 메모 저장
            if current_memo:
                memos.append(current_memo)

            number = int(match.group(1))
            content = match.group(2).strip()
            current_memo = {
                "number": number,
                "text": content,
                "block_ids": [block_id],
                "raw_texts": [text],
            }
        elif current_memo:
            # 번호 없는 줄은 이전 메모에 병합
            current_memo["text"] += "\n" + text
            current_memo["block_ids"].append(block_id)
            current_memo["raw_texts"].append(text)

    # 마지막 메모 저장
    if current_memo:
        memos.append(current_memo)

    log.info(f"총 {len(memos)}개 메모 파싱 완료")
    return memos


# ──────────────────────────────────────────────
# 2단계: Claude API로 분류
# ──────────────────────────────────────────────

CLASSIFICATION_PROMPT = """당신은 메모 분류 전문가입니다. 아래 메모들을 주어진 카테고리로 분류하세요.

## 카테고리 목록
{categories}

## 분류 규칙
1. 각 메모를 가장 적합한 카테고리 하나에 배정하세요.
2. 기존 카테고리에 적합하지 않은 메모는 새 카테고리를 제안하세요.
   - 새 카테고리명은 기존 목록과 비슷한 스타일(한국어, 간결)로 만드세요.
   - 예: "건강/의료", "재무/대출", "해외이주 준비" 등
   - 단, 1~2개 메모만 해당되는 경우는 "잡글"로 분류하세요.
3. 날짜가 이미 지난 일회성 메모(예: "3월 16일 소독 공고문", "토요일 회식")는 is_expired: true로 표시하세요.
   - 오늘 날짜: {today}
   - 구체적 날짜가 없는 반복 가능한 메모는 만료로 보지 마세요.
4. 장보기 목록(식재료, 생활용품 나열)은 "집안일"로 분류하세요.
5. AI 도구 학습/사용 관련은 "AI 관련 글들"로, AI 사업 전략은 "AI 비즈니스"로 구분하세요.
6. 개인적 감정 토로, 사회 비판, 철학적 성찰은 "인문적 노트"로 분류하세요.
7. 단순한 할 일(~하기, ~사기 등 행동 지시)은 "To Do list"로 분류하세요.
8. 회사 업무 관련(소장님, 과장님, 상가, 소방점검 등)은 "회사일"로 분류하세요.
9. 건강/병원 관련은 "개인 활동 알아두면 좋은것"으로 분류하세요.
10. 메모의 핵심을 요약한 짧은 제목(15자 이내)을 summary에 넣으세요.
11. is_new_category: 기존 목록에 없는 새 카테고리이면 true, 아니면 false.

## 출력 형식
반드시 JSON 배열만 출력하세요. 다른 텍스트는 절대 포함하지 마세요.

[
  {{"number": 1, "category": "카테고리명", "summary": "짧은 요약", "is_expired": false, "is_new_category": false}},
  ...
]

## 분류할 메모들
{memos}
"""


def classify_memos_batch(memos: list, client: anthropic.Anthropic) -> list:
    """
    메모 배치를 Claude API로 분류한다.
    비용 최적화: 배치로 보내서 API 호출 횟수를 줄인다.
    """
    # 메모 텍스트 포매팅
    memo_text = "\n".join(
        f"[{m['number']}] {m['text'][:300]}"  # 300자 제한으로 토큰 절약
        for m in memos
    )

    categories_text = "\n".join(f"- {c}" for c in CATEGORIES)
    today = datetime.now().strftime("%Y년 %m월 %d일")

    prompt = CLASSIFICATION_PROMPT.format(
        categories=categories_text,
        today=today,
        memos=memo_text,
    )

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # 비용 효율적인 Haiku 사용
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    # 응답 파싱
    raw_text = response.content[0].text.strip()

    # JSON 추출 (```json 래핑 제거)
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        results = json.loads(raw_text)
    except json.JSONDecodeError as e:
        log.error(f"JSON 파싱 실패: {e}")
        log.error(f"원본 응답: {raw_text[:500]}")
        return []

    return results


def classify_all_memos(memos: list) -> list:
    """
    모든 메모를 배치 단위로 분류한다.
    BATCH_SIZE(25개)씩 나누어 Claude API를 호출한다.
    """
    client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
    all_results = []

    for i in range(0, len(memos), BATCH_SIZE):
        batch = memos[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(memos) + BATCH_SIZE - 1) // BATCH_SIZE

        log.info(f"배치 {batch_num}/{total_batches} 분류 중 ({len(batch)}개 메모)...")

        results = classify_memos_batch(batch, client)
        all_results.extend(results)

        # API rate limit 방지
        if i + BATCH_SIZE < len(memos):
            time.sleep(1)

    log.info(f"총 {len(all_results)}개 메모 분류 완료")
    return all_results


# ──────────────────────────────────────────────
# 3단계: 글들 정리 DB에 저장
# ──────────────────────────────────────────────


def create_db_entry(memo: dict, classification: dict) -> dict:
    """
    분류된 메모를 "글들 정리" DB에 페이지로 생성한다.

    DB 스키마:
    - 이름 (title): 요약 제목
    - 카테고리 (select): 분류 카테고리
    - 날짜 (date): 오늘 날짜
    """
    title = classification.get("summary", memo["text"][:30])
    category = classification.get("category", "잡글")

    # 카테고리 확인 (Notion API는 새 select 옵션을 자동 생성함)
    if category not in CATEGORIES:
        log.info(f"📌 새 카테고리 생성됨: '{category}'")

    page_data = {
        "parent": {"database_id": TARGET_DB_ID},
        "properties": {
            "이름": {
                "title": [{"text": {"content": title}}]
            },
            "카테고리": {
                "select": {"name": category}
            },
            "날짜": {
                "date": {"start": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
            },
        },
        # 메모 원문을 페이지 본문에 저장
        "children": [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {"type": "text", "text": {"content": memo["text"][:2000]}}
                    ]
                },
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {"content": f"───\n원본 번호: {memo['number']}"},
                            "annotations": {"color": "gray"},
                        }
                    ]
                },
            },
        ],
    }

    result = notion_post("/pages", page_data)
    return result


# ──────────────────────────────────────────────
# 4단계: 원본 메모에 처리 완료 표시
# ──────────────────────────────────────────────


def mark_memo_as_done(memo: dict, category: str = ""):
    """
    원본 메모의 첫 번째 블록 텍스트 앞에 ✅ [카테고리] 를 붙인다.
    예: "✅ [AI 비즈니스] 1. 원래 메모 텍스트"
    이렇게 표시된 메모는 다음 실행 시 건너뛴다.
    """
    block_id = memo["block_ids"][0]
    original_text = memo["raw_texts"][0]
    marker = make_done_marker(category) if category else DONE_PREFIX
    marked_text = marker + original_text

    # 블록 정보를 먼저 가져와서 타입 확인
    block_info = notion_get(f"/blocks/{block_id}")
    block_type = block_info["type"]

    if block_type not in ("paragraph", "bulleted_list_item", "numbered_list_item",
                          "to_do", "toggle", "callout", "quote",
                          "heading_1", "heading_2", "heading_3"):
        log.warning(f"지원하지 않는 블록 타입: {block_type} (블록 {block_id})")
        return

    update_data = {
        block_type: {
            "rich_text": [
                {"type": "text", "text": {"content": marked_text}}
            ]
        }
    }

    notion_patch(f"/blocks/{block_id}", update_data)


# ──────────────────────────────────────────────
# 메인 실행
# ──────────────────────────────────────────────


def print_classification_summary(memos: list, classifications: list):
    """분류 결과 요약 출력"""
    # 번호별 매핑
    class_map = {c["number"]: c for c in classifications}

    # 카테고리별 집계
    category_counts = {}
    expired_count = 0

    for c in classifications:
        cat = c.get("category", "미분류")
        category_counts[cat] = category_counts.get(cat, 0) + 1
        if c.get("is_expired"):
            expired_count += 1

    print("\n" + "=" * 60)
    print("📊 분류 결과 요약")
    print("=" * 60)

    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        is_new = " 🆕" if cat not in CATEGORIES else ""
        bar = "█" * min(count, 30)
        print(f"  {cat:20s} │ {count:3d}개 {bar}{is_new}")

    # 새 카테고리 목록
    new_cats = [c.get("category") for c in classifications
                if c.get("is_new_category") or c.get("category") not in CATEGORIES]
    new_cats_unique = sorted(set(new_cats))
    if new_cats_unique:
        print(f"\n  🆕 새로 생성될 카테고리: {', '.join(new_cats_unique)}")

    print(f"\n  ⏰ 만료된 메모: {expired_count}개 (DB 저장 건너뜀)")
    print(f"  📝 저장 대상: {len(classifications) - expired_count}개")
    print("=" * 60)

    # 상세 내역 (처음 10개만)
    print("\n📋 분류 미리보기 (처음 10개):")
    print("-" * 60)
    for c in classifications[:10]:
        memo = next((m for m in memos if m["number"] == c["number"]), None)
        expired = " ⏰만료" if c.get("is_expired") else ""
        text_preview = memo["text"][:40] if memo else "?"
        print(f"  [{c['number']:3d}] {c.get('category', '?'):15s} │ {c.get('summary', '?')}{expired}")
        print(f"        원문: {text_preview}...")
    print("-" * 60)


def run(page_id: str, dry_run: bool = False, skip_expired: bool = True):
    """
    메인 실행 함수

    Args:
        page_id: 소스 Notion 페이지 ID
        dry_run: True면 분류만 하고 실제 저장/표시 안 함
        skip_expired: True면 만료된 메모는 DB 저장 건너뜀
    """
    # 유효성 검사
    if not NOTION_API_KEY:
        log.error("NOTION_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
        return
    if not CLAUDE_API_KEY:
        log.error("ANTHROPIC_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
        return

    log.info("=" * 50)
    log.info("메모 분류기 시작")
    log.info(f"소스 페이지: {page_id}")
    log.info(f"모드: {'미리보기 (dry-run)' if dry_run else '실행'}")
    log.info("=" * 50)

    # 1. 블록 읽기
    log.info("1단계: Notion 페이지 블록 읽기...")
    blocks = fetch_all_blocks(page_id)

    # 2. 메모 파싱
    log.info("2단계: 메모 파싱...")
    memos = parse_memos_from_blocks(blocks)

    if not memos:
        log.info("처리할 새 메모가 없습니다.")
        return

    # 3. Claude로 분류
    log.info("3단계: Claude API로 분류...")
    classifications = classify_all_memos(memos)

    if not classifications:
        log.error("분류 결과가 없습니다.")
        return

    # 결과 요약 출력
    print_classification_summary(memos, classifications)

    if dry_run:
        print("\n🔍 Dry-run 모드: 여기까지만 미리보기입니다.")
        print("   실제 실행하려면: python memo_classifier.py")
        return

    # 4. DB 저장 + 원본 표시
    class_map = {c["number"]: c for c in classifications}
    saved = 0
    skipped = 0
    errors = 0

    log.info("4단계: DB 저장 및 원본 표시...")

    for memo in memos:
        classification = class_map.get(memo["number"])
        if not classification:
            log.warning(f"메모 #{memo['number']} 분류 결과 없음 - 건너뜀")
            skipped += 1
            continue

        # 만료된 메모 처리
        if skip_expired and classification.get("is_expired"):
            log.info(f"메모 #{memo['number']} 만료됨 - DB 저장 건너뜀, 원본에만 표시")
            try:
                mark_memo_as_done(memo, "만료됨")
            except Exception as e:
                log.error(f"메모 #{memo['number']} 표시 실패: {e}")
                errors += 1
            skipped += 1
            continue

        # DB에 저장
        try:
            create_db_entry(memo, classification)
            saved += 1
        except Exception as e:
            log.error(f"메모 #{memo['number']} DB 저장 실패: {e}")
            errors += 1
            continue

        # 원본에 완료 표시 (카테고리 포함)
        try:
            mark_memo_as_done(memo, classification.get("category", ""))
        except Exception as e:
            log.error(f"메모 #{memo['number']} 표시 실패: {e}")
            errors += 1

        # 진행률 표시
        if saved % 10 == 0:
            log.info(f"진행 중: {saved}개 저장됨...")

    # 최종 결과
    print("\n" + "=" * 60)
    print("✅ 실행 완료!")
    print(f"   저장: {saved}개 │ 건너뜀: {skipped}개 │ 에러: {errors}개")
    print("=" * 60)


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Notion 메모 자동 분류기",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python memo_classifier.py --dry-run          분류 결과만 미리보기
  python memo_classifier.py                    실제 실행 (기본 페이지)
  python memo_classifier.py --page-id ABC123   특정 페이지 처리
  python memo_classifier.py --include-expired  만료 메모도 DB에 저장
        """,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="분류 결과만 보여주고 실제 저장/표시는 하지 않음",
    )
    parser.add_argument(
        "--page-id",
        default=DEFAULT_SOURCE_PAGE_ID,
        help="처리할 Notion 페이지 ID (기본: 집에 사갈것들)",
    )
    parser.add_argument(
        "--include-expired",
        action="store_true",
        help="만료된 메모도 DB에 저장 (기본: 건너뜀)",
    )

    args = parser.parse_args()
    run(
        page_id=args.page_id,
        dry_run=args.dry_run,
        skip_expired=not args.include_expired,
    )
