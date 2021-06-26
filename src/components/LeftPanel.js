import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ConversationContext } from "../contexts/ConversationContext";
import "./LeftPanel.css"
import Search from "./Search";

const LeftPanel = () => {
    const { state: { conversations, active }, dispatch } = useContext(ConversationContext);

    return (
        <div className="leftPanel">
            <Search roundedCorner={active === 0}/>{
                conversations.map((c, i) => {
                    let className = "leftPanel__convItem";
                    switch (i) {
                        case active - 1: className += " beforeActive"; break;
                        case active: className += " active"; break;
                        case active + 1: className += " afterActive"; break;
                        default: // nothing to do
                    }
                    return <Conversation
                                conversation={c}
                                className={className}
                                onClick={() => dispatch({ type: "SET_ACTIVE", newActive: i })}
                                key={i}
                            />;
                })
            }
            <div
                className="leftPanel__foo"
                style={active === conversations?.length - 1 ? {borderTopRightRadius: '20px'} : {}}
            />
        </div>
    )
}

const Conversation = ({conversation, className, onClick }) => {
    const { authDetails: { userId } } = useContext(AuthContext);
    const lastMessage = conversation?.messages[conversation.messages.length - 1].content;
    const user = conversation?.users[conversation.users[0].userId !== userId ? 0 : 1];

    return (
        <div className={className} id={`conv-id-${conversation.conversationId}`} onClick={onClick}>
            <img
                className="leftPanel__avatarImage"
                src={`./images/avatars/${user.username}.png`}
                alt="User avatar"
            />
            <div style={{display: "flex", flexDirection: "column"}}>
                <span className="leftPanel__nameSurname">{`${user.name} ${user.surname}`}</span>
                <span className="leftPanel__lastMessage">{
                    `${conversation.messages[0].userId === user.userId ? user.name : "Ty"}: ${lastMessage.substring(0, 35)}${lastMessage.length > 35 ? "..." : ""}`
                }</span>
            </div>
        </div>
    );
}

export default LeftPanel;