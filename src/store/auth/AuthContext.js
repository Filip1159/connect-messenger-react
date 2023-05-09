import { createContext, useReducer } from "react";
import { authReducer } from "./AuthReducer";
import ChatAPI from "../ChatAPI";

export const AuthContext = createContext();

const AuthContextProvider = ({ children }) => {
    const [ authDetails, dispatch ] = useReducer(authReducer, null, () => {
        try {
            return ChatAPI.getAuthDetails();
        } catch (e) {
            return null;
        }
    });

    return (
        <AuthContext.Provider value={{authDetails, dispatch}}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContextProvider;