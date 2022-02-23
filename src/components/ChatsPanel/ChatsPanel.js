import { useContext } from "react";
import { ChatContext } from "../../contexts/ChatContext";
import Search from "./Search";
import ChatItem from "./ChatItem";
import "../../styles/ChatsPanel/ChatsPanel.scss";
import ChatsPanelFilling from "./ChatsPanelFilling";

const ChatsPanel = () => {
    const { state: { chats } } = useContext(ChatContext);

    const renderedChats = chats.map((chat, i) => <ChatItem id={chat.id} number={i} key={i}/>);

    return (
        <div className="chatsPanel">
            <div className="chatsPanel__flipped">
                <Search/>
                {renderedChats}
                <ChatsPanelFilling/>
            </div>
        </div>
    )
}

export default ChatsPanel;