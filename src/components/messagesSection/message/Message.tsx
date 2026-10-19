import React, {useEffect, useState} from "react";
import type { Message as MessageModel } from "../../../types";
import type DateFormatter from "../../../DateFormatter";
import ChatAPI from "../../../store/ChatAPI";
import "./Message.scss"

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
        let objectUrl: string | null = null;
        ChatAPI.loadFile(message.content, controller.signal)
            .then(blob => {
                objectUrl = URL.createObjectURL(blob);
                setImageData(objectUrl);
            })
            .catch(e => {
                if (!controller.signal.aborted) console.error("Failed to load image:", e);
            });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
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
