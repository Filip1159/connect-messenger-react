export const chatReducer = (state, action) => {
    switch (action.type) {
        case "ADD_MESSAGE": {
            const updatedMessages = [ ...state.chats[state.active].messages, action.newMessage ];
            const updatedChat = { ...state.chats[state.active], messages: updatedMessages };
            const updatedChats = [ ...state.chats ];
            updatedChats[state.active] = updatedChat;
            return { ...state, chats: updatedChats };
        }
        case "SET_CHATS":
            return { ...state, chats: action.newChats };
        case "SET_ACTIVE":
            return { ...state, active: action.newActive };
        case "UPDATE_STATUS": {
            const updatedStatus = [ ...state.chats[state.active].status ];
            updatedStatus[updatedStatus[0].id.userId === action.newStatus.id.userId ? 0 : 1] = action.newStatus;
            const updatedChat = { ...state.chats[state.active], status: updatedStatus };
            const updatedChats = [ ...state.chats ];
            updatedChats[state.active] = updatedChat;
            return { ...state, chats: updatedChats };
        }
        default:
            console.log(`No matching case for: ${action.type} inside chatReducer`);
            return state;
    };
}