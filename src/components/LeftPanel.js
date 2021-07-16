import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ChatContext } from "../contexts/ChatContext";
import "./LeftPanel.css"
import Search from "./Search";

const LeftPanel = () => {
    const { state: { chats, active }, dispatch } = useContext(ChatContext);

    return (
        <div className="leftPanel">
            <div className="leftPanel__flipped">
                <Search roundedCorner={active === 0}/>
                {
                    chats.map((c, i) => {
                        let extraClasses = "";
                        switch (i) {
                            case active - 1: extraClasses += " beforeActive"; break;
                            case active: extraClasses += " active"; break;
                            case active + 1: extraClasses += " afterActive"; break;
                            default: // nothing to do
                        }
                        return <Chat
                                    chat={c}
                                    className={`leftPanel__chatItem${extraClasses}`}
                                    onClick={() => dispatch({ type: "SET_ACTIVE", newActive: i })}
                                    key={i}
                                />;
                    })
                }
                <div
                    className="leftPanel__foo"
                    style={active === chats?.length - 1 ? {borderTopRightRadius: '20px'} : {}}
                />
            </div>
        </div>
    )
}

const Chat = ({chat, className, onClick }) => {
    const { authDetails: { userId } } = useContext(AuthContext);
    const lastMessage = chat?.messages[chat?.messages?.length - 1]?.content;
    const user = chat?.users[chat.users[0].userId !== userId ? 0 : 1];

    return (
        <div className={className} id={`conv-id-${chat.id}`} onClick={onClick}>
            <img
                className="leftPanel__avatarImage"
                src={`./images/avatars/${user.username}.png`}
                alt="User avatar"
            />
            <div style={{display: "flex", flexDirection: "column"}}>
                <span className="leftPanel__nameSurname">{`${user.name} ${user.surname}`}</span>
                <span className="leftPanel__lastMessage">{
                    `${chat?.messages[0]?.userId === user?.userId ? user?.name : "Ty"}: ${lastMessage?.substring(0, 35)}${lastMessage?.length > 35 ? "..." : ""}`
                }</span>
            </div>
        </div>
    );
}

export default LeftPanel;