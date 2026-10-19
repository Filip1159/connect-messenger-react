import type { KeyboardEvent } from "react";

/* makes a non-button element (role="button") react to Enter and Space like a real button */
export const activateOnKey = (handler: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
    }
};
