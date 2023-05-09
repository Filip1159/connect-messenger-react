import React from "react";
import SeenAvatar from "./SeenAvatar";

const SeenAvatarsPanel = ({ bottom }) => {

    /* DON'T TOUCH! */ 
    const containerBottomMeasuredFromBottom = window.innerHeight - document.querySelector(".messages__container")?.getBoundingClientRect().bottom;
    const containerTopMeasuredFromBottom = window.innerHeight - document.querySelector(".messages__container")?.getBoundingClientRect().top;

    const calculatedBottom = Math.min(
        Math.max(
            bottom,  /* max bottom position */
            containerBottomMeasuredFromBottom - 20
        ),  /* max top position */
        containerTopMeasuredFromBottom + 20
    );

    const calculatedOpacity = Math.min(
        Math.max(  /* bottom fading out */
            (calculatedBottom - containerBottomMeasuredFromBottom + 10)/10,
            0
        ),
        Math.max(  /* top fading out */
            (containerTopMeasuredFromBottom - calculatedBottom - 10)/10,
            0
        ),
        1
    );

    return (
        <div className="seenAvatarsPanel">
            <SeenAvatar
                bottom={calculatedBottom}
                opacity={calculatedOpacity}/>
        </div>
    );
}

export default SeenAvatarsPanel;