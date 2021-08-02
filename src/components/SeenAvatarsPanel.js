import React from "react";
import SeenAvatar from "./SeenAvatar";
import "../styles/SeenAvatarsPanel.scss";

const SeenAvatarsPanel = ({ bottom }) => {

    return (
        <div className="seenAvatarsPanel">
            <SeenAvatar
                bottom={          /* DON'T TOUCH! */ 
                    Math.min(
                        Math.max(
                            bottom,
                            window.innerHeight - document.querySelector(".seenAvatarsPanel")?.getBoundingClientRect().bottom - 20
                        ),
                        window.innerHeight - document.querySelector(".seenAvatarsPanel")?.getBoundingClientRect().top - 20
                    )
                }
                opacity={
                    Math.min(
                        Math.max(
                            (bottom - window.innerHeight + document.querySelector(".seenAvatarsPanel")?.getBoundingClientRect().bottom)/10,
                            0
                        ),
                        Math.max(
                            (window.innerHeight - document.querySelector(".seenAvatarsPanel")?.getBoundingClientRect().top - bottom - 20)/10,
                            0
                        ),
                        1
                    )
                }
            />
        </div>
    );
}

export default SeenAvatarsPanel;