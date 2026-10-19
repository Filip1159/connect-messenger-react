import { useEffect } from "react";
import { useAppSelector } from "../hooks";
import { selectTotalUnread } from "./chatsSlice";
import strings from "../../strings";

/* "(3) CONNECT" in the browser tab while there are unread messages */
const useUnreadTitle = () => {
    const unread = useAppSelector(selectTotalUnread);

    useEffect(() => {
        document.title = unread > 0 ? `(${unread}) ${strings.appName}` : strings.appName;
        return () => { document.title = strings.appName; };
    }, [ unread ]);
}

export default useUnreadTitle;
