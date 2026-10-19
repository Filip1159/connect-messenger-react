import type { IMessage } from "@stomp/stompjs";
import type { AppDispatch, RootState } from "../index";
import type { Chat, ChatStatus, Message, Presence } from "../../types";
import { updateDetails } from "../auth/authSlice";
import {
    addChat, addMessage, removeChat, setBlocked, setChats, setPresence, setTyping, syncChats, updatePresence, updateStatus, upsertChat, updateUser
} from "./chatsSlice";
import type { Socket } from "../../api/socket";
import { PAGE_SIZE } from "../../api/rest/chats";
import type * as chatsApi from "../../api/rest/chats";
import type * as usersApi from "../../api/rest/users";
import { handleIncoming } from "./incoming";
import { setChatsStatus, setConnection } from "../ui/uiSlice";

/* how long somebody is shown as writing after their last typing event */
const TYPING_TIMEOUT = 4000;
const MAX_CATCH_UP_PAGES = 20;

interface TypingEvent {
    chatId: number;
    userId: number;
}

/* the backend calls the sync needs */
export type ChatSyncApi = Pick<typeof chatsApi, "loadAllChats" | "loadMessages" | "loadMessagesAfter" | "loadPresence">
    & Pick<typeof usersApi, "loadProfile" | "loadBlocked">;

export interface ChatSyncDeps {
    dispatch: AppDispatch;
    getState: () => RootState;
    myId: number;
    api: ChatSyncApi;
    socket: Socket;
}

/*
 * Loads the chats of the signed in user and keeps them up to date through the websocket.
 * `start()` begins and returns the function that ends it. Plain functions, so it runs (and is tested) without React.
 */
export const createChatSync = ({ dispatch, getState, myId, api, socket }: ChatSyncDeps) => ({
    start: (): (() => void) => {

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
            if (!parsed) return;
            const state = getState();
            const chat = state.chats.chats.find(c => c.id === parsed.chatId);
            const isNew = !!chat && !chat.messages.some(m => m.id === parsed.id);  // not an edit, a reaction or a duplicate
            dispatch(addMessage(parsed, parsed.userId !== myId));
            if (chat && isNew) handleIncoming(dispatch, state, chat, parsed, myId);
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

        const loadPresence = () => api.loadPresence()
            .then(presence => dispatch(setPresence(presence)))
            .catch(e => console.error("Failed to load presence:", e));

        /* the newest page of a chat, so the list can show previews and sort by activity */
        const withLatestMessages = async (chat: Chat): Promise<Chat> => {
            try {
                const messages = await api.loadMessages(chat.id);
                return { ...chat, messages, hasMore: messages.length >= PAGE_SIZE };
            } catch (e) {
                console.error(`Failed to load messages of chat ${chat.id}:`, e);
                return { ...chat, messagesFailed: true };
            }
        };

        const addNewChat = (chat: Chat) => {
            dispatch(addChat(chat));
            socket.subscribeToChat(chat.id, callbacks);
            chat.users.forEach(u => socket.watchUser(u.id));
        };

        /* a chat of mine that is new to me (created, or I was added to it) is loaded with its latest messages; a known one is only updated */
        const onNewChat = async (incoming: IMessage) => {
            const parsedChat = parse<Chat>(incoming);
            if (!parsedChat) return;
            if (getState().chats.chats.some(c => c.id === parsedChat.id)) {
                dispatch(upsertChat(parsedChat));
                parsedChat.users.forEach(u => socket.watchUser(u.id));
                loadPresence();
                return;
            }
            addNewChat(await withLatestMessages(parsedChat));
            loadPresence();
        };

        /* I left a group or an admin removed me */
        const onChatRemoved = (incoming: IMessage) => {
            const removed = parse<{ chatId: number }>(incoming);
            if (!removed) return;
            socket.unsubscribeChat(removed.chatId);
            dispatch(removeChat(removed.chatId));
        };

        /* messages that arrived while the connection was down, oldest first */
        const catchUp = async (chat: Chat) => {
            let after = chat.messages[chat.messages.length - 1]?.id ?? 0;
            for (let page = 0; page < MAX_CATCH_UP_PAGES; page++) {
                const messages = await api.loadMessagesAfter(chat.id, after);
                messages.forEach(m => dispatch(addMessage(m)));
                if (messages.length < PAGE_SIZE) return;
                after = messages[messages.length - 1].id;
            }
        };

        const onReconnect = async () => {
            try {
                const fresh = await api.loadAllChats();
                const known = new Map(getState().chats.chats.map(c => [ c.id, c ]));
                const unknown = fresh.filter(c => !known.has(c.id));
                // groups I was removed from while the connection was down
                known.forEach((_, id) => {
                    if (fresh.some(c => c.id === id)) return;
                    socket.unsubscribeChat(id);
                    dispatch(removeChat(id));
                });
                await Promise.all(fresh.filter(c => known.has(c.id)).map(c => catchUp(known.get(c.id) as Chat)));
                // after the messages, so the unread counts from the server win
                dispatch(syncChats(fresh));
                (await Promise.all(unknown.map(withLatestMessages))).forEach(addNewChat);
                loadPresence();
            } catch (e) {
                console.error("Failed to catch up after reconnecting:", e);
            }
        };

        /* the token carries the name from sign-in time; the avatar isn't in it at all */
        api.loadProfile()
            .then(profile => {
                dispatch(updateDetails({ name: profile.name, surname: profile.surname, avatarKey: profile.avatarKey ?? null }));
                dispatch(updateUser(profile));
            })
            .catch(e => console.error("Failed to load the profile:", e));
        api.loadBlocked()
            .then(users => dispatch(setBlocked(users)))
            .catch(e => console.error("Failed to load blocked users:", e));

        const onConnection = (state: "connected" | "reconnecting") => dispatch(setConnection(state));

        let cancelled = false;
        dispatch(setConnection("connecting"));
        api.loadAllChats()
            .then(chats => Promise.all(chats.map(withLatestMessages)))
            .then(chats => {
                if (cancelled) return;
                dispatch(setChats(chats));
                dispatch(setChatsStatus("ready"));
                socket.connect(chats, callbacks, { onNewChat, onChatRemoved, onPresence, onReconnect, onConnection });
                loadPresence();
            })
            .catch(e => {
                console.error("Failed to load chats:", e);
                if (!cancelled) dispatch(setChatsStatus("failed"));
            });

        return () => {
            cancelled = true;
            typingTimers.forEach(clearTimeout);
            socket.close();
        };
    }
});
