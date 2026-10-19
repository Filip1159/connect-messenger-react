import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useAppDispatch } from "../../store/hooks";
import { setActive, upsertChat } from "../../store/chats/chatsSlice";
import strings from "../../strings";
import type { User } from "../../types";
import { Dialog } from "../common/Dialog";
import { UserPicker } from "../common/UserPicker";
import { errorMessage } from "../common/errors";
import * as chatsApi from "../../api/rest/chats";

const MAX_NAME_LENGTH = 60;

/* a group needs a name, or at least two other people */
export const canCreateGroup = (name: string, people: number) => people >= 2 || (people >= 1 && name.trim() !== "");

export const NewGroupDialog = ({ onClose }: { onClose: () => void }) => {
    const dispatch = useAppDispatch();
    const nameId = useId();
    const [ name, setName ] = useState("");
    const [ people, setPeople ] = useState<User[]>([]);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState("");

    const toggle = (user: User) =>
        setPeople(current => current.some(u => u.id === user.id) ? current.filter(u => u.id !== user.id) : [ ...current, user ]);

    const create = (e: FormEvent) => {
        e.preventDefault();
        if (busy || !canCreateGroup(name, people.length)) return;
        setBusy(true);
        setError("");
        chatsApi.createChat(people.map(u => u.id), name.trim() || undefined)
            .then(chat => {
                dispatch(upsertChat(chat));
                dispatch(setActive(chat.id));
                onClose();
            })
            .catch(err => {
                console.error("Failed to create the group:", err);
                setError(errorMessage(err, strings.group.createFailed));
                setBusy(false);
            });
    };

    return (
        <Dialog title={strings.group.newGroup} onClose={onClose}>
            <form onSubmit={create}>
                <div className="dialog__field">
                    <label htmlFor={nameId}>{strings.group.name}</label>
                    <input id={nameId} type="text" maxLength={MAX_NAME_LENGTH} placeholder={strings.group.namePlaceholder}
                           value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
                </div>
                <div className="dialog__section">
                    <h3>{strings.group.members}</h3>
                    <UserPicker selected={people} onToggle={toggle} />
                </div>
                {!canCreateGroup(name, people.length) && <p className="dialog__hint">{strings.group.needOne}</p>}
                {error && <p role="alert" className="dialog__error">{error}</p>}
                <div className="dialog__row">
                    <button type="submit" className="dialog__button dialog__button--primary" disabled={busy || !canCreateGroup(name, people.length)}>
                        {busy ? strings.group.creating : strings.group.create}
                    </button>
                </div>
            </form>
        </Dialog>
    );
};
