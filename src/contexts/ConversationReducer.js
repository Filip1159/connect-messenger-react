export const conversationReducer = (state, action) => {
    switch (action.type) {
        case "ADD_MESSAGE":
            const newMessages = [ ...state.conversations[state.active].messages, action.newMessage ];
            const newConversation = { ...state.conversations[state.active], messages: newMessages };
            const newConversations = [ ...state.conversations ];
            newConversations[state.active] = newConversation;
            return { ...state, conversations: newConversations };
        case "SET_CONVERSATIONS":
            return { ...state, conversations: action.conversations };
        case "SET_ACTIVE":
            return { ...state, active: action.newActive };
        default:
            return state;
    };
}