import { useEffect } from "react";
import type { IMessage } from "@stomp/stompjs";
import { useAppDispatch, useAppSelector } from "../hooks";
import type { Chat, ChatStatus, Message } from "../../types";
import { selectAuthDetails } from "../auth/authSlice";
import { addChat, addMessage, setChats, updateStatus } from "./chatsSlice";
import ChatAPI from "../ChatAPI";

/* loads chats of the signed in user and keeps them up to date through the websocket */
const useChatSync = () => {
    const dispatch = useAppDispatch();
    const authDetails = useAppSelector(selectAuthDetails);

    useEffect(() => {
        if (!authDetails) return;

        /* the backend payload is trusted to have the declared shape */
        const parse = <T>(incoming: IMessage): T | null => {
            try {
                return JSON.parse(incoming.body) as T;
            } catch (e) {
                console.error("Malformed websocket message:", e);
                return null;
            }
        };

        const onMessage = (incoming: IMessage) => {
            const parsed = parse<Message | ChatStatus>(incoming);
            if (!parsed) return;
            if ("content" in parsed) { // got new message
                dispatch(addMessage(parsed));
            } else {
                dispatch(updateStatus(parsed));
            }
        };

        const onNewChat = (incoming: IMessage) => {
            const parsedChat = parse<Chat>(incoming);
            if (!parsedChat) return;
            dispatch(addChat(parsedChat));
            ChatAPI.subscribeToChat(parsedChat.id, onMessage);
        };

        let cancelled = false;
        ChatAPI.loadAllChats()
            .then(chats => {
                if (cancelled) return;
                dispatch(setChats(chats));
                ChatAPI.initWebsocket(chats, onMessage, onNewChat);
            })
            .catch(e => console.error("Failed to load chats:", e));

        return () => {
            cancelled = true;
            ChatAPI.closeWebsocket();
        };
    }, [ authDetails, dispatch ]);
}

export default useChatSync;
