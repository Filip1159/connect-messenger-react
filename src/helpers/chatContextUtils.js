import MessageTimestamp from "./MessageTimestamp";

export const getRecipient = (chat, authDetails) => {
    if (!chat || !authDetails) return;
    return chat.users[chat.users[0].id !== authDetails.id ? 0 : 1];
}

export const getLastMessage = (chat) => {
    if (!chat) return;
    return chat.messages[chat.messages.length - 1];
}

export const formatMessageBrief = (message, recipient) => {
    if (!message || !recipient) return;
    const BRIEF_LENGTH = 35;
    const sender = message.userId === recipient.id ? recipient.name : "You";
    const cutContent = message.content.substring(0, BRIEF_LENGTH);
    const optionalEllipsis = message.content.length > BRIEF_LENGTH ? "..." : "";
    return `${sender}: ${cutContent}${optionalEllipsis}`;
}

export const createChatItemModifier = (chatNumber, activeNumber) => {
    let modifier = "";
    switch (chatNumber) {
        case activeNumber - 1:    modifier = " chatItem--beforeActive"; break;
        case activeNumber:        modifier = " chatItem--active"; break;
        case activeNumber + 1:    modifier = " chatItem--afterActive"; break;
        default:
    }
    return modifier;
}

export const createSingleMessageModifier = (messageIndex, chat, authDetails) => {
    const message = chat.messages[messageIndex];
    const senderModifier = createSenderModifier(message.userId, authDetails.id);
    const stickyModifier = createStickyModifier(messageIndex, chat);
    return `${senderModifier} ${stickyModifier}`;
}

const createSenderModifier = (messageUserId, loggedUserId) => {
    return ` messages__singleMessage--${messageUserId === loggedUserId ? "myMsg" : "receivedMsg"}`;
}

const createStickyModifier = (messageIndex, chat) => {
    let modifier = "";
    if (shouldStickToTop(messageIndex, chat))
        modifier += " messages__singleMessage--topSticky";
    if (shouldStickToBottom(messageIndex, chat))
        modifier += " messages__singleMessage--bottomSticky";
    return modifier;
}

const shouldStickToTop = (messageIndex, chat) => {
    if (isFirstMessageInChat(messageIndex)) return false;
    const thisMessage = chat.messages[messageIndex];
    const previousMessage = chat.messages[messageIndex - 1];
    const timestamp = new MessageTimestamp(messageIndex, chat);
    return previousMessage.userId === thisMessage.userId && timestamp.isPreviousLessThan5MinutesBeforeThis();
}

const shouldStickToBottom = (messageIndex, chat) => {
    if (isLastMessageInChat(messageIndex, chat)) return false;
    const thisMessage = chat.messages[messageIndex];
    const nextMessage = chat.messages[messageIndex + 1];
    const timestamp = new MessageTimestamp(messageIndex, chat);
    return nextMessage.userId === thisMessage.userId && timestamp.isNextLessThan5MinutesAfterThis();
}

const isFirstMessageInChat = messageIndex => messageIndex === 0;

const isLastMessageInChat = (messageIndex, chat) => messageIndex === chat.messages.length - 1;