import { splitLinks } from "./linkify";

/* text with clickable links; the content is always rendered as text, never as HTML */
export const Linkified = ({ text }: { text: string }) => (
    <>
        {splitLinks(text).map((part, i) => part.href
            ? <a key={i} href={part.href} target="_blank" rel="noopener noreferrer nofollow">{part.text}</a>
            : <span key={i}>{part.text}</span>)}
    </>
);
