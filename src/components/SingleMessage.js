import React from "react";

const SingleMessage = React.forwardRef(( { message, modifier, dateFormatter }, ref ) => {
    return (
        <>
            {!dateFormatter.is5MinDiffBefore() &&
            <div className="messages__time">
                {dateFormatter.displayDayIfDifferent() + dateFormatter.currentToHourMinute()}
            </div>}
            <div ref={ref} id={`messageId${message.id}`} className={`messages__singleMessage${modifier}`}>
                {message.content}
                <div className="messages__singleMessage__tooltip">{dateFormatter.currentToPretty()}</div>
            </div>
        </>
    );
});

export default SingleMessage;