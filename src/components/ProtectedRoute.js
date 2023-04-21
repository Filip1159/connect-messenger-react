import React from "react";
import { Redirect, Route } from "react-router-dom";
import ChatAPI from "../helpers/ChatAPI";

const ProtectedRoute = ({ children, ...restOfProps }) => {
    return (
        <Route {...restOfProps}>
            {
                ChatAPI.isSignedIn() ?
                children : 
                <Redirect to="/login" />
            }
        </Route>
    );
};

export default ProtectedRoute;