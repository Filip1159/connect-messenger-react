import { useEffect } from "react";
import { useStore } from "react-redux";
import type { IMessage } from "@stomp/stompjs";
import { useAppDispatch, useAppSelector } from "../hooks";
import type { RootState } from "../index";
import type { Chat, ChatStatus, Message, Presence } from "../../types";
import { selectAuthDetails } from "../auth/authSlice";
import { addChat, addMessage, setChats, setPresence, setTyping, syncChats, updatePresence, updateStatus } from "./chatsSlice";
import ChatAPI, { PAGE_SIZE } from "../ChatAPI";

/* how long somebody is shown as writing after their last typing event */
const TYPING_TIMEOUT = 4000;
const MAX_CATCH_UP_PAGES = 20;

interface TypingEvent {
    chatId: number;
    userId: number;
}

/* loads chats of the signed in user and keeps them up to date through the websocket */
const useChatSync = () => {
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();
    const authDetails = useAppSelector(selectAuthDetails);

    useEffect(() => {
        if (!authDetails) return;
        const myId = authDetails.id;

        /* the backend payload is trusted to have the declared shape */
        const parse = <T>(incoming: IMessage): T | null => {
            try {
                return JSON.parse(incoming.body) as T;
            } catch (e) {
                console.error("Malformed websocket message:", e);
                return null;
            }
        };

        const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

        const onMessage = (incoming: IMessage) => {
            const parsed = parse<Message>(incoming);
            if (parsed) dispatch(addMessage(parsed, parsed.userId !== myId));
        };

        const onStatus = (incoming: IMessage) => {
            const parsed = parse<ChatStatus>(incoming);
            if (parsed) dispatch(updateStatus(parsed));
        };

        const onTyping = (incoming: IMessage) => {
            const parsed = parse<TypingEvent>(incoming);
            if (!parsed || parsed.userId === myId) return;
            const key = `${parsed.chatId}:${parsed.userId}`;
            clearTimeout(typingTimers.get(key));
            dispatch(setTyping({ ...parsed, active: true }));
            typingTimers.set(key, setTimeout(() => {
                typingTimers.delete(key);
                dispatch(setTyping({ ...parsed, active: false }));
            }, TYPING_TIMEOUT));
        };
        const callbacks = { onMessage, onStatus, onTyping };

        const onPresence = (incoming: IMessage) => {
            const parsed = parse<Presence>(incoming);
            if (parsed) dispatch(updatePresence(parsed));
        };

        const loadPresence = () => ChatAPI.loadPresence()
            .then(presence => dispatch(setPresence(presence)))
            .catch(e => console.error("Failed to load presence:", e));

        /* the newest page of a chat, so the list can show previews and sort by activity */
        const withLatestMessages = async (chat: Chat): Promise<Chat> => {
            try {
                const messages = await ChatAPI.loadMessages(chat.id);
                return { ...chat, messages, hasMore: messages.length >= PAGE_SIZE };
            } catch (e) {
                console.error(`Failed to load messages of chat ${chat.id}:`, e);
                return chat;
            }
        };

        const addNewChat = (chat: Chat) => {
            dispatch(addChat(chat));
            ChatAPI.subscribeToChat(chat.id, callbacks);
            chat.users.forEach(u => ChatAPI.watchUser(u.id));
        };

        const onNewChat = (incoming: IMessage) => {
            const parsedChat = parse<Chat>(incoming);
            if (!parsedChat) return;
            addNewChat(parsedChat);
            loadPresence();
        };

        /* messages that arrived while the connection was down, oldest first */
        const catchUp = async (chat: Chat) => {
            let after = chat.messages[chat.messages.length - 1]?.id ?? 0;
            for (let page = 0; page < MAX_CATCH_UP_PAGES; page++) {
                const messages = await ChatAPI.loadMessagesAfter(chat.id, after);
                messages.forEach(m => dispatch(addMessage(m)));
                if (messages.length < PAGE_SIZE) return;
                after = messages[messages.length - 1].id;
            }
        };

        const onReconnect = async () => {
            try {
                const fresh = await ChatAPI.loadAllChats();
                const known = new Map(store.getState().chats.chats.map(c => [ c.id, c ]));
                const unknown = fresh.filter(c => !known.has(c.id));
                await Promise.all(fresh.filter(c => known.has(c.id)).map(c => catchUp(known.get(c.id) as Chat)));
                // after the messages, so the unread counts from the server win
                dispatch(syncChats(fresh));
                (await Promise.all(unknown.map(withLatestMessages))).forEach(addNewChat);
                loadPresence();
            } catch (e) {
                console.error("Failed to catch up after reconnecting:", e);
            }
        };

        let cancelled = false;
        ChatAPI.loadAllChats()
            .then(chats => Promise.all(chats.map(withLatestMessages)))
            .then(chats => {
                if (cancelled) return;
                dispatch(setChats(chats));
                ChatAPI.initWebsocket(chats, callbacks, { onNewChat, onPresence, onReconnect });
                loadPresence();
            })
            .catch(e => console.error("Failed to load chats:", e));

        return () => {
            cancelled = true;
            typingTimers.forEach(clearTimeout);
            ChatAPI.closeWebsocket();
        };
    }, [ authDetails, dispatch, store ]);
}

export default useChatSync;
