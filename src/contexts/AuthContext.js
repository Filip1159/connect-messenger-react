import { createContext, useReducer } from "react";
import { authReducer } from "./AuthReducer";
import jwt_decode from "jwt-decode";

export const AuthContext = createContext();

const AuthContextProvider = ({ children }) => {
    const [ authDetails, dispatch ] = useReducer(authReducer, [], () => {
        const token = localStorage.getItem("token");
        if (!token) return null;
        const decodedToken = jwt_decode(token);
        const authDetails = { ...decodedToken };
        return authDetails;
    });

    return (
        <AuthContext.Provider value={{authDetails, dispatch}}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContextProvider;