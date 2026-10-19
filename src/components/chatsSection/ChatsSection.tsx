import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectActiveId, selectChats, setActive } from "../../store/chats/chatsSlice";
import { Search } from "./searchField/Search";
import { ChatItem } from "./chatItem/ChatItem";
import "./ChatsSection.scss";

export const ChatsSection = () => {
    const chats = useAppSelector(selectChats);
    const activeId = useAppSelector(selectActiveId);
    const dispatch = useAppDispatch();
    const active = chats.findIndex(c => c.id === activeId);

    const renderedChats = chats.map((c, i) => {
        let modifier = "";
        if (active !== -1) {
            switch (i) {
                case active - 1:    modifier = " chatItem--beforeActive"; break;
                case active:        modifier = " chatItem--active"; break;
                case active + 1:    modifier = " chatItem--afterActive"; break;
                default:
            }
        }
        return <ChatItem
                    chat={c}
                    modifier={modifier}
                    onClick={() => dispatch(setActive(c.id))}
                    key={c.id}
                />;
    });

    return (
        <div className="chatsSection">
            <div className="chatsSection__flipped">
                <Search roundedCorner={active === 0} />
                {renderedChats}
                <div
                    className="chatsSection__spacer"
                    style={active === chats.length - 1 ? {borderTopRightRadius: '20px'} : {}}
                />
            </div>
        </div>
    )
}
