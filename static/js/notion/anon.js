// /static/js/api/anon.js

/**
 * Notion anonDB를 조회하는 내부 호출 함수
 * @param {Object} query Notion /databases/query 형식 그대로 전달 (page_size, sorts, filter, start_cursor 등)
 * @returns {Promise<{success:boolean, has_more:boolean, next_cursor:string|null, items:Array}>}
 */
async function _fetchAnonDB(query = {}) {
    const res = await fetch("/getAnonDB", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
  
    const data = await res.json().catch(() => ({}));
  
    if (!res.ok || !data.success) {
      const reason = data?.reason || `HTTP ${res.status}`;
      const detail = data?.detail ? ` | ${JSON.stringify(data.detail)}` : "";
      throw new Error(`[getAnonDB] 요청 실패: ${reason}${detail}`);
    }
    return data;
  }
  
  /**
   * 공지 데이터를 가져와 dict로 정리해서 반환
   *  - 기본: 첫 페이지만 가져옴
   *  - 옵션: all: true 이면 페이지네이션을 따라 전체 조회
   *
   * 반환 형태:
   * {
   *   items: [ {id, title, writer, date, ...}, ...],
   *   byId: { [id]: item, ... },
   *   byDate: { [YYYY-MM-DD]: [item, ...], ... }   // date가 있을 때만 구성
   * }
  //  *
  //  * @param {Object} options
  //  * @param {boolean} [options.all=false]   전체 페치 여부 (true면 모든 페이지를 이어서 수집)
  //  * @param {number}  [options.page_size=20]
  //  * @param {Array}   [options.sorts]       Notion sorts 형식
  //  * @param {Object}  [options.filter]      Notion filter 형식
  //  */
  // export async function getAnonDict(options = {}) {
  //   const {
  //     all = false,
  //     page_size = 20,
  //     sorts,
  //     filter,
  //   } = options;
  
  //   let items = [];
  //   let nextCursor = undefined;
  
  //   do {
  //     const payload = {
  //       page_size,
  //       ...(sorts ? { sorts } : {}),
  //       ...(filter ? { filter } : {}),
  //       ...(nextCursor ? { start_cursor: nextCursor } : {}),
  //     };
  
  //     const data = await _fetchAnonDB(payload);
  //     items = items.concat(data.items || []);
  //     nextCursor = all && data.has_more ? data.next_cursor : undefined;
  //   } while (all && nextCursor);
  
  //   // 정규화: byId, byDate dict 구성
  //   const byId = Object.fromEntries(items.map((it) => [it.id, it]));
  
  //   const byDate = {};
  //   for (const it of items) {
  //     const d = it.date || ""; // ISO 문자열(예: "2025-11-04")
  //     if (!d) continue;
  //     if (!byDate[d]) byDate[d] = [];
  //     byDate[d].push(it);
  //   }
  
  //   return { items, byId, byDate };
  // }
  
  /* ---------------------------
     사용 예시
  
  import { getAnonDict } from "/static/js/api/Anon.js";
  
  (async () => {
    // 1) 최신 수정 순으로 10개만
    const { items, byId, byDate } = await getAnonDict({
      page_size: 10,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    });
    console.log(items, byId, byDate);
  
    // 2) 전체 가져오기
    const allData = await getAnonDict({ all: true, page_size: 50 });
    console.log(allData);
  })();
  
  --------------------------- */
  

// /static/js/api/anon.js

// /**
//  * Notion anonDB 조회하는 내부 호출 함수
//  * @param {Object} query Notion /databases/query 형식 그대로 전달 (page_size, sorts, filter, start_cursor 등)
//  * @returns {Promise<{success:boolean, has_more:boolean, next_cursor:string|null, items:Array}>}
//  */
// async function _fetchAnonDB(query = {}) {
//   const res = await fetch("/getAnonDB", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(query),
//   });

//   const data = await res.json().catch(() => ({}));

//   if (!res.ok || !data.success) {
//     const reason = data?.reason || `HTTP ${res.status}`;
//     const detail = data?.detail ? ` | ${JSON.stringify(data.detail)}` : "";
//     throw new Error(`[getAnonDB] 요청 실패: ${reason}${detail}`);
//   }
//   return data;
// }

/**
 * 공지 데이터를 가져와 dict로 정리해서 반환
 *  - 기본: 첫 페이지만 가져옴
 *  - 옵션: all: true 이면 페이지네이션을 따라 전체 조회
 *
 * 반환 형태:
 * {
 *   items: [ {id, title, writer, date, ...}, ...],
 *   byId: { [id]: item, ... },
 *   byDate: { [YYYY-MM-DD]: [item, ...], ... }   // date가 있을 때만 구성
 * }
 *
 * @param {Object} options
 * @param {boolean} [options.all=false]   전체 페치 여부 (true면 모든 페이지를 이어서 수집)
 * @param {number}  [options.page_size=20]
 * @param {Array}   [options.sorts]       Notion sorts 형식
 * @param {Object}  [options.filter]      Notion filter 형식
 */
export async function getAnonDict(options = {}) {
  const {
    all = false,
    page_size = 20,
    sorts,
    filter,
  } = options;

  let items = [];
  let nextCursor = undefined;

  do {
    const payload = {
      page_size,
      ...(sorts ? { sorts } : {}),
      ...(filter ? { filter } : {}),
      ...(nextCursor ? { start_cursor: nextCursor } : {}),
    };

    const data = await _fetchAnonDB(payload);
    items = items.concat(data.items || []);
    nextCursor = all && data.has_more ? data.next_cursor : undefined;
  } while (all && nextCursor);

  // 정규화: byId, byDate dict 구성
  const byId = Object.fromEntries(items.map((it) => [it.id, it]));

  const byDate = {};
  for (const it of items) {
    const d = it.date || ""; // ISO 문자열(예: "2025-11-04")
    if (!d) continue;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(it);
  }

  return { items, byId, byDate };
}

// 특정 공지 조회 함수
export async function getAnonPage(pageId) {
try {
  const res = await fetch(`/getAnonPage/${pageId}`);
  console.log(res);
  const data = await res.json();

  if (!data.success) {
    console.error("[getAnonPage] 실패:", data);
    return null;
  }

  console.log("[getAnonPage] 성공:", data);
  return data; 
} catch (err) {
  console.error("서버 통신 오류:", err);
  return null;
}
}

/**
* 게시글 좋아요 토글
* @param {string} commentDbId 댓글 DB의 ID
* @param {string} likeRowId contentLikeCount row의 ID
* @param {string} userName 현재 로그인한 사용자 이름
*/
export async function togglePostLike({ commentDbId, likeRowId, userName }) {
const body = {
  comment_db_id: commentDbId,
  content_like_row_id: likeRowId,
  user_name: userName
};

const res = await fetch("/togglePostLike", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const data = await res.json().catch(() => ({}));

if (!res.ok || data.success !== true) {
  console.error("[togglePostLike] 실패", data);
  throw new Error("게시글 좋아요 토글 실패");
}

return data.likes; // multi_select 배열 반환
}

/**
* 댓글 좋아요 토글
* @param {string} commentRowId 해당 댓글 row의 ID
* @param {string} userName 사용자명
*/
export async function toggleCommentLike({ commentRowId, userName }) {
const body = {
  comment_row_id: commentRowId,
  user_name: userName
};

const res = await fetch("/toggleCommentLike", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

const data = await res.json().catch(() => ({}));

if (!res.ok || data.success !== true) {
  console.error("[toggleCommentLike] 실패", data);
  throw new Error("댓글 좋아요 토글 실패");
}

return data.likes; // 반환: multi_select 배열
}

/**
* 댓글 삭제
* @param {string} commentRowId 삭제할 댓글의 ID
*/
export async function deleteComment({ commentRowId }) {
const body = { comment_row_id: commentRowId };

const res = await fetch("/deleteComment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

const data = await res.json().catch(() => ({}));

if (!res.ok || data.success !== true) {
  console.error("[deleteComment] 실패", data);
  throw new Error("댓글 삭제 실패");
}

return true;
}

/**
* 댓글 추가
* @param {string} commentDbId 댓글 DB의 ID
* @param {string} writer 작성자 이름
* @param {string} content 댓글 내용
*/
export async function addComment({ commentDbId, writer, content }) {
const body = {
  comment_db_id: commentDbId,
  writer,
  content
};

const res = await fetch("/addComment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

const data = await res.json().catch(() => ({}));

if (!res.ok || data.success !== true) {
  console.error("[addComment] 실패", data);
  throw new Error("댓글 등록 실패");
}

return data.created; // 새로 생성된 페이지 데이터 반환
}

// =============================
// 공지글 삭제 요청
// =============================
export async function deleteAnon(pageId) {
try {
    const res = await fetch(`/deleteAnon/${pageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    return data.success;
} catch (err) {
    console.error("[deleteAnon Error]", err);
    return false;
}
}

export async function createAnonPost({ title, body, writer }) {
try {
    const res = await fetch("/createAnon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, writer }),
    });

    const data = await res.json();
    return data;
} catch (err) {
    console.error("[createAnonPost Error]", err);
    return { success: false };
}
}
