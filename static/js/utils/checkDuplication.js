export function checkDuplication(id) {
    if (id) {
        const element = document.getElementById(id);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    } else {
        // 모든 DOM 요소 중 ID에 "_Container"가 포함된 요소를 찾아 제거
        const allElements = document.querySelectorAll('[id*="_Container"]');
        allElements.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
}

export function clearMainWrap() {
    const wrap = document.getElementById('mainContainer');
    if (!wrap) {
        console.log("[checkDuplication.js] clearMainWrap 함수에서 #mainContainer를 찾지 못하였습니다.")
        return;
    }
  
    while (wrap.firstChild) {
      wrap.removeChild(wrap.firstChild);
    }
}
  
export function clearWrap(id) {
    const wrap = document.getElementById(id);
    if (!wrap) {
        console.log(`[checkDuplication.js] clearWrap 함수에서 ${id} 요소를 찾지 못하였습니다.`)
        return;
    }
  
    while (wrap.firstChild) {
      wrap.removeChild(wrap.firstChild);
    }
}