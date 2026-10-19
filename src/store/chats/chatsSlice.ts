import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Chat, ChatStatus, Message } from "../../types";
import type { RootState } from "../index";
import { sortChats } from "./chatUtils";
import { resetDetails } from "../auth/authSlice";

export interface ChatsState {
    chats: Chat[];
    activeId: number | null;
}

export const initialChatState: ChatsState = { chats: [], activeId: null };

const chatsSlice = createSlice({
    name: "chats",
    initialState: initialChatState,
    reducers: {
        setChats: (state, action: PayloadAction<Chat[]>) => {
            const chats = sortChats(action.payload);
            if (!chats.some(c => c.id === state.activeId)) state.activeId = chats[0]?.id ?? null;
            state.chats = chats;
        },
        setActive: (state, action: PayloadAction<number>) => {
            state.activeId = action.payload;
        },
        addChat: (state, action: PayloadAction<Chat>) => {
            if (state.chats.some(c => c.id === action.payload.id)) return;
            state.chats = sortChats([ ...state.chats, action.payload ]);
            state.activeId ??= action.payload.id;
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            const message = action.payload;
            const chat = state.chats.find(c => c.id === message.chatId);
            if (!chat || chat.messages.some(m => m.id === message.id)) return;
            chat.messages.push(message);
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

export const { setChats, setActive, addChat, addMessage, updateStatus } = chatsSlice.actions;

export const selectChats = (state: RootState) => state.chats.chats;
export const selectActiveId = (state: RootState) => state.chats.activeId;
export const selectActiveChat = (state: RootState): Chat | null => state.chats.chats.find(c => c.id === state.chats.activeId) ?? null;

export default chatsSlice.reducer;
