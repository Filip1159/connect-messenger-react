import { useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAuthDetails, updateDetails } from "../../store/auth/authSlice";
import { removeBlocked, selectBlocked, updateUser } from "../../store/chats/chatsSlice";
import strings from "../../strings";
import type { User } from "../../types";
import { Dialog } from "../common/Dialog";
import Avatar from "../common/Avatar";
import { errorMessage } from "../common/errors";
import { validatePassword } from "../registerPage/registerValidation";
import "./ProfileDialog.scss";
import * as usersApi from "../../api/rest/users";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;  // the backend refuses bigger ones
const AVATAR_TYPES = [ "image/jpeg", "image/png", "image/gif" ];

/* my name, photo and password, and the people I blocked */
export const ProfileDialog = ({ onClose }: { onClose: () => void }) => {
    const me = useAppSelector(selectAuthDetails);
    if (!me) return null;
    return (
        <Dialog title={strings.profile.title} onClose={onClose}>
            <PhotoSection me={me} />
            <NameSection me={me} />
            <PasswordSection />
            <BlockedSection />
        </Dialog>
    );
};

/* a profile change reaches the session and every chat that shows me */
const useProfileUpdate = () => {
    const dispatch = useAppDispatch();
    return (user: User) => {
        dispatch(updateDetails({ name: user.name, surname: user.surname, avatarKey: user.avatarKey ?? null }));
        dispatch(updateUser(user));
    };
};

const PhotoSection = ({ me }: { me: User }) => {
    const apply = useProfileUpdate();
    const input = useRef<HTMLInputElement>(null);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState("");

    const choose = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";  // the same file can be chosen again
        if (!file) return;
        if (!AVATAR_TYPES.includes(file.type)) return setError(strings.messageInput.notAnImage);
        if (file.size > MAX_AVATAR_SIZE) return setError(strings.profile.photoTooLarge);
        change(() => usersApi.uploadAvatar(file));
    };

    const change = (request: () => Promise<User>) => {
        setBusy(true);
        setError("");
        request()
            .then(apply)
            .catch(e => {
                console.error("Failed to change the photo:", e);
                setError(errorMessage(e, strings.profile.saveFailed));
            })
            .finally(() => setBusy(false));
    };

    return (
        <div className="dialog__section">
            <h3>{strings.profile.photo}</h3>
            <div className="profile__photo">
                <Avatar user={me} alt="" className="profile__avatar" />
                <div>
                    <div className="dialog__row">
                        <button type="button" className="dialog__button" disabled={busy} onClick={() => input.current?.click()}>
                            {strings.profile.changePhoto}
                        </button>
                        {me.avatarKey &&
                            <button type="button" className="dialog__button" disabled={busy} onClick={() => change(() => usersApi.removeAvatar())}>
                                {strings.profile.removePhoto}
                            </button>}
                    </div>
                    <p className="dialog__hint">{strings.profile.photoRule}</p>
                </div>
                <input ref={input} type="file" className="srOnly" tabIndex={-1} aria-label={strings.profile.changePhoto}
                       accept=".jpg, .jpeg, .png, .gif" onChange={choose} />
            </div>
            {error && <p role="alert" className="dialog__error">{error}</p>}
        </div>
    );
};

const NameSection = ({ me }: { me: User }) => {
    const apply = useProfileUpdate();
    const nameId = useId();
    const surnameId = useId();
    const [ name, setName ] = useState(me.name);
    const [ surname, setSurname ] = useState(me.surname);
    const [ busy, setBusy ] = useState(false);
    const [ message, setMessage ] = useState<{ ok: boolean; text: string } | null>(null);

    const valid = name.trim() !== "" && surname.trim() !== "";
    const unchanged = name.trim() === me.name && surname.trim() === me.surname;

    const save = (e: FormEvent) => {
        e.preventDefault();
        if (busy || !valid || unchanged) return;
        setBusy(true);
        setMessage(null);
        usersApi.updateProfile(name.trim(), surname.trim())
            .then(user => {
                apply(user);
                setMessage({ ok: true, text: strings.profile.saved });
            })
            .catch(err => {
                console.error("Failed to save the profile:", err);
                setMessage({ ok: false, text: errorMessage(err, strings.profile.saveFailed) });
            })
            .finally(() => setBusy(false));
    };

    return (
        <form className="dialog__section" onSubmit={save}>
            <div className="dialog__field">
                <label htmlFor={nameId}>{strings.profile.name}</label>
                <input id={nameId} type="text" maxLength={50} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="dialog__field">
                <label htmlFor={surnameId}>{strings.profile.surname}</label>
                <input id={surnameId} type="text" maxLength={50} value={surname} onChange={e => setSurname(e.target.value)} />
            </div>
            <div className="dialog__row">
                <button type="submit" className="dialog__button dialog__button--primary" disabled={busy || !valid || unchanged}>
                    {strings.profile.save}
                </button>
            </div>
            {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "dialog__ok" : "dialog__error"}>{message.text}</p>}
        </form>
    );
};

const PasswordSection = () => {
    const currentId = useId();
    const newId = useId();
    const repeatId = useId();
    const [ current, setCurrent ] = useState("");
    const [ next, setNext ] = useState("");
    const [ repeat, setRepeat ] = useState("");
    const [ busy, setBusy ] = useState(false);
    const [ message, setMessage ] = useState<{ ok: boolean; text: string } | null>(null);

    const problem = next !== "" && !validatePassword(next) ? strings.register.passwordRule
        : repeat !== "" && repeat !== next ? strings.register.passwordsDiffer : "";
    const ready = current !== "" && validatePassword(next) && next === repeat;

    const change = (e: FormEvent) => {
        e.preventDefault();
        if (busy || !ready) return;
        setBusy(true);
        setMessage(null);
        usersApi.changePassword(current, next)
            .then(() => {
                setMessage({ ok: true, text: strings.profile.passwordChanged });
                setCurrent("");
                setNext("");
                setRepeat("");
            })
            .catch(err => {
                console.error("Failed to change the password:", err);
                const wrong = err?.response?.status === 403;
                setMessage({ ok: false, text: wrong ? strings.profile.wrongPassword : errorMessage(err, strings.profile.saveFailed) });
            })
            .finally(() => setBusy(false));
    };

    return (
        <form className="dialog__section" onSubmit={change}>
            <h3>{strings.profile.password}</h3>
            <div className="dialog__field">
                <label htmlFor={currentId}>{strings.profile.currentPassword}</label>
                <input id={currentId} type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
            </div>
            <div className="dialog__field">
                <label htmlFor={newId}>{strings.profile.newPassword}</label>
                <input id={newId} type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
            </div>
            <div className="dialog__field">
                <label htmlFor={repeatId}>{strings.profile.repeatPassword}</label>
                <input id={repeatId} type="password" autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} />
            </div>
            {problem && <p className="dialog__hint">{problem}</p>}
            <div className="dialog__row">
                <button type="submit" className="dialog__button dialog__button--primary" disabled={busy || !ready}>
                    {strings.profile.changePassword}
                </button>
            </div>
            {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "dialog__ok" : "dialog__error"}>{message.text}</p>}
        </form>
    );
};

const BlockedSection = () => {
    const dispatch = useAppDispatch();
    const blocked = useAppSelector(selectBlocked);
    const [ error, setError ] = useState("");

    const unblock = (user: User) => {
        setError("");
        usersApi.unblockUser(user.id)
            .then(() => dispatch(removeBlocked(user.id)))
            .catch(e => {
                console.error("Failed to unblock:", e);
                setError(errorMessage(e, strings.chatOptions.failed));
            });
    };

    return (
        <div className="dialog__section">
            <h3>{strings.profile.blocked}</h3>
            {blocked.length === 0
                ? <p className="dialog__hint">{strings.profile.noBlocked}</p>
                : <ul className="profile__blocked">
                    {blocked.map(u => (
                        <li key={u.id}>
                            <Avatar user={u} alt="" className="profile__blockedAvatar" />
                            <span className="profile__blockedName">{u.name} {u.surname}</span>
                            <button type="button" className="dialog__button" aria-label={`${strings.profile.unblock} ${u.name} ${u.surname}`}
                                    onClick={() => unblock(u)}>{strings.profile.unblock}</button>
                        </li>
                    ))}
                </ul>}
            {error && <p role="alert" className="dialog__error">{error}</p>}
        </div>
    );
};
