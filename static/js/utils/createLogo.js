import { createElement } from './createElements.js'
import { navigate } from '../index.js';

export function createLogo_4line() {
    var mainEl = createElement("div", 'logoDiv', 'logoDiv');

    var line1 = createElement("div", 'logoLine', 'logoLine1');
    line1.innerText = "2025";
    mainEl.appendChild(line1);

    var line2 = createElement("div", 'logoLine', 'logoLine2');
    line2.innerText = "KULSOM";
    mainEl.appendChild(line2);

    var line3 = createElement("div", 'logoLine', 'logoLine3');
    line3.innerText = "연말도파민";
    mainEl.appendChild(line3);

    var line4 = createElement("div", 'logoLine', 'logoLine4');
    line4.innerText = "파티";
    mainEl.appendChild(line4);

    return mainEl
}

export function createLogo_2line() {
    var mainEl = createElement("div", 'logoDiv', 'logoDiv');

    var row1 = createElement("div", 'logoRow1', 'logoRow1');
    var line1 = createElement("div", 'logoLine', 'logoLine1');
    line1.innerText = "2025";
    row1.appendChild(line1);

    var line2 = createElement("div", 'logoLine', 'logoLine2');
    line2.innerText = "KULSOM";
    row1.appendChild(line2);
    mainEl.appendChild(row1);

    var row2 = createElement("div", 'logoRow2', 'logoRow2');
    var line3 = createElement("div", 'logoLine', 'logoLine3');
    line3.innerText = "연말도파민";
    row2.appendChild(line3);

    var line4 = createElement("div", 'logoLine', 'logoLine4');
    line4.innerText = "파티";
    row2.appendChild(line4);
    mainEl.appendChild(row2);

    // mainEl.style.marginTop = '80px';
    // mainEl.style.marginLeft = '20px';

    mainEl.addEventListener('click', ()=>{
        navigate('main')
    })

    return mainEl
}