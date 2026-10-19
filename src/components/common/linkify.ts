/* splits text into plain and link parts; only http(s) links are recognised, so nothing like `javascript:` is ever linked */
export type TextPart = { text: string; href?: string };

const URL_PATTERN = /https?:\/\/[^\s<>"]+/gi;
/* punctuation that ends a sentence rather than the link */
const TRAILING = /[.,!?;:'")\]}]+$/;

export const splitLinks = (text: string): TextPart[] => {
    const parts: TextPart[] = [];
    let last = 0;
    for (const match of text.matchAll(URL_PATTERN)) {
        const start = match.index ?? 0;
        const url = match[0].replace(TRAILING, "");
        if (!URL.canParse(url)) continue;
        if (start > last) parts.push({ text: text.slice(last, start) });
        parts.push({ text: url, href: url });
        last = start + url.length;
    }
    if (last < text.length) parts.push({ text: text.slice(last) });
    return parts;
};
