import { createContext, useReducer } from "react";
import { conversationReducer } from "./ConversationReducer";

export const ConversationContext = createContext();

const ConversationContextProvider = ({children}) => {
    const [ state, dispatch ] = useReducer(conversationReducer, { conversations: [], active: 0 });

    return (
        <ConversationContext.Provider value={{state, dispatch}}>
            {children}
        </ConversationContext.Provider>
    );
}

export default ConversationContextProvider;