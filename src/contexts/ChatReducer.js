export const chatReducer = (state, action) => {
    switch (action.type) {
        case "ADD_MESSAGE": {
            const target = state.chats.reduce((total, c, i) => {
                if (c.id === action.newMessage.chatId)
                    return i;
                else return total;
            }, -1);
            if (target === -1) return state;
            console.log("target = " + target);
            const updatedMessages = [ ...state.chats[target].messages, action.newMessage ];
            const updatedChat = { ...state.chats[target], messages: updatedMessages };
            const updatedChats = [ ...state.chats ];
            updatedChats[target] = updatedChat;
            return { ...state, chats: updatedChats };
        }
        case "SET_CHATS":
            console.log("SET_CHATS inside ChatReducer");
            return { ...state, chats: action.newChats };
        case "SET_ACTIVE":
            return { ...state, active: action.newActive };
        case "UPDATE_STATUS": {
            const target = state.chats.reduce((total, c, i) => {
                if (c.id === action.newStatus.id.chatId)
                    return i;
                else return total;
            }, -1);
            console.log("target = " + target);
            if (target === -1) return state;
            const updatedStatus = [ ...state.chats[target].status ];
            updatedStatus[updatedStatus[0].id.userId === action.newStatus.id.userId ? 0 : 1] = action.newStatus;
            const updatedChat = { ...state.chats[target], status: updatedStatus };
            const updatedChats = [ ...state.chats ];
            updatedChats[target] = updatedChat;
            return { ...state, chats: updatedChats };
        }
        default:
            console.log(`No matching case for: ${action.type} inside chatReducer`);
            return state;
    };
}