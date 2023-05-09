import React, {useEffect, useState} from "react";
import axios from "axios";
import "./Message.scss"
import DateFormatter from "../../../DateFormatter";

export const Message = React.forwardRef(
    ({
         message, isMine, isTopSticky, isBottomSticky, shouldDisplayDate, shouldDisplayDay, date
     }, ref) => {
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

        const classNames = [
            'singleMessage',
            `singleMessage--${isMine ? 'myMsg' : 'receivedMsg'}`,
            isTopSticky ? 'singleMessage--topSticky' : '',
            isBottomSticky ? 'singleMessage--bottomSticky' : ''
        ]

        return (
            <>
                {shouldDisplayDate &&
                    <div className="singleMessage__time">
                        {DateFormatter.toUiFormat(date, shouldDisplayDay)}
                    </div>}
                {
                    message.type !== 'FILE' ?
                        <div ref={ref} id={`messageId${message.id}`} className={classNames.join(' ')}>
                            {message.content}
                            <div className="singleMessage__tooltip">{DateFormatter.toUiTooltipFormat(date)}</div>
                        </div>
                        :
                        <div ref={ref} id={`messageId${message.id}`}
                             className={`${classNames} singleMessage--img`}>
                            <img src={imageData} alt="" className="singleMessage__img"/>
                        </div>
                }
            </>
        );
    });
