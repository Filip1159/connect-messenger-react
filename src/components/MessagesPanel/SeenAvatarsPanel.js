import React from "react";
import SeenAvatar, { AVATAR_HEIGHT } from "./SeenAvatar";
import {calculateOpacity, fixBottom} from "../../helpers/seenAvatarUtils";

const SeenAvatarsPanel = ({ bottom }) => {
    const fixedBottom = fixBottom(bottom);
    const opacity = calculateOpacity(bottom);

    return <div className="seenAvatarsPanel">
            <SeenAvatar bottom={fixedBottom} opacity={opacity}/>
        </div>
}

export default SeenAvatarsPanel;