import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { KeyboardEvent, ReactNode } from "react";
import strings from "../../strings";
import "./Dialog.scss";

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/* a modal panel above the page: closes with Escape, the × button or a click outside; focus stays inside and returns on close */
export const Dialog = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => {
    const titleId = useId();
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        panel.current?.focus();
        return () => opener?.focus?.();
    }, []);

    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [ onClose ]);

    /* Tab cycles through the panel instead of leaving it */
    const keepFocus = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !panel.current) return;
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    // in the body, so that nothing of the place it was opened from (header fonts, stacking) applies
    return createPortal(
        <div className="dialog" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div ref={panel} className="dialog__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}
                 tabIndex={-1} onKeyDown={keepFocus}>
                <div className="dialog__header">
                    <h2 id={titleId} className="dialog__title">{title}</h2>
                    <button type="button" className="dialog__close" aria-label={strings.profile.close} onClick={onClose}>×</button>
                </div>
                <div className="dialog__body">{children}</div>
            </div>
        </div>,
        document.body
    );
};
