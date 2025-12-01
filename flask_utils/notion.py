import json, requests, os
from typing import Optional, Dict

NOTION_API_KEY = os.getenv("NOTION_API_KEY")
DATABASE_ID    = os.getenv("NOTION_DB_ID")
NOTION_VERSION = "2022-06-28"  # 안정적인 버전 고정
NOTION_BASE = "https://api.notion.com/v1"

NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

def _get_plain_text(prop_obj):
    """
    Notion property에서 사람(plain_text)만 뽑아주는 안전한 헬퍼.
    - title, rich_text, select 모두 대응
    """
    if not isinstance(prop_obj, dict):
        return ""

    if "title" in prop_obj:
        arr = prop_obj.get("title") or []
        return "".join([x.get("plain_text", "") for x in arr])

    if "rich_text" in prop_obj:
        arr = prop_obj.get("rich_text") or []
        return "".join([x.get("plain_text", "") for x in arr])

    if "select" in prop_obj and prop_obj["select"]:
        return prop_obj["select"].get("name", "")

    # 필요 시 다른 타입(multiselect, number 등)도 확장 가능
    return ""

def query_user_by_credentials(user_id: str, user_pw: str):
    """
    Notion Databases Query API에 필터를 걸어 ID/PW가 일치하는 사용자만 조회.
    컬럼명은 스크린샷 기준: user_name(title), ID(rich_text), PW(rich_text), user_role(select)
    """
    url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"

    payload = {
        "filter": {
            "and": [
                { "property": "ID", "rich_text":  { "equals": user_id } },
                { "property": "PW", "rich_text":  { "equals": user_pw } }
            ]
        }
    }

    print("\n[Notion] 요청 페이로드:")
    print(json.dumps(payload, ensure_ascii=False, indent=2))

    res = requests.post(url, headers=NOTION_HEADERS, json=payload)
    print(f"[Notion] HTTP {res.status_code}")

    try:
        data = res.json()
    except Exception as e:
        print("[Notion] JSON 디코드 실패:", e)
        return None, {"error": "invalid_json"}

    # 원본 일부 로깅(너무 길면 앞부분만)
    print("[Notion] 응답 본문:")
    pretty = json.dumps(data, ensure_ascii=False)
    print(pretty + ("..." if len(pretty) == 600 else ""))

    results = data.get("results", [])
    print(f"[Notion] 결과 개수: {len(results)}")

    if not results:
        return None, data

    # 첫 번째 매칭 row만 사용
    page = results[0]
    props = page.get("properties", {})

    user_name = _get_plain_text(props.get("user_name", {}))   # title
    notion_id = _get_plain_text(props.get("ID", {}))          # rich_text
    notion_pw = _get_plain_text(props.get("PW", {}))          # rich_text
    user_role = _get_plain_text(props.get("user_role", {}))   # select

    parsed = {
        "page_id": page.get("id"),
        "user_name": user_name,
        "ID": notion_id,
        "PW": notion_pw,
        "user_role": user_role,
    }

    print("[Notion] 파싱된 사용자 정보:")
    print(json.dumps(parsed, ensure_ascii=False, indent=2))

    return parsed, data

# =========================
# Notion 헬퍼 함수
# =========================
def notion_query_database(db_id: str, query: Optional[Dict] = None):
    """
    Notion Database Query API 호출.
    query 인자를 생략하면 기본 쿼리로 호출.
    반환: (json(dict) | None, error(dict) | None)
    """
    if not NOTION_API_KEY:
        return None, {"error": "NOTION_API_KEY is missing"}
    if not db_id:
        return None, {"error": "database_id is missing"}

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }
    url = f"{NOTION_BASE}/databases/{db_id}/query"
    try:
        resp = requests.post(url, headers=headers, json=query or {})
        if resp.status_code != 200:
            # Notion 에러 원문을 그대로 내려줄 수 있도록 detail에 포함
            return None, {"status": resp.status_code, "detail": resp.text}
        return resp.json(), None
    except Exception as e:
        return None, {"error": str(e)}

def notion_update_page(page_id: str, payload: dict):
    """Notion Page Update API"""
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }
    url = f"{NOTION_BASE}/pages/{page_id}"
    resp = requests.patch(url, headers=headers, json=payload)
    return resp

def get_db_properties(db_id):
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION
    }
    url = f"{NOTION_BASE}/databases/{db_id}"
    res = requests.get(url, headers=headers)
    return res.json()
