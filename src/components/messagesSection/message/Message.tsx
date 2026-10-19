import React, {useEffect, useState} from "react";
import type { Message as MessageModel } from "../../../types";
import type DateFormatter from "../../../DateFormatter";
import ChatAPI from "../../../store/ChatAPI";
import "./Message.scss"

/* base64 signatures of the supported image types */
const detectMimeType = (base64: string): string => {
    if (base64.startsWith("iVBOR")) return "image/png";
    if (base64.startsWith("R0lG")) return "image/gif";
    return "image/jpeg";
};

interface MessageProps {
    message: MessageModel;
    modifier: string;
    dateFormatter: DateFormatter;
}

export const Message = React.forwardRef<HTMLDivElement, MessageProps>(function Message({message, modifier, dateFormatter}, ref) {
    const [imageData, setImageData] = useState('')

    useEffect(() => {
        if (message.type !== 'FILE') return;

        const controller = new AbortController();
        ChatAPI.loadFile(message.content, controller.signal)
            .then(base64 => setImageData(`data:${detectMimeType(base64)};base64,${base64}`))
            .catch(e => {
                if (!controller.signal.aborted) console.error("Failed to load image:", e);
            });
        return () => controller.abort();
    }, [message.type, message.content])

    return (
        <>
            {!dateFormatter.is5MinDiffBefore() &&
                <div className="singleMessage__time">
                    {dateFormatter.displayDayIfDifferent() + dateFormatter.currentToHourMinute()}
                </div>}
            {
                message.type !== 'FILE' ?
                    <div ref={ref} id={`messageId${message.id}`} className={`singleMessage${modifier}`}>
                        {message.content}
                        <div className="singleMessage__tooltip">{dateFormatter.currentToPretty()}</div>
                    </div>
                    :
                    <div ref={ref} id={`messageId${message.id}`} className={`singleMessage${modifier} singleMessage--img`}>
                        <img src={imageData || undefined} alt="" className="singleMessage__img" />
                    </div>
            }
        </>
    );
});
