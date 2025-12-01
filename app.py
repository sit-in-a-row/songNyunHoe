import os
import json
import requests
from typing import Optional, Dict

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

from flask_utils import *

load_dotenv()

# ✅ static 설정을 명시
app = Flask(__name__, static_folder="static", static_url_path="/static")

# =========================
# Notion 설정 (환경변수)
# =========================
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
NOTION_NOTIFICATION_DB = os.getenv("NOTION_NOTIFICATION_DB")
NOTION_ANON_DB = os.getenv("NOTION_ANON_DB")
NOTION_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"  # 안정적인 버전 고정

def _simplify_page(page: dict) -> dict:
    """
    notificationDB 스키마에 맞춰 title / writer / date를 추출.
    - title: title 프로퍼티의 plain_text
    - writer: people / multi_select / rich_text / select 등 대응
    - date: date.start (ISO 형태 문자열)
    """
    props = page.get("properties", {})

    # --- title ---
    title = ""
    t_prop = props.get("title")
    if isinstance(t_prop, dict) and isinstance(t_prop.get("title"), list):
        title = "".join([r.get("plain_text", "") for r in t_prop["title"]])

    # --- writer ---
    writer = ""
    w_prop = props.get("writer")
    if isinstance(w_prop, dict):
        ptype = w_prop.get("type")
        if ptype == "people":
            writer = ", ".join([p.get("name", "") for p in w_prop.get("people", [])])
        elif ptype == "multi_select":
            writer = ", ".join([p.get("name", "") for p in w_prop.get("multi_select", [])])
        elif ptype == "rich_text":
            writer = "".join([r.get("plain_text", "") for r in w_prop.get("rich_text", [])])
        elif ptype == "select":
            sel = w_prop.get("select")
            if sel:
                writer = sel.get("name", "")

    # --- date ---
    date = ""
    d_prop = props.get("date")
    if isinstance(d_prop, dict) and isinstance(d_prop.get("date"), dict):
        date = d_prop["date"].get("start") or ""

    return {
        "id": page.get("id"),
        "title": title,
        "writer": writer,
        "date": date,
        "created_time": page.get("created_time"),
        "last_edited_time": page.get("last_edited_time"),
        "archived": page.get("archived", False),
        "properties": props,  # 필요 시 원본 프로퍼티 확인 가능
    }


# =========================
# 기본 라우트
# =========================
@app.route("/")
def home():
    print("\n[ROUTE] '/' → login.html 렌더")
    print(f"  request.path={request.path}, method={request.method}")
    return render_template("login.html")


@app.route("/login.html")
def login_html():
    print("\n[ROUTE] '/login.html' 렌더")
    print(f"  request.path={request.path}, method={request.method}")
    return render_template("login.html")


@app.route("/login", methods=["POST"])
def login():
    print("\n[ROUTE] '/login' POST 요청")
    payload = request.get_json(force=True)
    print("  payload:", payload)

    user_id = (payload.get("id") or "").strip()
    user_pw = (payload.get("pw") or "").strip()
    print(f"  입력 ID={user_id}, PW={user_pw}")

    if not user_id or not user_pw:
        print("  → 실패: ID/PW 빈값")
        return jsonify({"success": False, "reason": "ID/PW required"})

    parsed, raw = query_user_by_credentials(user_id, user_pw)
    print("  query_user_by_credentials 결과:", parsed)

    if parsed and parsed["ID"] == user_id and parsed["PW"] == user_pw:
        print("  → 로그인 성공, main 페이지로 이동")
        return jsonify({
            "success": True,
            "user_name": parsed["user_name"],
            "user_role": parsed["user_role"],
            "page_id":  parsed["page_id"]
        })

    print("  → 로그인 실패 (401)")
    return jsonify({"success": False, "reason": "mismatch"}), 401


@app.route("/main")
def main_page():
    print("\n[ROUTE] '/main' 요청 → index.html 렌더")
    print(f"  request.path={request.path}, method={request.method}")
    return render_template("index.html")


@app.route("/health")
def health():
    print("\n[ROUTE] '/health' OK")
    return jsonify(ok=True)

# ==========================
# 노션 라우트 관련
# ==========================

@app.route("/getNotificationDB", methods=["POST"])
def get_notification_db():
    """
    Notion Notification DB를 조회하여 반환.
    - Body에 Notion Query(JSON)를 그대로 전달하면 필터/정렬/페이징을 지원.
      예: {"page_size": 10,
           "sorts":[{"timestamp":"last_edited_time","direction":"descending"}]}
    - Body가 없으면 기본 쿼리로 전체 조회(페이징은 Notion 기본값).
    """
    if not NOTION_NOTIFICATION_DB:
        return jsonify(success=False, reason="NOTION_NOTIFICATION_DB is not set"), 500

    client_query = request.get_json(silent=True) or {}
    data, err = notion_query_database(NOTION_NOTIFICATION_DB, client_query)

    if err:
        # Notion 에러를 그대로 detail에 전달
        return jsonify(success=False, reason="notion_query_failed", detail=err), 502

    results = data.get("results", [])
    simplified = [_simplify_page(p) for p in results]

    return jsonify(
        success=True,
        has_more=data.get("has_more", False),
        next_cursor=data.get("next_cursor"),
        items=simplified
    ), 200

@app.route("/getAnonDB", methods=["POST"])
def get_anon_db():
    """
    Notion Anon DB를 조회하여 반환.
    - Body에 Notion Query(JSON)를 그대로 전달하면 필터/정렬/페이징을 지원.
      예: {"page_size": 10,
           "sorts":[{"timestamp":"last_edited_time","direction":"descending"}]}
    - Body가 없으면 기본 쿼리로 전체 조회(페이징은 Notion 기본값).
    """
    if not NOTION_ANON_DB:
        return jsonify(success=False, reason="NOTION_ANON_DB is not set"), 500

    client_query = request.get_json(silent=True) or {}
    data, err = notion_query_database(NOTION_ANON_DB, client_query)

    if err:
        # Notion 에러를 그대로 detail에 전달
        return jsonify(success=False, reason="notion_query_failed", detail=err), 502

    results = data.get("results", [])
    simplified = [_simplify_page(p) for p in results]

    return jsonify(
        success=True,
        has_more=data.get("has_more", False),
        next_cursor=data.get("next_cursor"),
        items=simplified
    ), 200

@app.route("/getNotificationPage/<page_id>", methods=["GET"])
def get_notification_page(page_id):
    """
    ✅ Notion Notification Page 전체 구조 조회
    - 메타데이터 + 본문 블록 + 하위 댓글용 DB 내용까지 포함
    """
    if not NOTION_API_KEY:
        return jsonify(success=False, reason="NOTION_API_KEY not set"), 500

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }

    # 1️⃣ 기본 페이지 정보
    page_url = f"{NOTION_BASE}/pages/{page_id}"
    page_resp = requests.get(page_url, headers=headers)
    if page_resp.status_code != 200:
        return jsonify(success=False, detail=page_resp.text), page_resp.status_code

    page_data = page_resp.json()
    simplified_page = _simplify_page(page_data)

    # 2️⃣ 1차 블록(children)
    blocks_url = f"{NOTION_BASE}/blocks/{page_id}/children?page_size=100"
    blocks_resp = requests.get(blocks_url, headers=headers)
    if blocks_resp.status_code != 200:
        return jsonify(success=False, detail=blocks_resp.text), blocks_resp.status_code

    blocks_data = blocks_resp.json().get("results", [])

    # --- 텍스트 추출 함수 ---
    def extract_text(block):
        block_type = block.get("type")
        block_content = block.get(block_type, {})
        texts = block_content.get("rich_text", [])
        return "".join([t.get("plain_text", "") for t in texts])

    # 3️⃣ 댓글 DB 탐색
    comment_dbs = []
    for b in blocks_data:
        if b.get("type") == "child_database":
            db_id = b.get("id")
            db_name = b.get("child_database", {}).get("title", "")
            print(f"[댓글 DB 감지] {db_name} ({db_id})")

            db_query_url = f"{NOTION_BASE}/databases/{db_id}/query"
            db_resp = requests.post(db_query_url, headers=headers, json={})
            if db_resp.status_code == 200:
                db_results = db_resp.json().get("results", [])
                db_simplified = [_simplify_page(p) for p in db_results]
                comment_dbs.append({
                    "db_id": db_id,
                    "db_name": db_name,
                    "items": db_simplified
                })
            else:
                print(f"[댓글 DB 오류] {db_resp.text}")

    # 4️⃣ 본문 블록 단순화
    simplified_blocks = [
        {"id": b["id"], "type": b["type"], "text": extract_text(b)}
        for b in blocks_data
    ]

    return jsonify(
        success=True,
        page=simplified_page,
        blocks=simplified_blocks,
        comment_dbs=comment_dbs,
    ), 200

@app.route("/getAnonPage/<page_id>", methods=["GET"])
def get_anon_page(page_id):
    """
    ✅ Notion Anon Page 전체 구조 조회
    - 메타데이터 + 본문 블록 + 하위 댓글용 DB 내용까지 포함
    """
    if not NOTION_API_KEY:
        return jsonify(success=False, reason="NOTION_API_KEY not set"), 500

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }

    # 1️⃣ 기본 페이지 정보
    page_url = f"{NOTION_BASE}/pages/{page_id}"
    page_resp = requests.get(page_url, headers=headers)
    if page_resp.status_code != 200:
        return jsonify(success=False, detail=page_resp.text), page_resp.status_code

    page_data = page_resp.json()
    simplified_page = _simplify_page(page_data)

    # 2️⃣ 1차 블록(children)
    blocks_url = f"{NOTION_BASE}/blocks/{page_id}/children?page_size=100"
    blocks_resp = requests.get(blocks_url, headers=headers)
    if blocks_resp.status_code != 200:
        return jsonify(success=False, detail=blocks_resp.text), blocks_resp.status_code

    blocks_data = blocks_resp.json().get("results", [])

    # --- 텍스트 추출 함수 ---
    def extract_text(block):
        block_type = block.get("type")
        block_content = block.get(block_type, {})
        texts = block_content.get("rich_text", [])
        return "".join([t.get("plain_text", "") for t in texts])

    # 3️⃣ 댓글 DB 탐색
    comment_dbs = []
    for b in blocks_data:
        if b.get("type") == "child_database":
            db_id = b.get("id")
            db_name = b.get("child_database", {}).get("title", "")
            print(f"[댓글 DB 감지] {db_name} ({db_id})")

            db_query_url = f"{NOTION_BASE}/databases/{db_id}/query"
            db_resp = requests.post(db_query_url, headers=headers, json={})
            if db_resp.status_code == 200:
                db_results = db_resp.json().get("results", [])
                db_simplified = [_simplify_page(p) for p in db_results]
                comment_dbs.append({
                    "db_id": db_id,
                    "db_name": db_name,
                    "items": db_simplified
                })
            else:
                print(f"[댓글 DB 오류] {db_resp.text}")

    # 4️⃣ 본문 블록 단순화
    simplified_blocks = [
        {"id": b["id"], "type": b["type"], "text": extract_text(b)}
        for b in blocks_data
    ]

    return jsonify(
        success=True,
        page=simplified_page,
        blocks=simplified_blocks,
        comment_dbs=comment_dbs,
    ), 200

@app.route("/togglePostLike", methods=["POST"])
def toggle_post_like():
    payload = request.get_json(force=True)
    db_id = payload.get("comment_db_id")
    row_id = payload.get("content_like_row_id")
    user = payload.get("user_name")

    if not (db_id and row_id and user):
        return jsonify(success=False, reason="missing fields"), 400

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }

    # 먼저 해당 row 가져오기
    page_url = f"{NOTION_BASE}/pages/{row_id}"
    page_resp = requests.get(page_url, headers=headers)
    if page_resp.status_code != 200:
        return jsonify(success=False, detail=page_resp.text), 500

    page_data = page_resp.json()
    like_list = page_data["properties"]["like"]["multi_select"]

    # toggle
    names = [x["name"] for x in like_list]
    if user in names:
        # 제거
        new_list = [x for x in like_list if x["name"] != user]
    else:
        # 추가
        new_list = like_list + [{"name": user}]

    # 업데이트
    update_payload = {
        "properties": {
            "like": {
                "multi_select": new_list
            }
        }
    }
    update_resp = notion_update_page(row_id, update_payload)

    if update_resp.status_code != 200:
        return jsonify(success=False, detail=update_resp.text), 500

    return jsonify(success=True, likes=new_list), 200

@app.route("/toggleCommentLike", methods=["POST"])
def toggle_comment_like():
    payload = request.get_json(force=True)
    row_id = payload.get("comment_row_id")
    user = payload.get("user_name")

    if not (row_id and user):
        return jsonify(success=False, reason="missing fields"), 400

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }

    # row 조회
    page_url = f"{NOTION_BASE}/pages/{row_id}"
    page_resp = requests.get(page_url, headers=headers)
    if page_resp.status_code != 200:
        return jsonify(success=False, detail=page_resp.text), 500

    page_data = page_resp.json()
    like_list = page_data["properties"]["like"]["multi_select"]
    names = [x["name"] for x in like_list]

    # toggle
    if user in names:
        new_list = [x for x in like_list if x["name"] != user]
    else:
        new_list = like_list + [{"name": user}]

    update_payload = {
        "properties": {
            "like": {
                "multi_select": new_list
            }
        }
    }

    update_resp = notion_update_page(row_id, update_payload)
    if update_resp.status_code != 200:
        return jsonify(success=False, detail=update_resp.text), 500

    return jsonify(success=True, likes=new_list), 200

@app.route("/deleteComment", methods=["POST"])
def delete_comment():
    payload = request.get_json(force=True)
    row_id = payload.get("comment_row_id")

    if not row_id:
        return jsonify(success=False, reason="missing comment_row_id"), 400

    update_payload = {
        "archived": True
    }

    resp = notion_update_page(row_id, update_payload)

    if resp.status_code != 200:
        return jsonify(success=False, detail=resp.text), 500

    return jsonify(success=True), 200

@app.route("/addComment", methods=["POST"])
def add_comment():
    payload = request.get_json(force=True)
    db_id = payload.get("comment_db_id")
    writer = payload.get("writer")
    content = payload.get("content")

    if not (db_id and writer and content):
        return jsonify(success=False, reason="missing fields"), 400

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }

    create_payload = {
        "parent": {"database_id": db_id},
        "properties": {
            "subWriter": {
                "title": [{"text": {"content": writer}}]
            },
            "text": {
                "rich_text": [{"text": {"content": content}}]
            },
            "like": {
                "multi_select": []  # 초기 좋아요는 없음
            }
        }
    }

    url = f"{NOTION_BASE}/pages"
    resp = requests.post(url, headers=headers, json=create_payload)

    if resp.status_code != 200:
        return jsonify(success=False, detail=resp.text), 500

    return jsonify(success=True, created=resp.json()), 200

@app.route("/deleteNotification/<page_id>", methods=["POST"])
def delete_notification(page_id):
    try:
        url = f"{NOTION_BASE}/pages/{page_id}"
        headers = {
            "Authorization": f"Bearer {NOTION_API_KEY}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json"
        }

        # Notion은 "삭제"가 아닌 archiving 방식 사용
        payload = {"archived": True}

        res = requests.patch(url, headers=headers, data=json.dumps(payload))
        if res.status_code == 200:
            return jsonify({"success": True})

        return jsonify({
            "success": False,
            "reason": "notion_error",
            "detail": res.json()
        }), 400

    except Exception as e:
        return jsonify({"success": False, "reason": str(e)}), 500

@app.route("/createNotification", methods=["POST"])
def create_notification():
    try:
        data = request.json
        title = data.get("title")
        body = data.get("body")
        writer = data.get("writer")

        if not title or not writer:
            return jsonify({"success": False, "reason": "missing fields"}), 400

        # 오늘 날짜
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")

        headers = {
            "Authorization": f"Bearer {NOTION_API_KEY}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json"
        }

        # ------------------------------------------------------------
        # 1) 공지 페이지 생성
        # ------------------------------------------------------------
        create_page_payload = {
            "parent": {"database_id": NOTION_NOTIFICATION_DB},
            "properties": {
                "title": { "title": [{"text": {"content": title}}] },
                "writer": {
                    "select": {"name": writer}
                },
                "date": { "date": {"start": today} }
            }
        }

        page_res = requests.post(
            f"{NOTION_BASE}/pages",
            headers=headers,
            json=create_page_payload
        )
        page_json = page_res.json()

        if page_res.status_code != 200:
            return jsonify({"success": False, "detail": page_json}), 400

        page_id = page_json["id"]

        # ------------------------------------------------------------
        # 2) (페이지 아래) 댓글 DB 생성
        # ------------------------------------------------------------
        create_db_payload = {
            "parent": {"page_id": page_id},
            "title": [{"type": "text", "text": {"content": "commentSubDB"}}],
            "properties": {
                "subWriter": {"title": {}},
                "text": {"rich_text": {}},
                "like": {"multi_select": {}}
            }
        }

        db_res = requests.post(
            f"{NOTION_BASE}/databases",
            headers=headers,
            json=create_db_payload
        )
        db_json = db_res.json()

        if db_res.status_code != 200:
            return jsonify({"success": False, "detail": db_json}), 400

        # 댓글 DB 아이디
        comment_db_id = db_json["id"]

        # ------------------------------------------------------------
        # 3) 공지 본문 paragraph block 추가
        # ------------------------------------------------------------
        block_payload = {
            "children": [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {"type": "text", "text": {"content": body}}
                        ]
                    }
                }
            ]
        }

        block_res = requests.patch(
            f"{NOTION_BASE}/blocks/{page_id}/children",
            headers=headers,
            json=block_payload
        )
        block_json = block_res.json()

        if block_res.status_code != 200:
            return jsonify({"success": False, "detail": block_json}), 400

        # ------------------------------------------------------------
        # 완료
        # ------------------------------------------------------------
        return jsonify({"success": True, "page_id": page_id, "comment_db_id": comment_db_id}), 200

    except Exception as e:
        return jsonify({"success": False, "reason": str(e)}), 500

@app.route("/deleteAnon/<page_id>", methods=["POST"])
def delete_anon(page_id):
    try:
        url = f"{NOTION_BASE}/pages/{page_id}"
        headers = {
            "Authorization": f"Bearer {NOTION_API_KEY}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json"
        }

        # Notion은 "삭제"가 아닌 archiving 방식 사용
        payload = {"archived": True}

        res = requests.patch(url, headers=headers, data=json.dumps(payload))
        if res.status_code == 200:
            return jsonify({"success": True})

        return jsonify({
            "success": False,
            "reason": "notion_error",
            "detail": res.json()
        }), 400

    except Exception as e:
        return jsonify({"success": False, "reason": str(e)}), 500

@app.route("/createAnon", methods=["POST"])
def create_anon():
    try:
        data = request.json
        title = data.get("title")
        body = data.get("body")
        writer = data.get("writer")

        if not title or not writer:
            return jsonify({"success": False, "reason": "missing fields"}), 400

        # 오늘 날짜
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")

        headers = {
            "Authorization": f"Bearer {NOTION_API_KEY}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json"
        }

        # ------------------------------------------------------------
        # 1) 공지 페이지 생성
        # ------------------------------------------------------------
        create_page_payload = {
            "parent": {"database_id": NOTION_ANON_DB},
            "properties": {
                "title": { "title": [{"text": {"content": title}}] },
                "writer": {
                    "select": {"name": writer}
                },
                "date": { "date": {"start": today} }
            }
        }

        page_res = requests.post(
            f"{NOTION_BASE}/pages",
            headers=headers,
            json=create_page_payload
        )
        page_json = page_res.json()

        if page_res.status_code != 200:
            return jsonify({"success": False, "detail": page_json}), 400

        page_id = page_json["id"]

        # ------------------------------------------------------------
        # 2) (페이지 아래) 댓글 DB 생성
        # ------------------------------------------------------------
        create_db_payload = {
            "parent": {"page_id": page_id},
            "title": [{"type": "text", "text": {"content": "commentSubDB"}}],
            "properties": {
                "subWriter": {"title": {}},
                "text": {"rich_text": {}},
                "like": {"multi_select": {}}
            }
        }

        db_res = requests.post(
            f"{NOTION_BASE}/databases",
            headers=headers,
            json=create_db_payload
        )
        db_json = db_res.json()

        if db_res.status_code != 200:
            return jsonify({"success": False, "detail": db_json}), 400

        # 댓글 DB 아이디
        comment_db_id = db_json["id"]

        # ------------------------------------------------------------
        # 3) 공지 본문 paragraph block 추가
        # ------------------------------------------------------------
        block_payload = {
            "children": [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {"type": "text", "text": {"content": body}}
                        ]
                    }
                }
            ]
        }

        block_res = requests.patch(
            f"{NOTION_BASE}/blocks/{page_id}/children",
            headers=headers,
            json=block_payload
        )
        block_json = block_res.json()

        if block_res.status_code != 200:
            return jsonify({"success": False, "detail": block_json}), 400

        # ------------------------------------------------------------
        # 완료
        # ------------------------------------------------------------
        return jsonify({"success": True, "page_id": page_id, "comment_db_id": comment_db_id}), 200

    except Exception as e:
        return jsonify({"success": False, "reason": str(e)}), 500



# =========================
# Catch All (SPA Routing)
# =========================
@app.route("/<path:subpath>")
def catch_all(subpath):
    print("\n[ROUTE] catch_all 실행됨")
    print(f"  요청 subpath='{subpath}', request.path={request.path}")

    # 로그인 페이지는 SPA 제외
    if subpath == "login":
        print("  → login 직접 렌더 (SPA 제외 대상)")
        return render_template("login.html")

    # 정적 파일은 그대로 서빙
    if subpath.startswith("static/"):
        print("  → static 파일 서빙:", subpath)
        return app.send_static_file(subpath[len("static/"):])

    # 그 외는 모두 index.html 로 SPA 라우팅
    print("  → SPA 라우팅: index.html 렌더")
    return render_template("index.html")

# =========================
# 앱 구동
# =========================
if __name__ == "__main__":
    app.run(debug=True)