export function resizeMainWrap(div_id) {
    const mainWrap = document.getElementById(div_id);
    const height = window.innerHeight;
    const width = (height * 9) / 16;

    mainWrap.style.height = height + "px";
    mainWrap.style.width = width + "px";
}