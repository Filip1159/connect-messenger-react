import type { AppDispatch, RootState } from "../index";
import type { Chat, Message } from "../../types";
import { chatTitle, isGroup } from "./chatUtils";
import { announce, focusConversation } from "../ui/uiSlice";
import { setActive } from "./chatsSlice";
import { notificationsGranted, playBeep, showNotification } from "../../notifications";
import strings from "../../strings";

const PREVIEW_LENGTH = 100;

const preview = (message: Message): string => {
    if (message.type === "FILE") return strings.chats.photo;
    return message.content.length > PREVIEW_LENGTH ? `${message.content.substring(0, PREVIEW_LENGTH)}...` : message.content;
};

/*
 * A new message of somebody else arrived in `chat`: screen readers are told, and when the setting is on (and the chat
 * isn't muted) a notification and a beep tell the user who isn't looking at that chat.
 */
export const handleIncoming = (dispatch: AppDispatch, state: RootState, chat: Chat, message: Message, myId: number) => {
    if (message.userId === myId || message.deleted || chat.muted) return;
    const sender = chat.users.find(u => u.id === message.userId)?.name ?? strings.group.formerMember;
    const where = isGroup(chat) ? ` ${strings.a11y.inChat} ${chatTitle(chat, myId)}` : "";
    dispatch(announce(`${strings.a11y.newMessageFrom} ${sender}${where}: ${preview(message)}`));

    const { notifications, sound } = state.settings;
    const looking = !document.hidden && state.chats.activeId === chat.id;
    if (!notifications || !notificationsGranted() || looking) return;
    showNotification(isGroup(chat) ? `${sender} · ${chatTitle(chat, myId)}` : sender, preview(message), `chat-${chat.id}`, () => {
        dispatch(setActive(chat.id));
        dispatch(focusConversation());
    });
    if (sound) playBeep();
};
