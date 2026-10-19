import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAuthDetails } from "../../store/auth/authSlice";
import { addBlocked, removeBlocked, removeChat, selectBlocked, selectChats, upsertChat } from "../../store/chats/chatsSlice";
import { chatTitle, fullName, getRecipient, isAdmin, isGroup } from "../../store/chats/chatUtils";
import ChatAPI from "../../store/ChatAPI";
import strings from "../../strings";
import type { Chat, User } from "../../types";
import { Dialog } from "../common/Dialog";
import { ChatAvatar } from "../common/ChatAvatar";
import Avatar from "../common/Avatar";
import { UserPicker } from "../common/UserPicker";
import { errorMessage } from "../common/errors";
import "./ChatDetailsDialog.scss";

const MAX_NAME_LENGTH = 60;

/* archive, mute and block; for a group also its name, members and admins */
export const ChatDetailsDialog = ({ chatId, onClose }: { chatId: number; onClose: () => void }) => {
    const dispatch = useAppDispatch();
    const chat = useAppSelector(selectChats).find(c => c.id === chatId);
    const blocked = useAppSelector(selectBlocked);
    const myId = useAppSelector(selectAuthDetails)?.id;
    const [ error, setError ] = useState("");
    const [ busy, setBusy ] = useState(false);

    if (!chat) return null;
    const group = isGroup(chat);
    const admin = isAdmin(chat, myId);
    const other = getRecipient(chat, myId);

    /* runs a request, shows its failure, reports whether it worked */
    const run = async (request: () => Promise<unknown>): Promise<boolean> => {
        setBusy(true);
        setError("");
        try {
            await request();
            return true;
        } catch (e) {
            console.error("Chat action failed:", e);
            setError(errorMessage(e, strings.chatOptions.failed));
            return false;
        } finally {
            setBusy(false);
        }
    };
    const changeChat = (request: () => Promise<Chat>) => run(async () => dispatch(upsertChat(await request())));

    return (
        <Dialog title={strings.chatOptions.title} onClose={onClose}>
            <div className="chatDetails__head">
                <span className="chatDetails__avatar"><ChatAvatar chat={chat} myId={myId} /></span>
                <strong className="chatDetails__title">{chatTitle(chat, myId)}</strong>
            </div>

            <div className="dialog__section">
                <div className="dialog__row">
                    <button type="button" className="dialog__button" aria-pressed={!!chat.muted} disabled={busy}
                            onClick={() => changeChat(() => ChatAPI.updateChatSettings(chat.id, { muted: !chat.muted }))}>
                        {chat.muted ? strings.chatOptions.unmute : strings.chatOptions.mute}
                    </button>
                    <button type="button" className="dialog__button" aria-pressed={!!chat.archived} disabled={busy}
                            onClick={() => changeChat(() => ChatAPI.updateChatSettings(chat.id, { archived: !chat.archived }))}>
                        {chat.archived ? strings.chatOptions.unarchive : strings.chatOptions.archive}
                    </button>
                </div>
            </div>

            {!group && other &&
                <BlockSection user={other} isBlocked={blocked.some(u => u.id === other.id)} busy={busy}
                              onBlock={() => run(async () => { await ChatAPI.blockUser(other.id); dispatch(addBlocked(other)); })}
                              onUnblock={() => run(async () => { await ChatAPI.unblockUser(other.id); dispatch(removeBlocked(other.id)); })} />}

            {group &&
                <GroupSection chat={chat} myId={myId} admin={admin} busy={busy} run={run} changeChat={changeChat}
                              onLeft={() => { dispatch(removeChat(chat.id)); ChatAPI.unsubscribeChat(chat.id); onClose(); }} />}

            {error && <p role="alert" className="dialog__error">{error}</p>}
        </Dialog>
    );
};

const BlockSection = ({ user, isBlocked, busy, onBlock, onUnblock }: {
    user: User; isBlocked: boolean; busy: boolean; onBlock: () => void; onUnblock: () => void;
}) => {
    const [ confirming, setConfirming ] = useState(false);
    return (
        <div className="dialog__section">
            {isBlocked
                ? <>
                    <p className="dialog__hint">{strings.chatOptions.blockedNotice}</p>
                    <div className="dialog__row">
                        <button type="button" className="dialog__button" disabled={busy} onClick={onUnblock}>
                            {strings.chatOptions.unblock} {fullName(user)}
                        </button>
                    </div>
                </>
                : confirming
                    ? <>
                        <p className="dialog__hint">{strings.chatOptions.blockConfirm}</p>
                        <div className="dialog__row">
                            <button type="button" className="dialog__button dialog__button--danger" disabled={busy}
                                    onClick={() => { setConfirming(false); onBlock(); }}>{strings.chatOptions.block}</button>
                            <button type="button" className="dialog__button" onClick={() => setConfirming(false)}>{strings.message.cancel}</button>
                        </div>
                    </>
                    : <div className="dialog__row">
                        <button type="button" className="dialog__button dialog__button--danger" onClick={() => setConfirming(true)}>
                            {strings.chatOptions.block} {fullName(user)}
                        </button>
                    </div>}
        </div>
    );
};

const GroupSection = ({ chat, myId, admin, busy, run, changeChat, onLeft }: {
    chat: Chat; myId: number | undefined; admin: boolean; busy: boolean;
    run: (request: () => Promise<unknown>) => Promise<boolean>;
    changeChat: (request: () => Promise<Chat>) => Promise<boolean>;
    onLeft: () => void;
}) => {
    const dispatch = useAppDispatch();
    const [ name, setName ] = useState(chat.name ?? "");
    const [ adding, setAdding ] = useState<User[]>([]);
    const [ leaving, setLeaving ] = useState(false);

    const toggle = (user: User) =>
        setAdding(current => current.some(u => u.id === user.id) ? current.filter(u => u.id !== user.id) : [ ...current, user ]);
    const rename = () => { if (name.trim()) void changeChat(() => ChatAPI.renameChat(chat.id, name.trim())); };
    const add = async () => {
        if (await changeChat(() => ChatAPI.addMembers(chat.id, adding.map(u => u.id)))) setAdding([]);
    };
    const remove = (user: User) => run(async () => {
        await ChatAPI.removeMember(chat.id, user.id);
        dispatch(upsertChat(await ChatAPI.loadChat(chat.id)));
    });
    const leave = async () => { if (await run(() => ChatAPI.removeMember(chat.id, myId as number))) onLeft(); };

    return (
        <>
            {admin &&
                <div className="dialog__section">
                    <h3>{strings.group.name}</h3>
                    <form className="dialog__row chatDetails__rename" onSubmit={e => { e.preventDefault(); rename(); }}>
                        <input type="text" aria-label={strings.group.name} maxLength={MAX_NAME_LENGTH} value={name}
                               onChange={e => setName(e.target.value)} autoComplete="off" />
                        <button type="submit" className="dialog__button" disabled={busy || !name.trim() || name.trim() === chat.name}>
                            {strings.group.rename}
                        </button>
                    </form>
                </div>}

            <div className="dialog__section">
                <h3>{strings.group.members} ({chat.users.length})</h3>
                <ul className="chatDetails__members">
                    {chat.users.map(u => {
                        const isMe = u.id === myId;
                        const isAdminUser = !!chat.adminIds?.includes(u.id);
                        return (
                            <li key={u.id} className="chatDetails__member">
                                <Avatar user={u} alt="" className="chatDetails__memberAvatar" />
                                <span className="chatDetails__memberName">
                                    {fullName(u)}
                                    {isMe && <span className="chatDetails__tag"> {strings.group.you}</span>}
                                    {isAdminUser && <span className="chatDetails__tag chatDetails__tag--admin"> {strings.group.admin}</span>}
                                </span>
                                {admin && !isMe &&
                                    <span className="chatDetails__memberActions">
                                        <button type="button" className="dialog__button" disabled={busy}
                                                aria-label={`${isAdminUser ? strings.group.removeAdmin : strings.group.makeAdmin}: ${fullName(u)}`}
                                                onClick={() => changeChat(() => ChatAPI.setAdmin(chat.id, u.id, !isAdminUser))}>
                                            {isAdminUser ? strings.group.removeAdmin : strings.group.makeAdmin}
                                        </button>
                                        <button type="button" className="dialog__button dialog__button--danger" disabled={busy}
                                                aria-label={`${strings.group.removeMember}: ${fullName(u)}`} onClick={() => remove(u)}>
                                            {strings.group.remove}
                                        </button>
                                    </span>}
                            </li>
                        );
                    })}
                </ul>
            </div>

            {admin &&
                <div className="dialog__section">
                    <h3>{strings.group.addPeople}</h3>
                    <UserPicker selected={adding} excludeIds={chat.users.map(u => u.id)} onToggle={toggle} />
                    {adding.length > 0 &&
                        <div className="dialog__row chatDetails__add">
                            <button type="button" className="dialog__button dialog__button--primary" disabled={busy} onClick={add}>
                                {strings.group.add} ({adding.length})
                            </button>
                        </div>}
                </div>}

            <div className="dialog__section">
                {leaving
                    ? <>
                        <p className="dialog__hint">{strings.group.leaveConfirm}</p>
                        <div className="dialog__row">
                            <button type="button" className="dialog__button dialog__button--danger" disabled={busy} onClick={leave}>{strings.message.yes}</button>
                            <button type="button" className="dialog__button" onClick={() => setLeaving(false)}>{strings.message.no}</button>
                        </div>
                    </>
                    : <div className="dialog__row">
                        <button type="button" className="dialog__button dialog__button--danger" onClick={() => setLeaving(true)}>{strings.group.leave}</button>
                    </div>}
            </div>
        </>
    );
};
