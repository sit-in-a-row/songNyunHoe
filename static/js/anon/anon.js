/********************************************************************
 *  anon.js (최종 안정 통합 버전)
 *  - anonTitle 클릭 시 location.reload()
 *  - 상세 페이지 로딩 시 #anonWriteTxt 제거
 *  - anonItems 중복 생성 방지 (항상 1개 유지)
 *  - 상세 클릭 중 로딩 중복 방지 (lock)
 ********************************************************************/

import { createElement } from "../utils/createElements.js";
import { checkDuplication, clearMainWrap, clearWrap } from "../utils/checkDuplication.js";
import { createButton_normal } from "../utils/createButton.js";
import { getAnonDict, getAnonPage } from "../notion/anon.js";
import { createLogo_2line } from "../utils/createLogo.js";
import { navigate } from "../index.js";

import {
    togglePostLike,
    toggleCommentLike,
    deleteComment,
    addComment,
    createAnonPost,
    deleteAnon
} from "../notion/anon.js";

const userName = localStorage.getItem("user_name");
let detailLoadingLock = false;   // 상세 페이지 중복 로딩 방지

function safe(obj, path, defaultValue = null) {
    return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj) ?? defaultValue;
}

/********************************************************************
 * ANIMATION HELPERS
 ********************************************************************/
function toggleBg(el, active) {
    if (!el) return;
    el.style.background = active ? "rgba(255,255,255,0.3)" : "transparent";
}

function likeBounce(el) {
    if (!el) return;
    el.style.transform = "scale(1.25)";
    setTimeout(() => {
        el.style.transform = "scale(1)";
    }, 150);
}

function fadeIn(el) {
    el.style.opacity = 0;
    el.style.transform = "translateY(6px)";
    requestAnimationFrame(() => {
        el.style.transition = "all 0.25s ease";
        el.style.opacity = 1;
        el.style.transform = "translateY(0)";
    });
}

function fadeOutAndRemove(el) {
    el.style.transition = "all 0.25s ease";
    el.style.opacity = 0;
    el.style.transform = "translateY(-5px)";
    setTimeout(() => el.remove(), 250);
}

/********************************************************************
 * 공지 전체 화면 생성
 ********************************************************************/
export async function createAnon() {

    detailLoadingLock = false; // 상세 페이지 로딩 중 복제 방지 unlock
    clearMainWrap();
    clearWrap('anonWrap');

    const mainContainer = document.getElementById("mainContainer");

    // 🔥 기존 anonItems 제거 (항상 하나만 유지)
    const old = document.getElementById("anonItems");
    if (old) old.remove();

    const wrap = createElement("div", "anonWrap");
    mainContainer.appendChild(wrap);

    wrap.appendChild(createLogo_2line());

    const items = createElement("div", "anonItems", "anonItems");
    wrap.appendChild(items);

    const scrollArea = createElement("div", "anonScrollArea");
    items.appendChild(scrollArea);

    /**********************
     * Title Bar
     **********************/
    const upper = createElement("div", "anonUpper");
    scrollArea.appendChild(upper);

    const title = createElement("div", "anonTitle");
    title.innerText = "익명게시판";

    // ① Title 클릭 → 강제 새로고침
    title.addEventListener("click", () => navigate('anon'));

    upper.appendChild(title);
    upper.appendChild(createElement("div", "anonBar"));

    /**********************
     * 공지 리스트
     **********************/
    const list = await fetchAnonList(scrollArea);
    scrollArea.appendChild(list);

    /**********************
     * 글쓰기 버튼
     **********************/
    const writeBtn = createButton_normal("글 쓰기", "anonWriteTxt");
    writeBtn.addEventListener("click", () => {
        createWriteUI();
    });
    
    items.appendChild(writeBtn);
}

/********************************************************************
 * 공지 목록 생성
 ********************************************************************/
async function fetchAnonList(scrollArea) {
    const allData = await getAnonDict({
        all: true,
        sorts: [{ timestamp: "last_edited_time", direction: "descending" }]
    });

    const list = createElement("div", "anonList");

    allData.items.forEach((item) => {
        const wrap = createElement("div", "anonListWrap");
        wrap.dataset.id = item.id;

        wrap.appendChild(createElement("div", "anonListRow1")).innerText =
            item.title || "(제목 없음)";

        const row2 = createElement("div", "anonListRow2");
        const col1 = createElement("div", "anonListRow2_col1");
        const col2 = createElement("div", "anonListRow2_col2");
        row2.append(col1, col2);

        // col1.appendChild(createElement("div", "gridIconRow_el")).innerText = item.writer;
        col1.appendChild(createElement("div", "gridIconRow_el")).innerText =
            safe(item, "properties.date.date.start", "");

            if (item.writer === userName) {
                const del = createElement("div", "gridIconRow_el");
                del.innerText = "삭제";
            
                // 삭제 이벤트 추가
                del.addEventListener("click", async (e) => {
                    e.stopPropagation(); // 글 상세로 넘어가는 기본 클릭 막기
            
                    const ok = confirm("정말 삭제하시겠습니까?");
                    if (!ok) return;
            
                    // 클릭한 글 UI 먼저 제거
                    wrap.style.transition = "0.2s";
                    wrap.style.opacity = "0";
                    setTimeout(() => wrap.remove(), 200);
            
                    // 서버에 삭제 요청
                    const success = await deleteAnon(item.id);
            
                    if (!success) {
                        alert("삭제 실패했습니다. 다시 시도해주세요.");
                    }
                });
            
                col2.appendChild(del);
            }
            

        wrap.appendChild(row2);

        // ③ 여러 번 클릭시 중복 로딩 방지 (lock 적용)
        wrap.addEventListener("click", async () => {
            if (detailLoadingLock) return;
            detailLoadingLock = true;

            const page = await getAnonPage(item.id);
            loadAnonDetail(item, page);
        });

        list.appendChild(wrap);
    });

    return list;
}

/********************************************************************
 * 상세 페이지 로드
 ********************************************************************/
function loadAnonDetail(item, res) {

    // ② 상세페이지 들어오면 글쓰기 버튼 삭제
    const writeBtn = document.getElementById("anonWriteTxt");
    if (writeBtn) writeBtn.remove();

    const scrollArea = document.querySelector(".anonScrollArea");
    scrollArea.innerHTML = "";  // 중복 로딩 방지

    /*******************
     * 상단 제목
     *******************/
    const upper = createElement("div", "anonUpper");
    scrollArea.appendChild(upper);

    const backTitle = createElement("div", "anonTitle");
    backTitle.innerHTML = `<img src="/static/img/backButton.svg">&nbsp 뒤로가기`;
    upper.appendChild(backTitle);

    backTitle.addEventListener("click", () => createAnon());

    upper.appendChild(createElement("div", "anonBar"));

    /*******************
     * 본문
     *******************/
    const contentWrap = createElement("div", "anonContentWrap");
    scrollArea.appendChild(contentWrap);

    contentWrap.appendChild(createElement("div", "anonTitleRow")).innerText = item.title;

    const meta = createElement("div", "anonMetaRow");
    // meta.appendChild(createElement("div", "gridIconRow_el")).innerText = item.writer;
    meta.appendChild(createElement("div", "gridIconRow_el")).innerText = item.date;
    contentWrap.appendChild(meta);

    const body = createElement("div", "anonBody");
    contentWrap.appendChild(body);

    (res.blocks || []).forEach((b) => {
        if (b.type === "paragraph") {
            const p = createElement("div", "anonBodyEl");
            p.innerText = b.text;
            body.appendChild(p);
        }
    });

    /*******************
     * 글 좋아요
     *******************/
    const divider = createElement("div", "anonDivider");
    contentWrap.appendChild(divider);

    const cDb = res.comment_dbs[0];
    const likeRow = cDb.items.find(
        (it) => safe(it, "properties.subWriter.title.0.plain_text") === "contentLikeCount"
    );

    let postLikes = safe(likeRow, "properties.like.multi_select", []).map((v) => v.name);

    divider.innerHTML = `
        <div class="dummy"></div>
        <div class="anonDividerRight">
            <div class="gridIconRow_el" id="postLikeBtn">좋아요 ${postLikes.length}</div>
        </div>
    `;

    const postLikeBtn = document.getElementById("postLikeBtn");
    toggleBg(postLikeBtn, postLikes.includes(userName));

    postLikeBtn.addEventListener("click", () => {
        const liked = postLikes.includes(userName);

        if (liked) postLikes = postLikes.filter((u) => u !== userName);
        else postLikes.push(userName);

        postLikeBtn.innerText = `좋아요 ${postLikes.length}`;
        toggleBg(postLikeBtn, !liked);
        likeBounce(postLikeBtn);

        togglePostLike({
            commentDbId: cDb.db_id,
            likeRowId: likeRow.id,
            userName,
        }).catch(console.error);
    });


    /*******************
     * 댓글
     *******************/
    const commentWrap = createElement("div", "anonCommentWrap");
    contentWrap.appendChild(commentWrap);

    const rawComments = cDb.items.filter(
        (it) => safe(it, "properties.subWriter.title.0.plain_text") !== "contentLikeCount"
    );

    let loaded = 0;
    const LOAD_UNIT = 10;

    function loadMore() {
        const chunk = rawComments.slice(loaded, loaded + LOAD_UNIT);
        chunk.forEach((c) => {
            const row = buildCommentRow(c);
            fadeIn(row);
            commentWrap.appendChild(row);
        });
        loaded += chunk.length;
    }

    loadMore();

    scrollArea.addEventListener("scroll", () => {
        if (
            scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 40 &&
            loaded < rawComments.length
        ) {
            loadMore();
        }
    });

    /*******************
     * 댓글 입력창 (항상 하나)
     *******************/
    let inputWrap = document.getElementById("anonCommentInputWrap");
    if (inputWrap) inputWrap.remove();

    inputWrap = createElement("div", "anonCommentInputWrap", "anonCommentInputWrap");
    inputWrap.id = "anonCommentInputWrap";

    const input = createElement("textarea", "anonCommentInput");
    input.placeholder = "댓글을 입력해주세요";

    const send = createElement("div", "anonCommentSendBtn");

    send.addEventListener("click", () => {
        const text = input.value.trim();
        if (!text) return;

        const temp = {
            id: "temp-" + Date.now(),
            properties: {
                subWriter: { title: [{ plain_text: userName }] },
                text: { rich_text: [{ plain_text: text }] },
                like: { multi_select: [] },
            },
            last_edited_time: new Date().toISOString(),
        };

        const row = buildCommentRow(temp);
        fadeIn(row);
        commentWrap.prepend(row);

        addComment({
            commentDbId: cDb.db_id,
            writer: userName,
            content: text,
        }).catch(console.error);

        input.value = "";
    });

    inputWrap.append(input, send);
    document.querySelector(".anonItems").appendChild(inputWrap);
}

/********************************************************************
 * 댓글 Row 생성
 ********************************************************************/
function buildCommentRow(it) {
    const writerName = safe(it, "properties.subWriter.title.0.plain_text", "익명");
    const date = it.last_edited_time?.slice(0, 10) ?? "";
    const content = safe(it, "properties.text.rich_text.0.plain_text", "");
    let likes = safe(it, "properties.like.multi_select", []).map((v) => v.name);

    const row = createElement("div", "anonCommentLineWrap");

    const first = createElement("div", "anonCommentLineFirstRow");
    const left = createElement("div", "anonCommentLineFirstRowLeft");
    const right = createElement("div", "anonCommentLineFirstRowRight");

    // left.appendChild(createElement("div", "anonCommentWriter")).innerText = writerName;
    left.appendChild(createElement("div", "anonCommentDate")).innerText = date;

    const likeBtn = createElement("div", "gridIconRow_el");
    likeBtn.innerText = `좋아요 ${likes.length}`;
    toggleBg(likeBtn, likes.includes(userName));

    likeBtn.addEventListener("click", () => {
        const liked = likes.includes(userName);

        if (liked) likes = likes.filter((n) => n !== userName);
        else likes.push(userName);

        likeBtn.innerText = `좋아요 ${likes.length}`;
        toggleBg(likeBtn, !liked);
        likeBounce(likeBtn);

        if (!it.id.startsWith("temp-")) {
            toggleCommentLike({ commentRowId: it.id, userName }).catch(console.error);
        }
    });

    right.appendChild(likeBtn);

    if (writerName === userName && !it.id.startsWith("temp-")) {
        const delBtn = createElement("div", "gridIconRow_el");
        delBtn.innerText = "삭제";

        delBtn.addEventListener("click", () => {
            fadeOutAndRemove(row);
            deleteComment({ commentRowId: it.id }).catch(console.error);
        });

        right.appendChild(delBtn);
    }

    first.append(left, right);
    row.appendChild(first);

    const body = createElement("div", "anonCommentLineSecondRow");
    body.innerText = content;
    row.appendChild(body);

    return row;
}

/********************************************************************
 * 글쓰기 UI 생성
 ********************************************************************/
function createWriteUI() {

    detailLoadingLock = false; 
    const wrap = document.querySelector(".anonWrap");
    if (!wrap) return;

    // 기존 UI 제거
    const oldItems = document.getElementById("anonItems");
    if (oldItems) oldItems.remove();

    // 신규 items 생성
    const items = createElement("div", "anonItems", "anonItems");
    wrap.appendChild(items);

    const scrollArea = createElement("div", "anonScrollArea");
    items.appendChild(scrollArea);

    /*******************
     * 상단바
     *******************/
    const upper = createElement("div", "anonUpper");
    scrollArea.appendChild(upper);

    const back = createElement("div", "anonTitle");
    back.innerHTML = `<img src="/static/img/backButton.svg">&nbsp 뒤로가기`;
    back.addEventListener("click", () => createAnon());
    upper.append(back);

    upper.appendChild(createElement("div", "anonBar"));

    /*******************
     * 글쓰기 UI
     *******************/
    const writeWrap = createElement("div", "anonWriteWrap");
    scrollArea.appendChild(writeWrap);

    // 제목 입력
    const titleInput = createElement("input", "anonWriteTitle");
    titleInput.placeholder = "제목을 입력해주세요";
    writeWrap.appendChild(titleInput);

    // 본문 입력
    const bodyInput = createElement("textarea", "anonWriteBody");
    bodyInput.placeholder = "본문을 입력해주세요";
    writeWrap.appendChild(bodyInput);

    // 버튼 라인
    const btnLine = createElement("div", "anonWriteBtnLine");
    writeWrap.append(btnLine);

    const submitBtn = createElement("div", "anonWriteSubmitBtn");
    submitBtn.addEventListener("click", async () => {
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
    
        if (!title || !body) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }
    
        const res = await createAnonPost({
            title,
            body,
            writer: userName
        });
    
        if (res.success) {
            alert("등록되었습니다.");
            navigate("anon"); // 목록 다시 로드
        } else {
            alert("등록 실패");
        }
    });
    
    submitBtn.innerText = "등록";
    btnLine.appendChild(submitBtn);

    const cancelBtn = createElement("div", "anonWriteCancelBtn");
    cancelBtn.innerText = "취소";
    cancelBtn.addEventListener("click", () => createAnon());
    btnLine.appendChild(cancelBtn);

    // 임시: 등록 눌렀을 때 동작
    submitBtn.addEventListener("click", () => {
        alert("글 업로드 중... (좀만 기다려봐 아직 테스트 섭이라 느림)");
    });
}
