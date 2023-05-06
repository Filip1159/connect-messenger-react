import React from "react";
import { Route, Navigate } from "react-router-dom";
import ChatAPI from "../helpers/ChatAPI";

const ProtectedRoute = ({ children }) => {
    if (!ChatAPI.isSignedIn())
        return (<Navigate to="/login" />)

    return children
};

export default ProtectedRoute;