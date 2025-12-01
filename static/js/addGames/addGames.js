import { createElement } from "../utils/createElements.js";
import { checkDuplication, clearMainWrap, clearWrap } from "../utils/checkDuplication.js";
import { createLogo_2line } from "../utils/createLogo.js";
import { navigate } from "../index.js";

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

    /**********************
     * Title Bar
     **********************/
    const upper = createElement("div", "addGamesUpper");
    scrollArea.appendChild(upper);

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
}
