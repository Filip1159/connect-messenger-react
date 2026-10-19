
import type { ImgHTMLAttributes } from "react";
import strings from "../../strings";

const FALLBACK_AVATAR = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#c4c4c4"/>' +
    '<circle cx="32" cy="24" r="12" fill="#f5f5f5"/>' +
    '<path d="M8 64c0-16 10-24 24-24s24 8 24 24z" fill="#f5f5f5"/></svg>'
);

/* user avatar with a placeholder shown when the image file doesn't exist */
interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
    username: string;
}

const Avatar = ({ username, alt = strings.avatar.user, ...props }: AvatarProps) => (
    <img
        src={`/images/avatars/${encodeURIComponent(username)}.png`}
        alt={alt}
        onError={e => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_AVATAR;
        }}
        {...props}
    />
);

export default Avatar;
