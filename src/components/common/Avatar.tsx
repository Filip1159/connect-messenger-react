import { useEffect, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import strings from "../../strings";
import type { User } from "../../types";
import * as usersApi from "../../api/rest/users";

const FALLBACK_AVATAR = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#c4c4c4"/>' +
    '<circle cx="32" cy="24" r="12" fill="#f5f5f5"/>' +
    '<path d="M8 64c0-16 10-24 24-24s24 8 24 24z" fill="#f5f5f5"/></svg>'
);

/* uploaded avatars are fetched with the session, once per user and upload; the object URLs live as long as the page */
const uploaded = new Map<string, Promise<string>>();

const loadUploaded = (user: AvatarUser): Promise<string> => {
    const key = `${user.id}:${user.avatarKey}`;
    let url = uploaded.get(key);
    if (!url) {
        url = usersApi.loadAvatar(user.id).then(blob => URL.createObjectURL(blob));
        url.catch(() => uploaded.delete(key));  // a failure may be temporary
        uploaded.set(key, url);
    }
    return url;
};

type AvatarUser = Pick<User, "id" | "username" | "avatarKey">;

/* the uploaded avatar of the user, or null while it loads / when there is none */
const useUploadedAvatar = (user: AvatarUser): string | null => {
    const key = user.avatarKey ? `${user.id}:${user.avatarKey}` : null;
    const [ loaded, setLoaded ] = useState<{ key: string; url: string } | null>(null);

    useEffect(() => {
        if (!key) return;
        let current = true;
        loadUploaded(user).then(url => { if (current) setLoaded({ key, url }); }).catch(() => {});
        return () => { current = false; };
    // the key covers id and avatarKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ key ]);

    return key && loaded?.key === key ? loaded.url : null;
};

/* user avatar: the uploaded picture, else the bundled one of that username, else a placeholder */
interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
    user: AvatarUser;
}

const Avatar = ({ user, alt = strings.avatar.user, ...props }: AvatarProps) => {
    const upload = useUploadedAvatar(user);
    return (
        <img
            src={upload ?? `/images/avatars/${encodeURIComponent(user.username)}.png`}
            alt={alt}
            onError={e => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_AVATAR;
            }}
            {...props}
        />
    );
};

export default Avatar;
