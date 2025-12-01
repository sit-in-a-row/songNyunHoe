import { createElement } from "../utils/createElements.js";
import { clearMainWrap } from "../utils/checkDuplication.js";
import { createDayCount } from "../utils/createDayCount.js";
import { createLoginUpper } from "../login/login.js";

import { getNotificationDict } from "/static/js/notion/notification.js";
import { getAnonDict } from "/static/js/notion/anon.js";
import { navigate } from "../index.js";

var sampleGameInfo = {
    '아이엠그라운드': '모르는 사람 없는 국룰게임',
    '쿨썸퀴즈': '쿨썸에 대해 얼마나 알고있나?',
    'TMI퀴즈': '이건 누구의 TMI일까?',
    '몸으로 말해요': '몸개그도 추억이다',
    '신서유기게임': '방송 보면서 골라봤어요..',
    '장학퀴즈': '현진이가 작년부터 주장한거',
    '이구동성': '마음이 얼마나 잘 통할까?',
    '마음맞추기': '회장단의 생각을 맞춰라',
    '영화맞추기': '이 포스터는 무슨 영화?'
}


export async function createMain() {
    clearMainWrap();
    const mainContainer = document.getElementById("mainContainer");

    const mainWrap = createElement('div', 'mainWrap', 'mainWrap');
    mainContainer.appendChild(mainWrap);

    const loginUpper = createLoginUpper();
    mainWrap.appendChild(loginUpper);

    const gridEl = createGrid();
    mainWrap.appendChild(gridEl);
    itemsToGrid('addGames');
    itemsToGrid('checkGames');

    await infoToGrid('notification');
    await infoToGrid('anon');
}

function createGrid() {
    const gridContainer = createElement("div", "gridContainer", "gridContainer");
  
    const items = [
      { id: "notification", label: "공지게시판", imgSrc: false},
      { id: "createSession", label: "세션생성", imgSrc: "static/img/createSessionIcon.svg" },
      { id: "anon", label: "익명게시판", imgSrc: false },
      { id: "checkSession", label: "세션조회", imgSrc: "static/img/checkSessionIcon.svg" },
      { id: "addGames", label: "게임추가", imgSrc: false },
      { id: "checkGames", label: "게임조회", imgSrc: false },
    ];
  
    const frag = document.createDocumentFragment();
    items.forEach(({ id, label, imgSrc }) => frag.appendChild(createGridItem(id, label, imgSrc)));
    gridContainer.appendChild(frag);
  
    return gridContainer;
}
  
function createGridItem(id, label, imgSrc) {
    const root = createElement("div", "gridEl", id);
    const content = createElement("div", "gridEl_content", `${id}_content`);
    const line = createElement("div", "gridEl_line");
    const txt = createElement("div", "gridEl_txt", `${id}_txt`);

    txt.innerText = label;
    if (imgSrc) {
        const img = createElement("img", "gridEl_img", `${id}_img`);
        img.src = imgSrc;
        root.appendChild(img);
    }

    // line 안에 txt를 포함시킴
    line.appendChild(txt);

    // 구성: root → content + line(txt 포함)
    root.append(content, line);

    // 임시!!!!!!!!!!!!! 
    switch (id) {
        case "notification":
            root.addEventListener("click", () => {
                navigate('notification');
            })
            break;

        case "anon":
            root.addEventListener("click", () => {
                navigate('anon');
            })
            break;

        case "addGames":
            root.addEventListener("click", () => {
                navigate('addGames');
            })
            break;

    }

    return root;
}

function parseCommunityDB(DB_items) {
    const final_info = [];
    for (let i = 0; i < DB_items.length; i++) {
        const obj = DB_items[i];
        final_info.push({
            title: obj.title,
            writer: obj.writer,
            date: obj.properties?.date?.date?.start ?? ''
        });
    }
    return final_info;
}

async function fetchNotificationInfo() {
    const cacheKey = "notification_cache";
  
    // ✅ 세션 스토리지에 캐시가 있으면 즉시 반환
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      console.log("[cache] 공지게시판 데이터 from sessionStorage");
      return JSON.parse(cached);
    }
  
    // ✅ 없으면 API 호출
    console.log("[fetch] 공지게시판 데이터 from Notion API");
    const allData = await getNotificationDict({
      page_size: 3,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    });
  
    const parsedData = parseCommunityDB(allData.items);
  
    // ✅ 캐시 저장
    sessionStorage.setItem(cacheKey, JSON.stringify(parsedData));
  
    return parsedData;
}

async function fetchAnonInfo() {
    const cacheKey = "anon_cache";
  
    // ✅ 캐시 있으면 바로 반환
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      console.log("[cache] 익명게시판 데이터 from sessionStorage");
      return JSON.parse(cached);
    }
  
    // ✅ 없으면 fetch
    console.log("[fetch] 익명게시판 데이터 from Notion API");
    const allData = await getAnonDict({
      page_size: 3,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    });
  
    const parsedData = parseCommunityDB(allData.items);
  
    // ✅ 캐시 저장
    sessionStorage.setItem(cacheKey, JSON.stringify(parsedData));
  
    return parsedData;
}

async function infoToGrid(type) {
    const target = document.getElementById(`${type}_content`);
    // target.scrollTop = target.scrollHeight;
    if (!target) {
        console.warn(`[main.js] ${type}_content element not found.`);
        return;
    }

    let data = [];
    switch (type) {
        case 'notification':
            data = await fetchNotificationInfo();
            break;
        case 'anon':
            data = await fetchAnonInfo();
            break;
        default:
            console.log('[main.js] infoToGrid: Unknown type', type);
            return;
    }

    data.forEach((item, i) => {
        const contentRow = createElement('div', 'gridContentRow', `${type}_contentRow_${i}`);

        const titleDiv = createElement('div', 'gridTitle');
        titleDiv.innerText = item.title;
        contentRow.appendChild(titleDiv);

        if (type == 'notification') {
            const divLine = createElement('div', 'gridContentRow_Line');

            const dateDiv = createElement('div', 'gridDate');
            dateDiv.innerText = item.date;
            contentRow.append(divLine, dateDiv);
        }

        target.appendChild(contentRow);
    });
}

function itemsToGrid(type) {
    const target = document.getElementById(`${type}_content`);

    switch (type) {
        case 'addGames':
            var rowNum = 4;
            for (let i=0; i<rowNum; i++) {
                target.appendChild(
                    createIcons(i)
                );
            }

            break;
        case 'checkGames':
            var rowNum = 1;
            for (let i=0; i<rowNum; i++) {
                target.appendChild(
                    createDescLines(i)
                );
            }
            break;
        default:
            console.log('[main.js] infoToGrid: Unknown type', type);
            return;
    }
}

function createIcons(rowIndex = 0) {
    var keyList = Object.keys(sampleGameInfo);
    var row = createElement('div', 'gridIconRow', `gridIconRow_${rowIndex}`);
    row.style.setProperty('--delay', `${rowIndex * 2}s`);

  
    // 아이콘 생성
    for (let i = 0; i < keyList.length; i++) {
      const el = createElement('div', 'gridIconRow_el', `gridIconRow_el_${i}`);
      el.innerText = keyList[i];
      row.appendChild(el);
    }
  
    // ✅ 콘텐츠 두 번 반복 (끊김 없는 루프용)
    row.innerHTML += row.innerHTML;
  
    // ✅ 속도와 시작 offset(지연) 조절
    const baseSpeed = 30; // 초 단위 속도 기준
    const speedVariation = rowIndex * 2; // 각 row마다 약간씩 다르게
    const totalSpeed = baseSpeed + speedVariation;
  
    row.style.setProperty('--speed', `${totalSpeed}s`);
  
    // ✅ 짝수/홀수 row 방향 다르게 (홀수는 오른쪽→왼쪽, 짝수는 반대)
    if (rowIndex % 2 === 0) {
      row.style.animationName = 'scrollLoop';
    } else {
      row.style.animationName = 'scrollLoopReverse';
    }
  
    return row;
}
  
function createDescLines(rowIndex = 0) {
    const row = createElement('div', 'gridDescRow', `gridDescRow_${rowIndex}`);
    row.style.setProperty('--delay', `${rowIndex * 2}s`);

    const keyList = Object.keys(sampleGameInfo);
    keyList.forEach((key, i) => {
        const el = createElement('div', 'gridDescRow_el', `gridDescRow_el_${i}`);
        el.innerHTML = `<strong>${key}</strong>&nbsp&nbsp&nbsp${sampleGameInfo[key]}`;
        row.appendChild(el);
    });

    // ✅ 한 번 복제해서 이어붙이기
    row.innerHTML += row.innerHTML;

    // 일단 DOM에 넣어서 실제 길이를 측정
    document.body.appendChild(row);
    const fullWidth = row.scrollWidth / 2; // 원본 한 세트의 실제 폭(px)
    document.body.removeChild(row);

    // ✅ 실제 이동 거리(px 단위)
    row.style.setProperty('--moveDist', `${fullWidth}px`);

    // ✅ 속도 계산 (길이에 비례해서 자연스럽게)
    const baseSpeed = 0.05; // 1px당 이동에 걸릴 시간(초)
    const totalSpeed = fullWidth * baseSpeed;
    row.style.setProperty('--speed', `${totalSpeed}s`);

    // 방향 반전 (짝수/홀수)
    if (rowIndex % 2 === 0) {
        row.style.animationName = 'scrollLoopPx';
    } else {
        row.style.animationName = 'scrollLoopPxReverse';
    }

    return row;
}
