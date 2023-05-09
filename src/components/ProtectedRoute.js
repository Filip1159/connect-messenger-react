import React from "react";
import { Navigate } from "react-router-dom";
import ChatAPI from "../store/ChatAPI";

const ProtectedRoute = ({ children }) => {
    if (!ChatAPI.isSignedIn())
        return (<Navigate to="/login" />)

    return children
};

export default ProtectedRoute;