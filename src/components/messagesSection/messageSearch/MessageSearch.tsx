import { useEffect, useRef, useState } from "react";
import ChatAPI, { PAGE_SIZE } from "../../../store/ChatAPI";
import DateFormatter from "../../../DateFormatter";
import strings from "../../../strings";
import type { Message } from "../../../types";
import "./MessageSearch.scss";

const DEBOUNCE = 300;

interface Results {
    query: string;
    messages: Message[];
    hasMore: boolean;
    failed: boolean;
}

interface MessageSearchProps {
    chatId: number;
    /* shows the message in the conversation */
    onJump: (messageId: number) => void;
    onClose: () => void;
}

/* the part of the text around the first match, with the match marked */
const Snippet = ({ text, query }: { text: string; query: string }) => {
    const at = text.toLowerCase().indexOf(query.toLowerCase());
    if (at === -1) return <>{text}</>;
    const start = Math.max(0, at - 20);
    return (
        <>
            {start > 0 && "…"}{text.slice(start, at)}
            <mark>{text.slice(at, at + query.length)}</mark>
            {text.slice(at + query.length)}
        </>
    );
};

/* searches the text messages of one chat; results are shown newest first */
export const MessageSearch = ({ chatId, onJump, onClose }: MessageSearchProps) => {
    const [ input, setInput ] = useState("");
    const [ results, setResults ] = useState<Results | null>(null);
    const controller = useRef<AbortController | null>(null);
    const query = input.trim();

    const run = (text: string, before?: number) => {
        controller.current?.abort();
        const abort = new AbortController();
        controller.current = abort;
        ChatAPI.searchMessages(chatId, text, before, abort.signal)
            .then(found => setResults(previous => ({
                query: text,
                messages: before !== undefined && previous?.query === text ? [ ...previous.messages, ...found ] : found,
                hasMore: found.length >= PAGE_SIZE,
                failed: false
            })))
            .catch(e => {
                if (abort.signal.aborted) return;
                console.error("Search failed:", e);
                setResults({ query: text, messages: [], hasMore: false, failed: true });
            });
    };

    /* a new search shortly after the user stops typing */
    useEffect(() => {
        if (!query) return;
        const timer = setTimeout(() => run(query), DEBOUNCE);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ query, chatId ]);

    useEffect(() => () => controller.current?.abort(), []);

    const current = query && results?.query === query ? results : null;
    const oldest = current?.messages[current.messages.length - 1]?.id;
    const formatDate = (time: string) => {
        const date = DateFormatter.sqlToDateObject(time);
        return new DateFormatter(null, date, null).currentToPretty();
    };

    return (
        <div className="messageSearch" role="search">
            <div className="messageSearch__bar">
                <input
                    type="search"
                    autoFocus
                    className="messageSearch__input"
                    placeholder={strings.search.placeholder}
                    aria-label={strings.search.placeholder}
                    value={input}
                    maxLength={100}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") onClose(); }}
                />
                <button type="button" aria-label={strings.search.close} onClick={onClose}>×</button>
            </div>
            {current && (
                <ul className="messageSearch__results" aria-live="polite">
                    {current.failed && <li role="alert">{strings.search.failed}</li>}
                    {!current.failed && current.messages.length === 0 && <li>{strings.search.noResults}</li>}
                    {current.messages.map(m => (
                        <li key={m.id}>
                            <button type="button" aria-label={strings.search.jump} onClick={() => onJump(m.id)}>
                                <span className="messageSearch__time">{formatDate(m.time)}</span>
                                <span className="messageSearch__text"><Snippet text={m.content} query={current.query}/></span>
                            </button>
                        </li>
                    ))}
                    {current.hasMore && oldest !== undefined &&
                        <li><button type="button" onClick={() => run(current.query, oldest)}>{strings.search.more}</button></li>}
                </ul>
            )}
        </div>
    );
};
