import { createElement } from "../utils/createElements.js";
import { checkDuplication, clearMainWrap, clearWrap } from "../utils/checkDuplication.js";
import { createLogo_2line } from "../utils/createLogo.js";
import { navigate } from "../index.js";
import { createButton_normal } from "../utils/createButton.js";

const userName = localStorage.getItem("user_name");
let detailLoadingLock = false;   // 상세 페이지 중복 로딩 방지

export async function createAddGames() {

    detailLoadingLock = false; // 상세 페이지 로딩 중 복제 방지 unlock
    clearMainWrap();
    clearWrap('addGamesWrap');

    const mainContainer = document.getElementById("mainContainer");

    // 🔥 기존 addGamesItems 제거 (항상 하나만 유지)
    const old = document.getElementById("addGamesItems");
    if (old) old.remove();

    const wrap = createElement("div", "addGamesWrap");
    mainContainer.appendChild(wrap);

    wrap.appendChild(createLogo_2line());

    const items = createElement("div", "addGamesItems", "addGamesItems");
    wrap.appendChild(items);

    const scrollArea = createElement("div", "addGamesScrollArea");
    items.appendChild(scrollArea);



    const upper = createUpper();
    scrollArea.appendChild(upper);

    const inputWraps = createInputs();
    scrollArea.appendChild(inputWraps);

    const writeBtn = createButton_normal("확인", "addGamesConfirm");
    writeBtn.addEventListener("click", () => {
        alert("ㅎㅇ")
    });
    inputWraps.appendChild(writeBtn);
}


function createUpper() {
    const upper = createElement("div", "addGamesUpper");
    const title = createElement("div", "addGamesTitle");
    title.innerText = "게임 추가";

    // ① Title 클릭 → 초기화 여부 확인 후 navigate
    title.addEventListener("click", () => {
        const isOK = confirm("초기화 하시겠습니까?");
        if (isOK) {
            navigate("addGames");
        }
    });

    upper.appendChild(title);
    upper.appendChild(createElement("div", "addGamesBar"));

    return upper
}

function createInputs() {
    const inputWrap = createElement("div", 'addGamesInputsWrap', 'addGamesInputsWrap');

    const inputTitle = createElement('textarea', 'addGamesInputTitle', 'addGamesInputTitle');
    inputTitle.placeholder = "게임 제목을 입력해주세요";
    inputWrap.appendChild(inputTitle);

    const inputDesc = createElement('textarea', 'addGamesInputDesc', 'addGamesInputDesc');
    inputDesc.placeholder = "게임 소개를 입력해주세요";
    inputWrap.appendChild(inputDesc);

    const toggleIsSpeedQuiz = createElement('div', 'addGamesIsSpeed', 'addGamesIsSpeed');
    inputWrap.appendChild(toggleIsSpeedQuiz);

    // 요소
    const speedQuiz = createElement('div', 'addGamesIsSpeedEl toggled', 'addGamesIsSpeedSpeed');
    speedQuiz.innerText = '스피드 퀴즈';
    const janghak = createElement('div', 'addGamesIsSpeedEl', 'addGamesIsSpeedJanghak');
    janghak.innerText = '장학퀴즈';

    // 부모에 append
    toggleIsSpeedQuiz.appendChild(speedQuiz);
    toggleIsSpeedQuiz.appendChild(janghak);

    // toggle 함수
    function toggleSpeedType(selectedEl) {
        // 둘 다에서 toggled 제거
        speedQuiz.classList.remove('toggled');
        janghak.classList.remove('toggled');

        // 클릭한 애만 toggled 추가
        selectedEl.classList.add('toggled');
    }

    // 이벤트 등록
    speedQuiz.addEventListener('click', () => toggleSpeedType(speedQuiz));
    janghak.addEventListener('click', () => toggleSpeedType(janghak));

    return inputWrap;
}