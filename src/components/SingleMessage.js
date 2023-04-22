import React from "react";

const SingleMessage = React.forwardRef(({message, modifier, dateFormatter}, ref) => {
    return (
        <>
            {!dateFormatter.is5MinDiffBefore() &&
                <div className="messages__time">
                    {dateFormatter.displayDayIfDifferent() + dateFormatter.currentToHourMinute()}
                </div>}
            {
                message.type !== 'FILE' ?
                    <div ref={ref} id={`messageId${message.id}`} className={`messages__singleMessage${modifier}`}>
                        {message.content}
                        <div className="messages__singleMessage__tooltip">{dateFormatter.currentToPretty()}</div>
                    </div>
                    :
                    <div ref={ref} id={`messageId${message.id}`} className={`messages__singleMessage${modifier} messages__singleMessage--img`}>
                        <img src={`http://localhost:8080${message.content}`} alt="" className="messages__singleMessage__img"/>
                    </div>
            }
        </>
    );
});

export default SingleMessage;