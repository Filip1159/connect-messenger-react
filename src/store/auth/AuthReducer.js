export const authReducer = (state, action) => {
    switch (action.type) {
        case "SET_DETAILS":
            return action.newDetails;
        case "RESET_DETAILS":
            return null;
        default:
            return state;
    }
}