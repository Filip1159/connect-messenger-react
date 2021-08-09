import { useContext } from "react";
import { ChatContext } from "../contexts/ChatContext";
import Search from "./Search";
import ChatItem from "./ChatItem";
import "../styles/LeftPanel.scss";

const LeftPanel = () => {
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
        <div className="leftPanel">
            <div className="leftPanel__flipped">
                <Search roundedCorner={active === 0} />
                {renderedChats}
                <div
                    className="leftPanel__foo"
                    style={active === chats?.length - 1 ? {borderTopRightRadius: '20px'} : {}}
                />
            </div>
        </div>
    )
}

export default LeftPanel;