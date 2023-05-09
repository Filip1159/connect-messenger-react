import { useContext } from "react";
import { ChatContext } from "../../store/chats/ChatContext";
import { Search } from "./searchField/Search";
import { ChatItem } from "./chatItem/ChatItem";
import "./ChatsSection.scss";

export const ChatsSection = () => {
    const { state: { chats, active }, dispatch } = useContext(ChatContext);

    const renderedChats = chats.map((c, i) => {
        let modifier = "";
        switch (i) {
            case active - 1:    modifier = " chatItem--beforeActive"; break;
            case active:        modifier = " chatItem--active"; break;
            case active + 1:    modifier = " chatItem--afterActive"; break;
            default:
        }
        return <ChatItem
                    chat={c}
                    modifier={modifier}
                    onClick={() => dispatch({ type: "SET_ACTIVE", newActive: i })}
                    key={i}
                />;
    });

    return (
        <div className="chatsSection">
            <div className="chatsSection__flipped">
                <Search roundedCorner={active === 0} />
                {renderedChats}
                <div
                    className="chatsSection__spacer"
                    style={active === chats?.length - 1 ? {borderTopRightRadius: '20px'} : {}}
                />
            </div>
        </div>
    )
}
