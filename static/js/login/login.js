import { createButton_normal } from "/static/js/utils/createButton.js";
import { createDayCount } from "/static/js/utils/createDayCount.js";
import { createElement } from "/static/js/utils/createElements.js";
import { createLogo_4line } from "/static/js/utils/createLogo.js";
import { createMyInfo } from "/static/js/utils/createMyInfo.js";
import { loginEventListener } from "/static/js/login/login_func.js";

const targetDate = "2025-12-20";

export function initLogin() {
  const mainContainer = document.getElementById("mainContainer");
  console.log("[login.js] initLogin 실행됨");

  if (!mainContainer) {
    console.error("[login.js] #mainContainer를 찾을 수 없습니다.");
    return;
  }

  if (!mainContainer.hasChildNodes()) {
    const login = createLogin();
    mainContainer.appendChild(login);
    console.log("[login.js] 자식요소 없음 → append 성공");
  } else {
    console.log("[login.js] 자식요소가 이미 있음");
  }
}

function createLogin() {
  const loginContainer = createElement("div", "loginContainer", "loginContainer");
  const loginUpper = createLoginUpper();
  const loginLower = createLoginLower();
  loginContainer.appendChild(loginUpper);
  loginContainer.appendChild(loginLower);
  return loginContainer;
}

export function createLoginUpper() {
  const loginUpper = createElement("div", "loginUpper", "loginUpper");

  const loginUpper_left = createElement("div", "loginUpper_left", "loginUpper_left");
  const logo_4line = createLogo_4line();
  loginUpper_left.appendChild(logo_4line);
  loginUpper.appendChild(loginUpper_left);

  const loginUpper_right = createElement("div", "loginUpper_right", "loginUpper_right");
  const dayCount = createDayCount(targetDate);
  const myInfo = createMyInfo();
  loginUpper_right.appendChild(dayCount);
  loginUpper_right.appendChild(myInfo);
  loginUpper.appendChild(loginUpper_right);

  return loginUpper;
}

function createLoginLower() {
  const loginLower = createElement("div", "loginLower", "loginLower");

  const inputs = createElement("div", "loginInputDiv", "loginInputDiv");
  loginLower.appendChild(inputs);

  const ID_input = createElement("input", "ID_input", "ID_input");
  ID_input.type = "text";
  ID_input.placeholder = "ID를 입력해주세요";
  inputs.appendChild(ID_input);

  const PW_input = createElement("input", "PW_input", "PW_input");
  PW_input.type = "password"; 
  PW_input.placeholder = "PW를 입력해주세요";
  inputs.appendChild(PW_input);

  const btn = createButton_normal("확인", "login_confirm");
  loginLower.appendChild(btn);

  loginEventListener(btn, ID_input, PW_input);

  return loginLower;
}