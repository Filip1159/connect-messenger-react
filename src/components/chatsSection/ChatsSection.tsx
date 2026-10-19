import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectActiveId, selectChats, setActive } from "../../store/chats/chatsSlice";
import { Search } from "./searchField/Search";
import { ChatItem } from "./chatItem/ChatItem";
import "./ChatsSection.scss";

export const ChatsSection = () => {
    const chats = useAppSelector(selectChats);
    const activeId = useAppSelector(selectActiveId);
    const dispatch = useAppDispatch();

    return (
        <div className="chatsSection">
            <Search />
            <div className="chatsSection__list">
                {chats.map(c => (
                    <ChatItem
                        chat={c}
                        modifier={c.id === activeId ? " chatItem--active" : ""}
                        onClick={() => dispatch(setActive(c.id))}
                        key={c.id}
                    />
                ))}
            </div>
        </div>
    );
}
