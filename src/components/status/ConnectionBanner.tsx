import { useEffect, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { selectConnection } from "../../store/ui/uiSlice";
import strings from "../../strings";
import "./ConnectionBanner.scss";

/* a first connection that takes longer than this is worth a word; a quick one is not */
const CONNECTING_DELAY = 3000;

/* tells when the app can't reach the server: the browser is offline, or the websocket dropped and is retrying */
export const ConnectionBanner = () => {
    const connection = useAppSelector(selectConnection);
    const [ online, setOnline ] = useState(navigator.onLine);
    const [ slow, setSlow ] = useState(false);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    useEffect(() => {
        if (connection !== "connecting") return;
        const timer = setTimeout(() => setSlow(true), CONNECTING_DELAY);
        return () => {
            clearTimeout(timer);
            setSlow(false);
        };
    }, [ connection ]);

    let text = "";
    if (!online) text = strings.connection.offline;
    else if (connection === "reconnecting") text = strings.connection.reconnecting;
    else if (connection === "connecting" && slow) text = strings.connection.connecting;

    // the region stays in the page, so that a screen reader announces the text when it appears
    return (
        <div role="status" className={`connectionBanner${text ? " connectionBanner--visible" : ""}${online ? "" : " connectionBanner--offline"}`}>
            {text}
        </div>
    );
};
