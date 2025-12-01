// ✅ 이미 로그인 캐시가 있으면 바로 /main 으로
export function autoRedirectIfCached() {
  const authed = sessionStorage.getItem("auth"); // 브라우저 종료 시까지 유지
  if (authed === "true") {
    location.replace("/main");
  }
}

export function loginEventListener(btn, id_value, pw_value) {
  btn.addEventListener("click", async () => {
    const id = id_value.value.trim();
    const pw = pw_value.value.trim();
    if (!id || !pw) return alert("ID와 PW를 모두 입력하세요.");
  
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ id, pw })
      });
      const data = await res.json();
  
      if (res.ok && data.success) {
        // ✅ 요구 1: localStorage에 사용자 이름 & 노션 page_id 저장
        localStorage.setItem("user_name", data.user_name || "");
        localStorage.setItem("page_id",  data.page_id  || "");
        // ✅ 요구 2: 브라우저 닫을 때까지 유지되는 로그인 캐시
        sessionStorage.setItem("auth", "true");
  
        // ✅ 요구 3: /main으로 이동
        alert(`로그인 성공 🎉\n이름: ${data.user_name}\n권한: ${data.user_role}`);
        location.replace("/main");
      } else {
        alert("로그인 실패 ❌");
      }
    } catch (e) {
      console.error(e);
      alert("서버 오류가 발생했습니다.");
    }
  });
}