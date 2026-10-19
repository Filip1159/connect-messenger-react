import { useEffect, useRef } from "react";
import strings from "../../strings";
import "./Lightbox.scss";

/* an image at full size above the page; closes with Escape, the button or a click outside the image */
export const Lightbox = ({ src, onClose }: { src: string; onClose: () => void }) => {
    const closeButton = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        closeButton.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            opener?.focus?.();
        };
    }, [ onClose ]);

    return (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={strings.image.preview} onClick={onClose}>
            <button ref={closeButton} type="button" className="lightbox__close" aria-label={strings.image.close} onClick={onClose}>×</button>
            <img src={src} alt="" className="lightbox__img" onClick={e => e.stopPropagation()} />
        </div>
    );
};
