import React, {useEffect, useState} from "react";
import axios from "axios";
import "./Message.scss"
import { toUiFormat, toUiTooltipFormat } from "../../../dateFormatter";

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

        const formatContent = content => {
            const splitMarks = /(<b>|<\/b>)/
            const splitText = content.split(splitMarks)
            console.log(splitText)
            let isBold = false
            return splitText.map(fragment => {
                if (fragment === '<b>') {
                    isBold = true
                    return null
                }
                else if (fragment === '</b>') {
                    isBold = false
                    return null
                }
                else if (isBold) {
                    return <b style={{fontWeight: 900}}>{fragment}</b>
                } else return <span>{fragment}</span>
            })
        }

        return (
            <>
                {shouldDisplayDate &&
                    <div className="singleMessage__time">
                        {toUiFormat(date, shouldDisplayDay)}
                    </div>}
                {
                    message.type !== 'FILE' ?
                        <div ref={ref} id={`messageId${message.id}`} className={classNames.join(' ')}>
                            {formatContent(message.content)}
                            <div className="singleMessage__tooltip">{toUiTooltipFormat(date)}</div>
                        </div>
                        :
                        <div ref={ref} id={`messageId${message.id}`}
                             className={`${classNames} singleMessage--img`}>
                            <img src={imageData} alt="" className="singleMessage__img"/>
                        </div>
                }
            </>
        )
    })
