import { createElement } from "./createElements.js";

export function createDayCount(targetDate) {
    function daysUntilTarget() {
        const today = new Date();                  // 현재 날짜 (시각 포함)
        const target = new Date(targetDate);     // 목표 날짜 (연-월-일)
      
        // 날짜 차이를 밀리초 단위로 계산
        const diff = target - today;
      
        // 1일 = 1000ms * 60s * 60min * 24h
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
        return days;
      }

    var bannerEl = createElement('div', 'main_banner font_large', 'main_banner');
    var bannerEl_line1 = createElement('div', 'banner_line', 'banner_line1');
    bannerEl_line1.innerText = '파티까지';
    bannerEl.appendChild(bannerEl_line1);
    
    var bannerEl_line2 = createElement('div', 'banner_line', 'banner_line2')
    bannerEl_line2.innerText = `D-${daysUntilTarget()}`;
    bannerEl.appendChild(bannerEl_line2);


    return bannerEl;
    // // 콘솔 테스트
    // console.log(`2025년 12월 20일까지 ${daysUntilTarget()}일 남았습니다.`);      
}