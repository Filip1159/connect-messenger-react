import React, {useEffect, useState} from "react";
import axios from "axios";
import "./Message.scss"

export const Message = React.forwardRef(({message, modifier, dateFormatter}, ref) => {
    const [imageData, setImageData] = useState('')

    const fetchImage = async () =>
        await axios.get(`http://localhost:8080/message/file/${message.content}`, {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        })

    useEffect(() => {
        console.log('fetching image')
        console.log(message)
        if (message.type === 'FILE') {
            fetchImage()
                .then(res => setImageData(`data:image/jpeg;base64,${res.data}`))
        }
    }, [message])

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
                        <img src={imageData} alt="" className="singleMessage__img" />
                    </div>
            }
        </>
    );
});
