import { createContext, useReducer } from "react";
import { chatReducer } from "./ChatReducer";

export const ChatContext = createContext();

const ChatContextProvider = ({ children }) => {
    const [ state, dispatch ] = useReducer(chatReducer, { chats: [], active: 0 });

    return (
        <ChatContext.Provider value={{state, dispatch}}>
            {children}
        </ChatContext.Provider>
    );
}

export default ChatContextProvider;