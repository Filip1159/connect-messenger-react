import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { selectAuthDetails } from "../store/auth/authSlice";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const authDetails = useAppSelector(selectAuthDetails);

    if (!authDetails)
        return (<Navigate to="/login" />)

    return children
};

export default ProtectedRoute;
