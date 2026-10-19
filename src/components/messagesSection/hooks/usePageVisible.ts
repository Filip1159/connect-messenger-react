import { useEffect, useState } from "react";

const usePageVisible = () => {
    const [ visible, setVisible ] = useState(!document.hidden);

    useEffect(() => {
        const handler = () => setVisible(!document.hidden);
        document.addEventListener("visibilitychange", handler);
        return () => document.removeEventListener("visibilitychange", handler);
    }, []);

    return visible;
}

export default usePageVisible;
