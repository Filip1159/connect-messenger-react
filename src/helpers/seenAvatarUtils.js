import {AVATAR_HEIGHT} from "../components/MessagesPanel/SeenAvatar";

const fixBetween = (min, value, max) => Math.min(max, Math.max(min, value));

const getAvatarsBorders = () => {
    const containerBottom = document.querySelector(".messages__container")?.getBoundingClientRect().bottom;
    const containerTop = document.querySelector(".messages__container")?.getBoundingClientRect().top;
    const maxPositionOfAvatarBottom = containerBottom + AVATAR_HEIGHT;
    const minPositionOfAvatarBottom = containerTop;
    return [minPositionOfAvatarBottom, maxPositionOfAvatarBottom];
}

export const fixBottom = bottom => {
    const [minPositionOfAvatarBottom, maxPositionOfAvatarBottom] = getAvatarsBorders();
    return fixBetween(minPositionOfAvatarBottom, bottom, maxPositionOfAvatarBottom);
}

export const calculateOpacity = bottom => {
    const [minPositionOfAvatarBottom, maxPositionOfAvatarBottom] = getAvatarsBorders();

    const fullOpacityBottomBorder = maxPositionOfAvatarBottom - AVATAR_HEIGHT;
    const fullOpacityTopBorder = minPositionOfAvatarBottom + AVATAR_HEIGHT;

    const isAvatarAboveFullOpacityTopBorder = bottom < fullOpacityTopBorder;
    const isAvatarUnderFullOpacityBottomBorder = bottom > fullOpacityBottomBorder

    let deviation = 0;
    if (isAvatarAboveFullOpacityTopBorder) {
        deviation = fullOpacityTopBorder - bottom;
    } else if (isAvatarUnderFullOpacityBottomBorder) {
        deviation = bottom - fullOpacityBottomBorder;
    }
    const opacity = 1 - (deviation / 20);
    return Math.max(0, opacity);
}