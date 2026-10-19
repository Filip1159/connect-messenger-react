import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import { resetDetails } from "../auth/authSlice";

export type ConnectionState = "connecting" | "connected" | "reconnecting";
export type LoadState = "loading" | "ready" | "failed";

/* short-lived state of the interface itself */
export interface UiState {
    connection: ConnectionState; // the websocket
    chatsStatus: LoadState; // the first load of the chat list
    reloadCount: number; // "try again" after a failed load
    announcement: string; // read out by screen readers
    focusRequest: number; // counts requests to move the focus to the conversation
}

export const initialUiState: UiState = { connection: "connecting", chatsStatus: "loading", reloadCount: 0, announcement: "", focusRequest: 0 };

const uiSlice = createSlice({
    name: "ui",
    initialState: initialUiState,
    reducers: {
        setConnection: (state, action: PayloadAction<ConnectionState>) => {
            state.connection = action.payload;
        },
        setChatsStatus: (state, action: PayloadAction<LoadState>) => {
            state.chatsStatus = action.payload;
        },
        reloadChats: state => {
            state.reloadCount += 1;
            state.chatsStatus = "loading";
        },
        announce: (state, action: PayloadAction<string>) => {
            state.announcement = action.payload;
        },
        focusConversation: state => {
            state.focusRequest += 1;
        }
    },
    extraReducers: builder => {
        builder.addCase(resetDetails, () => initialUiState);
    }
});

export const { setConnection, setChatsStatus, reloadChats, announce, focusConversation } = uiSlice.actions;

export const selectConnection = (state: RootState) => state.ui.connection;
export const selectChatsStatus = (state: RootState) => state.ui.chatsStatus;
export const selectReloadCount = (state: RootState) => state.ui.reloadCount;
export const selectAnnouncement = (state: RootState) => state.ui.announcement;
export const selectFocusRequest = (state: RootState) => state.ui.focusRequest;

export default uiSlice.reducer;
