import SeenAvatar from "./SeenAvatar";

/* bottom - viewport position of the bottom of the last message seen by the recipient,
 * bounds - viewport position of the messages container, viewportHeight - window.innerHeight */
export interface Bounds {
    top: number;
    bottom: number;
}

interface SeenAvatarsPanelProps {
    bottom: number | null;
    bounds: Bounds | null;
    viewportHeight: number;
}

const SeenAvatarsPanel = ({ bottom, bounds, viewportHeight }: SeenAvatarsPanelProps) => {
    if (bottom === null || !bounds) return null;

    const bottomFromBottom = viewportHeight - bottom;
    const containerBottomMeasuredFromBottom = viewportHeight - bounds.bottom;
    const containerTopMeasuredFromBottom = viewportHeight - bounds.top;

    const calculatedBottom = Math.min(
        Math.max(
            bottomFromBottom,  /* max bottom position */
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
