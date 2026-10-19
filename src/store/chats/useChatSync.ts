import { useEffect } from "react";
import { useStore } from "react-redux";
import { useAppDispatch, useAppSelector } from "../hooks";
import type { RootState } from "../index";
import { selectAuthDetails } from "../auth/authSlice";
import { selectReloadCount } from "../ui/uiSlice";
import { socket } from "../../api/socket";
import * as chatsApi from "../../api/rest/chats";
import * as usersApi from "../../api/rest/users";
import { createChatSync } from "./chatSync";

/* runs the chat sync while somebody is signed in; it restarts for another user or after "try again" */
const useChatSync = () => {
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();
    // only the identity matters: a profile change (name, avatar) must not restart the whole sync
    const myId = useAppSelector(selectAuthDetails)?.id;
    const reloadCount = useAppSelector(selectReloadCount);

    useEffect(() => {
        if (myId === undefined) return;
        return createChatSync({ dispatch, getState: store.getState, myId, api: { ...chatsApi, ...usersApi }, socket }).start();
    // reloadCount: "try again" starts it afresh
    }, [ myId, reloadCount, dispatch, store ]);
}

export default useChatSync;
