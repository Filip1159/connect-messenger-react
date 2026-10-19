import { useEffect, useState } from "react";
import ChatAPI from "../../store/ChatAPI";
import type { User } from "../../types";

const DEBOUNCE_MS = 300;

interface Found {
    query: string;
    users: User[];
    failed: boolean;
}

/* people matching the text, searched shortly after the typing stops; outdated requests are dropped */
export const useUserSearch = (text: string) => {
    const query = text.trim();
    const [ found, setFound ] = useState<Found>({ query: "", users: [], failed: false });

    useEffect(() => {
        if (!query) return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            ChatAPI.searchUsersByQuery(query, controller.signal)
                .then(users => setFound({ query, users, failed: false }))
                .catch(e => {
                    if (controller.signal.aborted) return;
                    console.error("User search failed:", e);
                    setFound({ query, users: [], failed: true });
                });
        }, DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [ query ]);

    const current = query !== "" && found.query === query;
    return {
        users: current ? found.users : [],
        searching: query !== "" && !current,
        failed: current && found.failed,
        query
    };
};
