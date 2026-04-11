"""
글들정리 → 글들정리2 마이그레이션 스크립트
==========================================
기존 "글들 정리" DB의 모든 페이지를 새 15개 카테고리 체계로
"글들정리2" DB에 재분류하여 저장합니다.

- 짧은 메모 (오늘 추가된 것들): 카테고리별로 최대 30개씩 묶어서 1페이지로
- 기존 페이지 (원래 있던 것들): 제목/내용 그대로, 카테고리만 새로 매김

사용법:
  python3 migrate_to_db2.py --dry-run    (미리보기)
  python3 migrate_to_db2.py              (실행)

필요 패키지: anthropic requests python-dotenv
"""

import os
import re
import json
import time
import math
import argparse
import logging
from datetime import datetime, timezone
from collections import defaultdict

import requests
from dotenv import load_dotenv
import anthropic

load_dotenv()

NOTION_API_KEY = os.getenv("NOTION_API_KEY")
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# 소스: 기존 글들 정리 DB
SOURCE_DB_ID = "2eb0da3f-5145-800d-9e93-e06f46faa137"

# 목적지: 글들정리2 DB ID
TARGET_DB2_ID = "01589ac5339e4654a312aaf936bddec1"

# 오늘 날짜 (묶인 페이지 제목에 사용)
TODAY = datetime.now().strftime("%-m/%-d")

# 카테고리별 묶기 상한
BUNDLE_MAX = 30

# 새 15개 카테고리
NEW_CATEGORIES = [
    "할 일",
    "회사일",
    "집안일/장보기",
    "AI 비즈니스",
    "AI/기술 학습",
    "영단어 및 IT 용어",
    "자기관리/건강",
    "재무/행정",
    "해외이주/여행",
    "각종 정보",
    "인문적 노트",
    "개인 일기",
    "인간관계",
    "커리어/학습전략",
]

# 기존 → 새 카테고리 매핑 (확실한 것들만)
CATEGORY_MAP = {
    "To Do list": "할 일",
    "회사일": "회사일",
    "집안일": "집안일/장보기",
    "AI 비즈니스": "AI 비즈니스",
    "AI 관련 글들": "AI/기술 학습",
    "AI와 대화": "AI/기술 학습",
    "Notion 공부": "AI/기술 학습",
    "영단어 및 IT 용어": "영단어 및 IT 용어",
    "개인 활동 알아두면 좋은것": "자기관리/건강",
    "각종 정보": "각종 정보",
    "인문적 노트": "인문적 노트",
    # "잡글"은 내용을 봐야 하므로 AI 판단에 맡김
}

BATCH_SIZE = 20
API_DELAY = 0.35

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


def notion_post(endpoint, data):
    time.sleep(API_DELAY)
    resp = requests.post(f"{NOTION_BASE}{endpoint}", headers=NOTION_HEADERS, json=data)
    if resp.status_code >= 400:
        log.error(f"Notion API 에러: {resp.status_code} - {resp.text[:300]}")
    resp.raise_for_status()
    return resp.json()


def notion_get(endpoint, params=None):
    time.sleep(API_DELAY)
    resp = requests.get(f"{NOTION_BASE}{endpoint}", headers=NOTION_HEADERS, params=params)
    resp.raise_for_status()
    return resp.json()


# ──────────────────────────────────────────────
# 1단계: 기존 DB에서 모든 페이지 목록 수집
# ──────────────────────────────────────────────

def fetch_all_db_pages(db_id):
    """DB의 모든 페이지를 페이지네이션으로 수집"""
    pages = []
    cursor = None

    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor

        data = notion_post(f"/databases/{db_id}/query", body)
        pages.extend(data.get("results", []))

        if data.get("has_more"):
            cursor = data["next_cursor"]
        else:
            break

    log.info(f"DB에서 총 {len(pages)}개 페이지 수집")
    return pages


def extract_page_info(page):
    """페이지 메타데이터 추출"""
    props = page.get("properties", {})

    # 제목 추출
    title = ""
    title_prop = props.get("이름", {})
    if title_prop.get("type") == "title":
        title_items = title_prop.get("title", [])
        title = "".join(t.get("plain_text", "") for t in title_items)

    # 카테고리 추출
    category = ""
    cat_prop = props.get("카테고리", {})
    if cat_prop.get("type") == "select" and cat_prop.get("select"):
        category = cat_prop["select"].get("name", "")

    # 생성 시간
    created = page.get("created_time", "")

    return {
        "id": page["id"],
        "title": title.strip(),
        "category": category,
        "created": created,
        "url": page.get("url", ""),
    }


# ──────────────────────────────────────────────
# 2단계: 페이지 본문 읽기
# ──────────────────────────────────────────────

def fetch_page_content(page_id):
    """페이지의 모든 블록 텍스트를 추출"""
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

    # 텍스트 추출
    text_parts = []
    text_types = (
        "paragraph", "bulleted_list_item", "numbered_list_item",
        "to_do", "toggle", "callout", "quote",
        "heading_1", "heading_2", "heading_3",
    )

    for block in blocks:
        bt = block["type"]
        if bt in text_types:
            rich_text = block.get(bt, {}).get("rich_text", [])
            line = "".join(rt.get("plain_text", "") for rt in rich_text).strip()
            if line:
                text_parts.append(line)

    return "\n".join(text_parts)


def is_short_memo(content):
    """오늘 스크립트로 추가된 짧은 메모인지 판별"""
    return "원본 번호:" in content


# ──────────────────────────────────────────────
# 3단계: Claude API로 새 카테고리 분류
# ──────────────────────────────────────────────

RECLASSIFY_PROMPT = """당신은 메모 분류 전문가입니다. 아래 메모들을 새로운 15개 카테고리 체계로 재분류하세요.

## 새 카테고리 목록 (이 중에서만 선택)
{categories}

## 분류 기준
1. "할 일": 단순한 행동 지시 (~하기, ~사기, ~확인)
2. "회사일": 직장 업무, 상가 관리, 소장님/과장님, 소방점검, 공문서
3. "집안일/장보기": 식재료, 생활용품, 집 관리, 청소
4. "AI 비즈니스": ArumDri 사업 전략, 수익화, 고객 발굴, 마케팅
5. "AI/기술 학습": Claude Code, n8n, 프롬프트, 스킬, 에이전트, 워크플로우, 도구 학습
6. "영단어 및 IT 용어": 용어 정리, 개념 학습 노트
7. "자기관리/건강": 운동, 병원, 약, 정형외과, 건강검진, 수면, 식이
8. "재무/행정": 대출, 환전, 통장정리, 세금, 보험, 주식, 정부서류
9. "해외이주/여행": 치앙마이, 조지아, 캄보디아, 비행기, 비자, 해외생활
10. "각종 정보": 유용한 링크, 참고자료, 구독 서비스
11. "인문적 노트": 철학적 성찰, 사회 비판, 책/영화 감상, 깊은 사유 (차분한 톤)
12. "개인 일기": 감정 토로, 일상 기록, 분노/좌절/외로움 표현, 스트레스 해소 글
13. "인간관계": 특정 인물과의 관계, 모임, 약속, 연락
14. "커리어/학습전략": 자격증, 포트폴리오, 이력서, 프리랜서, 직업 전환

## 핵심 구분 기준
- "인문적 노트" vs "개인 일기": 톤이 차분하고 관찰적이면 인문적 노트, 감정이 격하거나 개인적 고통이면 개인 일기
- "잡글"은 없습니다. 반드시 위 14개 중 하나에 배정하세요.
- 기존 카테고리가 "잡글"이었어도, 내용을 읽고 적절한 새 카테고리에 넣으세요.

## 출력 형식
JSON 배열만 출력하세요. 다른 텍스트 없이.

[
  {{"id": "페이지ID", "new_category": "새카테고리명"}},
  ...
]

## 분류할 항목들
{items}
"""


def classify_batch(items, client):
    """항목 배치를 Claude API로 재분류"""
    items_text = "\n".join(
        f"[{it['id']}] 제목: {it['title'][:50]} | 기존: {it['category']} | 내용: {it['content_preview'][:200]}"
        for it in items
    )

    cats_text = "\n".join(f"- {c}" for c in NEW_CATEGORIES)

    prompt = RECLASSIFY_PROMPT.format(
        categories=cats_text,
        items=items_text,
    )

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        log.error(f"JSON 파싱 실패: {e}")
        return []


def classify_with_fallback(page_info, content_preview):
    """확실한 매핑이 있으면 바로 적용, 아니면 AI 분류 대상으로"""
    old_cat = page_info["category"]

    # 잡글이 아닌 확실한 매핑
    if old_cat in CATEGORY_MAP and old_cat != "잡글":
        return CATEGORY_MAP[old_cat], False  # (new_cat, needs_ai)

    return None, True  # AI 분류 필요


# ──────────────────────────────────────────────
# 4단계: 글들정리2 DB에 저장
# ──────────────────────────────────────────────

def create_bundled_page(category, memos, bundle_idx, total_bundles):
    """
    짧은 메모들을 하나의 페이지로 묶어서 생성
    각 메모의 실제 내용을 본문에 포함한다.
    """
    title = f"{category} ({TODAY})"
    if total_bundles > 1:
        title += f" ({bundle_idx}/{total_bundles})"

    # 본문 구성: 메모 내용을 번호와 함께 포함
    content_lines = []
    for i, memo in enumerate(memos, 1):
        memo_text = memo.get("clean_content") or memo.get("content") or memo["title"]
        content_lines.append(f"{i}. {memo_text.strip()}")

    content = "\n".join(content_lines)

    page_data = {
        "parent": {"database_id": TARGET_DB2_ID},
        "properties": {
            "이름": {"title": [{"text": {"content": title}}]},
            "카테고리": {"select": {"name": category}},
            "원본카테고리": {"select": {"name": "memo_classifier 생성"}},
            "날짜": {"date": {"start": datetime.now(timezone.utc).strftime("%Y-%m-%d")}},
        },
        "children": build_content_blocks(content),
    }

    return notion_post("/pages", page_data)


def create_original_page(page_info, new_category, content):
    """
    기존 페이지를 제목/내용 그대로 새 DB에 복사 (카테고리만 새로)
    """
    # 본문을 블록으로 변환 (2000자 제한)
    truncated = content[:2000] if len(content) > 2000 else content

    page_data = {
        "parent": {"database_id": TARGET_DB2_ID},
        "properties": {
            "이름": {"title": [{"text": {"content": page_info["title"][:100]}}]},
            "카테고리": {"select": {"name": new_category}},
            "원본카테고리": {"select": {"name": page_info["category"] or "미분류"}},
            "날짜": {"date": {"start": datetime.now(timezone.utc).strftime("%Y-%m-%d")}},
        },
        "children": build_content_blocks(truncated),
    }

    return notion_post("/pages", page_data)


def build_content_blocks(text):
    """텍스트를 Notion 블록 배열로 변환"""
    blocks = []
    for line in text.split("\n"):
        if not line.strip():
            continue
        # Notion API는 한 블록에 최대 2000자
        chunk = line[:2000]
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": chunk}}]
            },
        })
        if len(blocks) >= 95:  # Notion API 블록 제한 (100개)
            break
    return blocks


# ──────────────────────────────────────────────
# 메인 실행
# ──────────────────────────────────────────────

def run(dry_run=False):
    if not NOTION_API_KEY or not CLAUDE_API_KEY:
        log.error("API 키가 설정되지 않았습니다. .env 파일을 확인하세요.")
        return

    log.info("=" * 55)
    log.info("글들정리 → 글들정리2 마이그레이션")
    log.info(f"모드: {'미리보기 (dry-run)' if dry_run else '실행'}")
    log.info("=" * 55)

    # 1단계: DB에서 모든 페이지 수집
    log.info("1단계: 기존 DB 페이지 수집...")
    raw_pages = fetch_all_db_pages(SOURCE_DB_ID)
    pages = [extract_page_info(p) for p in raw_pages]
    log.info(f"총 {len(pages)}개 페이지 수집")

    # 2단계: 각 페이지 본문 읽기 + 짧은 메모 vs 기존 페이지 구분
    log.info("2단계: 페이지 본문 읽기 (시간 소요)...")
    short_memos = []
    original_pages = []

    for i, page in enumerate(pages):
        if i % 50 == 0 and i > 0:
            log.info(f"  {i}/{len(pages)} 읽는 중...")

        content = fetch_page_content(page["id"])
        page["content"] = content
        page["content_preview"] = content[:300]

        if is_short_memo(content):
            # "───\n원본 번호: X" 부분 제거하고 실제 메모만 추출
            clean = re.split(r"───\s*\n?원본 번호:", content)[0].strip()
            page["clean_content"] = clean
            short_memos.append(page)
        else:
            original_pages.append(page)

    log.info(f"  짧은 메모: {len(short_memos)}개 | 기존 페이지: {len(original_pages)}개")

    # 3단계: 카테고리 재분류
    log.info("3단계: 새 카테고리로 재분류...")

    # 확실한 매핑 먼저 적용
    needs_ai = []
    category_assigned = {}  # page_id → new_category

    all_items = short_memos + original_pages
    for item in all_items:
        new_cat, need = classify_with_fallback(item, item["content_preview"])
        if not need:
            category_assigned[item["id"]] = new_cat
        else:
            needs_ai.append(item)

    log.info(f"  자동 매핑: {len(category_assigned)}개 | AI 분류 필요: {len(needs_ai)}개")

    # AI 분류
    if needs_ai:
        client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
        for i in range(0, len(needs_ai), BATCH_SIZE):
            batch = needs_ai[i:i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total = math.ceil(len(needs_ai) / BATCH_SIZE)
            log.info(f"  AI 배치 {batch_num}/{total} 분류 중...")

            results = classify_batch(batch, client)
            for r in results:
                pid = r.get("id", "")
                new_cat = r.get("new_category", "각종 정보")
                if new_cat not in NEW_CATEGORIES:
                    new_cat = "각종 정보"
                category_assigned[pid] = new_cat

            if i + BATCH_SIZE < len(needs_ai):
                time.sleep(1)

    # 분류 안 된 잔여 처리
    for item in all_items:
        if item["id"] not in category_assigned:
            category_assigned[item["id"]] = "각종 정보"

    # 4단계: 결과 요약
    cat_counts = defaultdict(int)
    for cat in category_assigned.values():
        cat_counts[cat] += 1

    short_by_cat = defaultdict(list)
    for memo in short_memos:
        cat = category_assigned[memo["id"]]
        short_by_cat[cat].append(memo)

    original_by_cat = defaultdict(list)
    for page in original_pages:
        cat = category_assigned[page["id"]]
        original_by_cat[cat].append(page)

    print("\n" + "=" * 60)
    print("📊 재분류 결과")
    print("=" * 60)
    for cat in NEW_CATEGORIES:
        s = len(short_by_cat.get(cat, []))
        o = len(original_by_cat.get(cat, []))
        total = s + o
        if total == 0:
            continue
        bundles = math.ceil(s / BUNDLE_MAX) if s > 0 else 0
        bar = "█" * min(total, 30)
        detail = f"(메모 {s}개→{bundles}묶음, 기존 {o}개)" if s > 0 else f"(기존 {o}개)"
        print(f"  {cat:18s} │ {total:3d}개 {bar} {detail}")

    # 생성될 페이지 수 계산
    total_bundles = sum(math.ceil(len(v) / BUNDLE_MAX) for v in short_by_cat.values())
    total_originals = len(original_pages)
    print(f"\n  📦 생성될 페이지: 묶음 {total_bundles}개 + 기존 {total_originals}개 = {total_bundles + total_originals}개")
    print("=" * 60)

    if dry_run:
        # 묶음 미리보기
        print("\n📋 묶음 페이지 미리보기:")
        print("-" * 60)
        for cat in NEW_CATEGORIES:
            memos = short_by_cat.get(cat, [])
            if not memos:
                continue
            num_bundles = math.ceil(len(memos) / BUNDLE_MAX)
            for b in range(num_bundles):
                chunk = memos[b * BUNDLE_MAX: (b + 1) * BUNDLE_MAX]
                part = f" ({b + 1}/{num_bundles})" if num_bundles > 1 else ""
                print(f"  📄 {cat} ({TODAY}){part} — {len(chunk)}개 메모")
                for m in chunk[:3]:
                    print(f"      · {m['title'][:40]}")
                if len(chunk) > 3:
                    print(f"      · ... 외 {len(chunk) - 3}개")
        print("-" * 60)
        print("\n🔍 Dry-run 모드: 미리보기만 완료.")
        print("   실행: python3 migrate_to_db2.py")
        return

    # 5단계: 글들정리2에 저장
    log.info("5단계: 글들정리2 DB에 저장...")
    saved = 0
    errors = 0

    # 짧은 메모 묶어서 저장
    for cat in NEW_CATEGORIES:
        memos = short_by_cat.get(cat, [])
        if not memos:
            continue

        num_bundles = math.ceil(len(memos) / BUNDLE_MAX)
        for b in range(num_bundles):
            chunk = memos[b * BUNDLE_MAX: (b + 1) * BUNDLE_MAX]

            try:
                create_bundled_page(cat, chunk, b + 1, num_bundles)
                saved += 1
                log.info(f"  묶음 저장: {cat} ({b+1}/{num_bundles}, {len(chunk)}개 메모)")
            except Exception as e:
                log.error(f"  묶음 저장 실패 [{cat}]: {e}")
                errors += 1

    # 기존 페이지 개별 저장
    for i, page in enumerate(original_pages):
        new_cat = category_assigned[page["id"]]
        try:
            create_original_page(page, new_cat, page["content"])
            saved += 1
            if (saved) % 10 == 0:
                log.info(f"  진행: {saved}개 저장됨...")
        except Exception as e:
            log.error(f"  저장 실패 [{page['title'][:30]}]: {e}")
            errors += 1

    print("\n" + "=" * 60)
    print(f"✅ 마이그레이션 완료!")
    print(f"   저장: {saved}개 │ 에러: {errors}개")
    print(f"   Notion에서 '글들정리2' DB를 확인하세요.")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="글들정리 → 글들정리2 마이그레이션")
    parser.add_argument("--dry-run", action="store_true", help="미리보기만")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
