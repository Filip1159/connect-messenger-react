import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Chat, ChatStatus, Message, OutboxItem, Presence, User } from "../../types";
import type { RootState } from "../index";
import { sortChats } from "./chatUtils";
import { resetDetails } from "../auth/authSlice";

export interface ChatsState {
    chats: Chat[];
    activeId: number | null;
    presence: Record<number, Presence>; // userId -> presence
    typing: Record<number, number[]>; // chatId -> users who are writing right now
    outbox: OutboxItem[]; // my messages waiting for the server
    replyTo: number | null; // id of the message I'm answering in the active chat
    listOpen: boolean; // narrow screens show either the chat list or the conversation
    blocked: User[]; // people I blocked
}

export const initialChatState: ChatsState = {
    chats: [], activeId: null, presence: {}, typing: {}, outbox: [], replyTo: null, listOpen: true, blocked: []
};

/* what the server decides about a chat (not the messages, which the client keeps, nor the live unread count) */
const CHAT_DETAILS = [ "users", "status", "group", "name", "adminIds", "archived", "muted" ] as const;

const chatsSlice = createSlice({
    name: "chats",
    initialState: initialChatState,
    reducers: {
        setChats: (state, action: PayloadAction<Chat[]>) => {
            const chats = sortChats(action.payload);
            if (!chats.some(c => c.id === state.activeId)) state.activeId = (chats.find(c => !c.archived) ?? chats[0])?.id ?? null;
            state.chats = chats;
        },
        setActive: (state, action: PayloadAction<number>) => {
            if (state.activeId !== action.payload) state.replyTo = null;
            state.activeId = action.payload;
            state.listOpen = false;
        },
        showChatList: state => {
            state.listOpen = true;
        },
        setReplyTo: (state, action: PayloadAction<number | null>) => {
            state.replyTo = action.payload;
        },
        addChat: (state, action: PayloadAction<Chat>) => {
            if (state.chats.some(c => c.id === action.payload.id)) return;
            state.chats = sortChats([ ...state.chats, action.payload ]);
            state.activeId ??= action.payload.id;
        },
        /* a known chat takes the new details (title, members, admins, my settings), an unknown one is added */
        upsertChat: (state, action: PayloadAction<Chat>) => {
            const fresh = action.payload;
            const chat = state.chats.find(c => c.id === fresh.id);
            if (!chat) {
                state.chats = sortChats([ ...state.chats, fresh ]);
                state.activeId ??= fresh.id;
                return;
            }
            Object.assign(chat, Object.fromEntries(CHAT_DETAILS.map(key => [ key, fresh[key] ])));
        },
        /* I left the chat or was removed from it */
        removeChat: (state, action: PayloadAction<number>) => {
            state.chats = state.chats.filter(c => c.id !== action.payload);
            if (state.activeId === action.payload) {
                state.activeId = (state.chats.find(c => !c.archived) ?? state.chats[0])?.id ?? null;
                state.replyTo = null;
                state.listOpen = true;
            }
        },
        /* a person's profile changed (name, avatar): every chat that shows them takes it */
        updateUser: (state, action: PayloadAction<User>) => {
            state.chats.forEach(chat => {
                const index = chat.users.findIndex(u => u.id === action.payload.id);
                if (index !== -1) chat.users[index] = { ...chat.users[index], ...action.payload };
            });
        },
        setBlocked: (state, action: PayloadAction<User[]>) => {
            state.blocked = action.payload;
        },
        addBlocked: (state, action: PayloadAction<User>) => {
            if (!state.blocked.some(u => u.id === action.payload.id)) state.blocked.push(action.payload);
        },
        removeBlocked: (state, action: PayloadAction<number>) => {
            state.blocked = state.blocked.filter(u => u.id !== action.payload);
        },
        /* `incoming` marks a live message of somebody else: it counts as unread until I see it */
        addMessage: {
            reducer: (state, action: PayloadAction<Message, string, { incoming: boolean }>) => {
                const message = action.payload;
                const chat = state.chats.find(c => c.id === message.chatId);
                if (!chat) return;
                const index = chat.messages.findIndex(m => m.id === message.id);
                if (index !== -1) {
                    // the same message again: an edit or a delete (or a duplicate delivery), never unread
                    const known = chat.messages[index];
                    if (known.content !== message.content || known.editedAt !== message.editedAt || known.deleted !== message.deleted
                        || JSON.stringify(known.reactions ?? []) !== JSON.stringify(message.reactions ?? [])) {
                        chat.messages[index] = message;
                    }
                    return;
                }
                chat.messages.push(message);
                if (action.meta.incoming) chat.unreadCount = (chat.unreadCount ?? 0) + 1;
                state.typing[message.chatId] = (state.typing[message.chatId] ?? []).filter(u => u !== message.userId);
                state.chats = sortChats(state.chats);
            },
            prepare: (message: Message, incoming = false) => ({ payload: message, meta: { incoming } })
        },
        markRead: (state, action: PayloadAction<number>) => {
            const chat = state.chats.find(c => c.id === action.payload);
            if (chat) chat.unreadCount = 0;
        },
        /* fresh metadata (users, statuses, unread counts) of chats that are already known */
        syncChats: (state, action: PayloadAction<Chat[]>) => {
            action.payload.forEach(fresh => {
                const chat = state.chats.find(c => c.id === fresh.id);
                if (!chat) return;
                CHAT_DETAILS.forEach(key => Object.assign(chat, { [key]: fresh[key] }));
                chat.unreadCount = fresh.unreadCount ?? 0;
            });
        },
        setPresence: (state, action: PayloadAction<Presence[]>) => {
            state.presence = Object.fromEntries(action.payload.map(p => [ p.userId, p ]));
        },
        updatePresence: (state, action: PayloadAction<Presence>) => {
            state.presence[action.payload.userId] = action.payload;
        },
        setTyping: (state, action: PayloadAction<{ chatId: number; userId: number; active: boolean }>) => {
            const { chatId, userId, active } = action.payload;
            const others = (state.typing[chatId] ?? []).filter(u => u !== userId);
            state.typing[chatId] = active ? [ ...others, userId ] : others;
        },
        outboxAdd: (state, action: PayloadAction<OutboxItem>) => {
            state.outbox.push(action.payload);
        },
        outboxStatus: (state, action: PayloadAction<{ localId: string; status: OutboxItem["status"] }>) => {
            const item = state.outbox.find(i => i.localId === action.payload.localId);
            if (item) item.status = action.payload.status;
        },
        outboxRemove: (state, action: PayloadAction<string>) => {
            state.outbox = state.outbox.filter(i => i.localId !== action.payload);
        },
        /* older messages, oldest first, put in front of the ones already known */
        prependMessages: (state, action: PayloadAction<{ chatId: number; messages: Message[]; hasMore: boolean }>) => {
            const { chatId, messages, hasMore } = action.payload;
            const chat = state.chats.find(c => c.id === chatId);
            if (!chat) return;
            const known = new Set(chat.messages.map(m => m.id));
            chat.messages = [ ...messages.filter(m => !known.has(m.id)), ...chat.messages ];
            chat.hasMore = hasMore;
            chat.messagesFailed = false;
            state.chats = sortChats(state.chats);
        },
        updateStatus: (state, action: PayloadAction<ChatStatus>) => {
            const newStatus = action.payload;
            const chat = state.chats.find(c => c.id === newStatus.id.chatId);
            if (!chat) return;
            const index = chat.status.findIndex(s => s.id.userId === newStatus.id.userId);
            if (index !== -1) chat.status[index] = newStatus;
        }
    },
    extraReducers: builder => {
        // signing out drops all chats
        builder.addCase(resetDetails, () => initialChatState);
    }
});

export const {
    setChats, setActive, showChatList, setReplyTo, addChat, upsertChat, removeChat, updateUser, setBlocked, addBlocked, removeBlocked, addMessage, prependMessages, updateStatus, markRead, syncChats,
    setPresence, updatePresence, setTyping, outboxAdd, outboxStatus, outboxRemove
} = chatsSlice.actions;

export const selectChats = (state: RootState) => state.chats.chats;
export const selectPresence = (state: RootState) => state.chats.presence;
export const selectTyping = (state: RootState) => state.chats.typing;
export const selectOutbox = (state: RootState) => state.chats.outbox;
/* muted chats don't count */
export const selectTotalUnread = (state: RootState) =>
    state.chats.chats.reduce((sum, c) => sum + (c.muted ? 0 : (c.unreadCount ?? 0)), 0);
export const selectBlocked = (state: RootState) => state.chats.blocked;
/* the message I'm answering, if it is still in the active chat */
export const selectReplyTarget = (state: RootState): Message | null => {
    const chat = state.chats.chats.find(c => c.id === state.chats.activeId);
    return chat?.messages.find(m => m.id === state.chats.replyTo && !m.deleted) ?? null;
};
export const selectListOpen = (state: RootState) => state.chats.listOpen;
export const selectActiveId = (state: RootState) => state.chats.activeId;
export const selectActiveChat = (state: RootState): Chat | null => state.chats.chats.find(c => c.id === state.chats.activeId) ?? null;

export default chatsSlice.reducer;
