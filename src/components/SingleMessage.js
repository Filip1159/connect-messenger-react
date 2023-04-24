import React, {useEffect, useState} from "react";
import axios from "axios";

const SingleMessage = React.forwardRef(({message, modifier, dateFormatter}, ref) => {
    const [imageData, setImageData] = useState('')

    const fetchImage = async () =>
        await axios.get(`http://localhost:8080/message/file/${message.content}`, {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        })

    useEffect(() => {
        if (message.type === 'FILE') {
            fetchImage()
                .then(res => setImageData(`data:image/jpeg;base64,${res.data}`))
        }
    }, [])

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
                        <img src={imageData} alt="" className="messages__singleMessage__img" />
                    </div>
            }
        </>
    );
});

export default SingleMessage;