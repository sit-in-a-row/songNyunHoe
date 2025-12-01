// ✅ index.js — SPA Router (auth + history + 초기 로드 완성 버전)
import { initLogin } from "./login/login.js";
import { createMain } from "./main/main.js";
import { createNotification } from "./notification/notification.js";
import { createAnon } from "./anon/anon.js"
import { createAddGames } from "./addGames/addGames.js";


// ================================
// 🚀 라우터 함수
// ================================
export async function router(route, push = true) {
  console.log(`[router] route = ${route}`);

  // ✅ 인증 검사 (로그인 여부 확인)
  const authed = sessionStorage.getItem("auth");
  if (authed !== "true") {
    console.warn("[router] 인증되지 않은 접근 → /login.html로 이동");
    location.replace("/login.html");
    return;
  }

  // ✅ 주소 표시 (/main, /notification 등)
  if (push) {
    history.pushState({ route }, "", `/${route}`);
  }

  // ✅ 메인 컨테이너 초기화
  const mainContainer = document.getElementById("mainContainer");
  if (mainContainer) mainContainer.innerHTML = "";

  // ✅ route에 따라 해당 화면 렌더링
  switch (route) {
    case "login":
      await initLogin();
      console.log("[router] initLogin 실행");
      break;

    case "main":
      await createMain();
      console.log("[router] createMain 실행");
      break;

    case "notification":
      await createNotification();
      console.log("[router] createNotification 실행");
      break;
    
    case "anon":
      await createAnon();
      console.log("[router] createAnon 실행");
      break;

    case "addGames":
      await createAddGames();
      console.log("[router] createAddGames 실행");
      break;
      
    // 새로운 페이지 추가 시 ↓ 이 부분만 확장하면 됨
    // case "profile":
    //   await createProfile();
    //   console.log("[router] createProfile 실행");
    //   break;

    default:
      console.warn(`[router] 알 수 없는 경로: ${route}`);
      await createMain(); // fallback
  }
}

// ================================
// 🔍 현재 URL에서 route 추출
// ================================
function getCurrentRoute() {
  const path = window.location.pathname.replace("/", "");
  return path === "" ? "main" : path;
}

// ================================
// 🧭 popstate 이벤트 (뒤로가기/앞으로가기)
// ================================
window.addEventListener("popstate", (event) => {
  const route = event.state?.route || getCurrentRoute();
  console.log(`[router] popstate: ${route}`);
  router(route, false); // pushState는 이미 반영됨
});

// ================================
// 🚪 초기 로드 시 자동 라우팅
// ================================

window.addEventListener("DOMContentLoaded", () => {
  const authed = sessionStorage.getItem("auth");
  const route = getCurrentRoute();

  // ✅ 로그인 여부 확인
  if (authed !== "true") {
    console.warn("[index.js] 로그인 정보 없음 → login.html로 리다이렉트");
    initLogin();
    return;
  }

  console.log(`[index.js] 초기 경로 감지: ${route}`);
  router(route, false);
});


// ================================
// 🧭 네비게이션 유틸 함수 (선택사항)
// ================================
export function navigate(route) {
  router(route);
}




