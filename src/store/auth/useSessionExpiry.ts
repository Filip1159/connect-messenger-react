import { useEffect } from "react";
import { useAppSelector } from "../hooks";
import ChatAPI from "../ChatAPI";
import { selectAuthDetails } from "./authSlice";

const MAX_TIMEOUT = 2 ** 31 - 1;

/* signs out when the token expires while the app is open */
const useSessionExpiry = () => {
    const authDetails = useAppSelector(selectAuthDetails);

    useEffect(() => {
        if (!authDetails) return;
        const timer = setTimeout(
            () => ChatAPI.signOut(),
            Math.min(Math.max(authDetails.exp * 1000 - Date.now(), 0), MAX_TIMEOUT)
        );
        return () => clearTimeout(timer);
    }, [ authDetails ]);
}

export default useSessionExpiry;
