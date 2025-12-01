import { createElement } from "./createElements.js";

export function createButton_normal(buttonTxt, id) {
    var button = createElement('button', 'button_normal', id);
    button.innerText = buttonTxt;

    return button
}