import { useAppSelector } from "../../store/hooks";
import { selectAnnouncement } from "../../store/ui/uiSlice";

/* screen readers read new messages out; it is not shown */
export const Announcer = () => {
    const announcement = useAppSelector(selectAnnouncement);
    return <div className="srOnly" role="log" aria-live="polite" aria-atomic="true">{announcement}</div>;
};
