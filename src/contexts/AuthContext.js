import { createContext, useReducer } from "react";
import { authReducer } from "./AuthReducer";

export const AuthContext = createContext();

const AuthContextProvider = ({children}) => {
    const [ authDetails, dispatch ] = useReducer(authReducer);

    return (
        <AuthContext.Provider value={{authDetails, dispatch}}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContextProvider;