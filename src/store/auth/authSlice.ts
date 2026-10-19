import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthDetails } from "../../types";
import type { RootState } from "../index";
import { getAuthDetails } from "../../api/session";

/* the session may already be stored (valid token in localStorage) */
const loadStoredDetails = (): AuthDetails | null => {
    try {
        return getAuthDetails();
    } catch {
        return null;
    }
};

export interface AuthState {
    details: AuthDetails | null;
}

const initialState: AuthState = { details: null };

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setDetails: (state, action: PayloadAction<AuthDetails>) => {
            state.details = action.payload;
        },
        /* the profile changed (name, avatar): the token still carries the old values */
        updateDetails: (state, action: PayloadAction<Partial<AuthDetails>>) => {
            if (state.details) state.details = { ...state.details, ...action.payload };
        },
        resetDetails: state => {
            state.details = null;
        }
    }
});

export const { setDetails, updateDetails, resetDetails } = authSlice.actions;

export const selectAuthDetails = (state: RootState) => state.auth.details;

/* a function, so that the stored session is read when the store is created, not on import */
export const getInitialAuthState = (): AuthState => ({ details: loadStoredDetails() });

export default authSlice.reducer;
