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
            const splitMarks = /(_B_|_@B_|_U_|_@U_|_I_|_@I_)/
            const splitText = content.split(splitMarks)
            console.log(splitText)
            let isBold = false
            let isUnderline = false
            let isItalic = false
            return splitText.map(fragment => {
                switch (fragment) {
                    case '_B_':
                        isBold = true
                        break
                    case '_@B_':
                        isBold = false
                        break
                    case '_U_':
                        isUnderline = true
                        break
                    case '_@U_':
                        isUnderline = false
                        break
                    case '_I_':
                        isItalic = true
                        break
                    case '_@I_':
                        isItalic = false
                        break
                    default:
                        const fragmentClasses = []
                        if (isBold) {
                            fragmentClasses.push('singleMessage__fragment--bold')
                        }
                        if (isUnderline) {
                            fragmentClasses.push('singleMessage__fragment--underline')
                        }
                        if (isItalic) {
                            fragmentClasses.push('singleMessage__fragment--italic')
                        }
                        return <span className={fragmentClasses.join(' ')}>{fragment}</span>
                }
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
