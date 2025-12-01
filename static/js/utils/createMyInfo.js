import { createElement } from "./createElements.js";

export function createMyInfo() {
    var myInfo = createElement('div', 'myInfo', 'myInfo');
    myInfo.innerText = "내 정보";

    return myInfo
}