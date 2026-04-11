"""
글들정리 → 글들정리2 마이그레이션 (v2)
=========================================
- 짧은 메모 (567개): 카테고리별 최대 30개씩 묶어서 1. 2. 3. 포맷으로 생성
- 기존 페이지 (120개): rich_text 구조 전체 복사 (링크, 볼드 등 보존)
- 모든 페이지를 새 15개 카테고리로 재분류

사용법:
  python3 migrate_v2.py --dry-run    (미리보기)
  python3 migrate_v2.py --limit 5    (5개만 테스트)
  python3 migrate_v2.py              (전체 실행)
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

SOURCE_DB_ID = "2eb0da3f-5145-800d-9e93-e06f46faa137"
TARGET_DB_ID = "3a364fd967684654ba77ddf0e9dc439f"

# memo_classifier 실행일 (이 날짜 이후 생성 = 짧은 메모)
CUTOFF_DATE = "2026-04-04T00:00:00.000Z"

TODAY = datetime.now().strftime("%-m/%-d")
BUNDLE_MAX = 30
BATCH_SIZE = 20
API_DELAY = 0.35

NEW_CATEGORIES = [
    "할 일", "회사일", "집안일/장보기", "AI 비즈니스", "AI/기술 학습",
    "영단어 및 IT 용어", "자기관리/건강", "재무/행정", "해외이주/여행",
    "각종 정보", "인문적 노트", "개인 일기", "인간관계", "커리어/학습전략",
]

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
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

NOTION_BASE = "https://api.notion.com/v1"
NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}


def notion_post(endpoint, data):
    time.sleep(API_DELAY)
    r = requests.post(f"{NOTION_BASE}{endpoint}", headers=NOTION_HEADERS, json=data)
    if r.status_code >= 400:
        log.error(f"API 에러: {r.status_code} - {r.text[:300]}")
    r.raise_for_status()
    return r.json()


def notion_get(endpoint, params=None):
    time.sleep(API_DELAY)
    r = requests.get(f"{NOTION_BASE}{endpoint}", headers=NOTION_HEADERS, params=params)
    r.raise_for_status()
    return r.json()


def notion_patch(endpoint, data):
    time.sleep(API_DELAY)
    r = requests.patch(f"{NOTION_BASE}{endpoint}", headers=NOTION_HEADERS, json=data)
    if r.status_code >= 400:
        log.error(f"API 에러: {r.status_code} - {r.text[:200]}")
    r.raise_for_status()
    return r.json()


# ──────────────────────────────────────────────
# 1. DB에서 모든 페이지 수집
# ──────────────────────────────────────────────

def fetch_all_db_pages(db_id):
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
    props = page.get("properties", {})
    title = ""
    title_prop = props.get("이름", {})
    if title_prop.get("type") == "title":
        title = "".join(t.get("plain_text", "") for t in title_prop.get("title", []))

    category = ""
    cat_prop = props.get("카테고리", {})
    if cat_prop.get("type") == "select" and cat_prop.get("select"):
        category = cat_prop["select"].get("name", "")

    return {
        "id": page["id"],
        "title": title.strip(),
        "category": category,
        "created_time": page.get("created_time", ""),
    }


# ──────────────────────────────────────────────
# 2. 블록 읽기 (rich_text 전체 보존)
# ──────────────────────────────────────────────

SUPPORTED_BLOCK_TYPES = {
    "paragraph", "heading_1", "heading_2", "heading_3",
    "bulleted_list_item", "numbered_list_item",
    "to_do", "toggle", "callout", "quote", "divider",
    "bookmark", "code",
}


def fetch_blocks_with_richtext(page_id):
    """페이지의 모든 블록을 rich_text 구조 포함하여 가져온다"""
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
    return blocks


def extract_plain_text(blocks):
    """블록에서 plain text만 추출 (짧은 메모용)"""
    parts = []
    for b in blocks:
        bt = b["type"]
        if bt in SUPPORTED_BLOCK_TYPES and bt != "divider":
            rt = b.get(bt, {}).get("rich_text", [])
            line = "".join(r.get("plain_text", "") for r in rt).strip()
            if line:
                parts.append(line)
    return "\n".join(parts)


def blocks_to_children(blocks):
    """
    원본 블록을 새 페이지 생성용 children 배열로 변환.
    rich_text 구조를 그대로 복사하여 링크/서식 보존.
    """
    children = []
    for b in blocks:
        bt = b["type"]
        if bt not in SUPPORTED_BLOCK_TYPES:
            continue

        if bt == "divider":
            children.append({"object": "block", "type": "divider", "divider": {}})
            continue

        block_data = b.get(bt, {})
        rich_text = block_data.get("rich_text", [])

        # rich_text 정제 (불필요한 필드 제거)
        clean_rt = []
        for rt in rich_text:
            item = {"type": rt.get("type", "text")}
            if rt["type"] == "text":
                text_obj = {"content": rt["text"]["content"]}
                if rt["text"].get("link"):
                    text_obj["link"] = rt["text"]["link"]
                item["text"] = text_obj
            elif rt["type"] == "mention":
                item["mention"] = rt.get("mention", {})
            elif rt["type"] == "equation":
                item["equation"] = rt.get("equation", {})

            # annotations 복사 (볼드, 이탤릭 등)
            if rt.get("annotations"):
                ann = rt["annotations"]
                # 기본값이 아닌 것만 포함
                if any([ann.get("bold"), ann.get("italic"), ann.get("strikethrough"),
                        ann.get("underline"), ann.get("code"),
                        ann.get("color", "default") != "default"]):
                    item["annotations"] = ann

            clean_rt.append(item)

        new_block = {
            "object": "block",
            "type": bt,
            bt: {"rich_text": clean_rt},
        }

        # to_do의 checked 속성
        if bt == "to_do" and "checked" in block_data:
            new_block[bt]["checked"] = block_data["checked"]

        # code의 language 속성
        if bt == "code" and "language" in block_data:
            new_block[bt]["language"] = block_data["language"]

        # bookmark의 url 속성
        if bt == "bookmark":
            new_block = {
                "object": "block",
                "type": "bookmark",
                "bookmark": {"url": block_data.get("url", "")},
            }

        children.append(new_block)

        # Notion API 제한: 100블록
        if len(children) >= 98:
            break

    return children


# ──────────────────────────────────────────────
# 3. Claude API로 재분류
# ──────────────────────────────────────────────

RECLASSIFY_PROMPT = """메모를 15개 카테고리로 분류하세요. 카테고리 목록: {categories}

분류 기준:
- "할 일": 행동 지시. "회사일": 직장/상가. "집안일/장보기": 식재료/생활용품.
- "AI 비즈니스": 사업 전략. "AI/기술 학습": 도구/기술 학습.
- "영단어 및 IT 용어": 용어 정리. "자기관리/건강": 운동/병원.
- "재무/행정": 대출/환전/세금. "해외이주/여행": 해외 관련.
- "각종 정보": 유용한 링크/참고자료. "인문적 노트": 차분한 성찰/사회비판.
- "개인 일기": 감정 토로/분노/외로움. "인간관계": 인물/모임/약속.
- "커리어/학습전략": 자격증/이력서/프리랜서.

JSON 배열만 출력: [{{"id":"ID","new_category":"카테고리명"}}]

분류할 항목:
{items}
"""


def classify_batch(items, client):
    items_text = "\n".join(
        f"[{it['id']}] 제목:{it['title'][:50]}|기존:{it['category']}|내용:{it.get('content_preview','')[:150]}"
        for it in items
    )
    cats = ",".join(NEW_CATEGORIES)
    prompt = RECLASSIFY_PROMPT.format(categories=cats, items=items_text)
    resp = client.messages.create(model="claude-haiku-4-5-20251001", max_tokens=4096,
                                  messages=[{"role": "user", "content": prompt}])
    raw = resp.content[0].text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        log.error(f"JSON 파싱 실패")
        return []


# ──────────────────────────────────────────────
# 4. 글들정리2에 저장
# ──────────────────────────────────────────────

def create_bundled_page(category, memos, bundle_idx, total_bundles):
    """짧은 메모들을 1. 2. 3. 포맷으로 묶어서 생성"""
    title = f"{category} ({TODAY})"
    if total_bundles > 1:
        title += f" - {bundle_idx}"

    # 본문: 각 메모의 실제 내용을 번호와 함께
    children = []
    for i, memo in enumerate(memos, 1):
        content = memo.get("clean_content") or memo.get("content_preview") or memo["title"]
        text = f"{i}. {content.strip()}"
        # 2000자 제한
        children.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": text[:2000]}}]
            },
        })
        if len(children) >= 95:
            break

    page_data = {
        "parent": {"database_id": TARGET_DB_ID},
        "properties": {
            "이름": {"title": [{"text": {"content": title}}]},
            "카테고리": {"select": {"name": category}},
            "원본카테고리": {"select": {"name": "memo_classifier 생성"}},
            "날짜": {"date": {"start": datetime.now(timezone.utc).strftime("%Y-%m-%d")}},
        },
        "children": children,
    }
    return notion_post("/pages", page_data)


def create_original_page_preserved(page_info, new_category, blocks):
    """기존 페이지를 rich_text 구조 보존하여 복사"""
    children = blocks_to_children(blocks)

    page_data = {
        "parent": {"database_id": TARGET_DB_ID},
        "properties": {
            "이름": {"title": [{"text": {"content": page_info["title"][:100] or "무제"}}]},
            "카테고리": {"select": {"name": new_category}},
            "원본카테고리": {"select": {"name": page_info["category"] or "미분류"}},
            "날짜": {"date": {"start": datetime.now(timezone.utc).strftime("%Y-%m-%d")}},
        },
        "children": children if children else [
            {"object": "block", "type": "paragraph",
             "paragraph": {"rich_text": [{"type": "text", "text": {"content": "(빈 페이지)"}}]}}
        ],
    }
    return notion_post("/pages", page_data)


# ──────────────────────────────────────────────
# 메인
# ──────────────────────────────────────────────

def run(dry_run=False, limit=None):
    if not NOTION_API_KEY or not CLAUDE_API_KEY:
        log.error("API 키 설정 필요. .env 파일 확인.")
        return

    log.info("=" * 55)
    log.info(f"글들정리 → 글들정리2 마이그레이션 v2")
    log.info(f"모드: {'dry-run' if dry_run else '실행'}{f' (limit={limit})' if limit else ''}")
    log.info("=" * 55)

    # 1. 페이지 수집
    log.info("1단계: DB 페이지 수집...")
    raw_pages = fetch_all_db_pages(SOURCE_DB_ID)
    pages = [extract_page_info(p) for p in raw_pages]

    # 2. 원본 vs 짧은 메모 구분 (생성일 기준)
    originals = []
    short_memos = []
    for p in pages:
        if p["created_time"] < CUTOFF_DATE:
            originals.append(p)
        else:
            short_memos.append(p)

    log.info(f"  기존 페이지: {len(originals)}개 | 짧은 메모: {len(short_memos)}개")

    if limit:
        originals = originals[:min(limit, len(originals))]
        short_memos = short_memos[:min(limit, len(short_memos))]
        log.info(f"  limit 적용: 기존 {len(originals)}개, 메모 {len(short_memos)}개")

    # 3. 블록 읽기
    log.info("2단계: 페이지 본문 읽기...")

    for i, p in enumerate(originals):
        if i % 20 == 0 and i > 0:
            log.info(f"  기존 페이지 {i}/{len(originals)} 읽는 중...")
        p["blocks"] = fetch_blocks_with_richtext(p["id"])

    for i, p in enumerate(short_memos):
        if i % 100 == 0 and i > 0:
            log.info(f"  짧은 메모 {i}/{len(short_memos)} 읽는 중...")
        blocks = fetch_blocks_with_richtext(p["id"])
        text = extract_plain_text(blocks)
        # "원본 번호:" 이후 제거
        clean = re.split(r"───\s*\n?원본 번호:", text)[0].strip()
        p["clean_content"] = clean
        p["content_preview"] = clean[:300]

    # 4. 카테고리 재분류
    log.info("3단계: 카테고리 재분류...")
    category_assigned = {}
    needs_ai = []

    all_items = originals + short_memos
    for item in all_items:
        old = item["category"]
        if old in CATEGORY_MAP and old != "잡글":
            category_assigned[item["id"]] = CATEGORY_MAP[old]
        else:
            item["content_preview"] = item.get("content_preview") or extract_plain_text(item.get("blocks", []))[:300]
            needs_ai.append(item)

    log.info(f"  자동: {len(category_assigned)}개 | AI 필요: {len(needs_ai)}개")

    if needs_ai:
        client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
        for i in range(0, len(needs_ai), BATCH_SIZE):
            batch = needs_ai[i:i + BATCH_SIZE]
            log.info(f"  AI 배치 {i // BATCH_SIZE + 1}/{math.ceil(len(needs_ai) / BATCH_SIZE)}...")
            results = classify_batch(batch, client)
            for r in results:
                nc = r.get("new_category", "각종 정보")
                if nc not in NEW_CATEGORIES:
                    nc = "각종 정보"
                category_assigned[r["id"]] = nc
            time.sleep(1)

    for item in all_items:
        if item["id"] not in category_assigned:
            category_assigned[item["id"]] = "각종 정보"

    # 분류 결과
    short_by_cat = defaultdict(list)
    for m in short_memos:
        short_by_cat[category_assigned[m["id"]]].append(m)

    orig_by_cat = defaultdict(list)
    for p in originals:
        orig_by_cat[category_assigned[p["id"]]].append(p)

    print("\n" + "=" * 60)
    print("📊 재분류 결과")
    print("=" * 60)
    for cat in NEW_CATEGORIES:
        s = len(short_by_cat.get(cat, []))
        o = len(orig_by_cat.get(cat, []))
        if s + o == 0:
            continue
        bundles = math.ceil(s / BUNDLE_MAX) if s > 0 else 0
        print(f"  {cat:18s} │ {s + o:3d}개 (메모→{bundles}묶음, 기존 {o}개)")

    total_bundles = sum(math.ceil(len(v) / BUNDLE_MAX) for v in short_by_cat.values())
    print(f"\n  📦 생성: 묶음 {total_bundles}개 + 기존 {len(originals)}개 = {total_bundles + len(originals)}개")
    print("=" * 60)

    if dry_run:
        print("\n🔍 Dry-run 완료. 실행: python3 migrate_v2.py")
        return

    # 5. 저장
    log.info("4단계: 글들정리2에 저장...")
    saved = 0
    errors = 0

    # 짧은 메모 묶기
    for cat in NEW_CATEGORIES:
        memos = short_by_cat.get(cat, [])
        if not memos:
            continue
        num_b = math.ceil(len(memos) / BUNDLE_MAX)
        for b in range(num_b):
            chunk = memos[b * BUNDLE_MAX:(b + 1) * BUNDLE_MAX]
            try:
                create_bundled_page(cat, chunk, b + 1, num_b)
                saved += 1
                log.info(f"  묶음: {cat} ({len(chunk)}개)")
            except Exception as e:
                log.error(f"  묶음 실패 [{cat}]: {e}")
                errors += 1

    # 기존 페이지 복사 (rich_text 보존)
    for i, p in enumerate(originals):
        nc = category_assigned[p["id"]]
        try:
            create_original_page_preserved(p, nc, p["blocks"])
            saved += 1
            if saved % 10 == 0:
                log.info(f"  진행: {saved}개...")
        except Exception as e:
            log.error(f"  실패 [{p['title'][:30]}]: {e}")
            errors += 1

    print(f"\n✅ 완료! 저장: {saved}개 │ 에러: {errors}개")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="글들정리 → 글들정리2 v2")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, help="테스트용: 처리할 최대 페이지 수")
    args = parser.parse_args()
    run(dry_run=args.dry_run, limit=args.limit)
