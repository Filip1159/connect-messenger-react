import { useId, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faSearch } from "@fortawesome/free-solid-svg-icons";
import strings from "../../strings";
import type { User } from "../../types";
import Avatar from "./Avatar";
import { useUserSearch } from "./useUserSearch";
import "./UserPicker.scss";

/* search people and tick the ones to choose; the chosen ones are listed below the search */
export const UserPicker = ({ selected, excludeIds = [], onToggle }: {
    selected: User[];
    excludeIds?: number[];
    onToggle: (user: User) => void;
}) => {
    const inputId = useId();
    const [ text, setText ] = useState("");
    const { users, searching, failed, query } = useUserSearch(text);
    const results = users.filter(u => !excludeIds.includes(u.id));

    return (
        <div className="userPicker">
            <label htmlFor={inputId} className="srOnly">{strings.group.searchPeople}</label>
            <div className="userPicker__field">
                <FontAwesomeIcon icon={faSearch} className="userPicker__icon" />
                <input id={inputId} type="text" autoComplete="off" placeholder={strings.group.searchPeople}
                       value={text} onChange={e => setText(e.target.value)} />
            </div>
            {selected.length > 0 &&
                <ul className="userPicker__selected" aria-label={strings.group.selected}>
                    {selected.map(u => (
                        <li key={u.id}>
                            <span>{u.name} {u.surname}</span>
                            <button type="button" aria-label={`${strings.group.remove} ${u.name} ${u.surname}`} onClick={() => onToggle(u)}>×</button>
                        </li>
                    ))}
                </ul>}
            {query !== "" && !searching &&
                (results.length > 0
                    ? <ul className="userPicker__results">
                        {results.map(u => {
                            const chosen = selected.some(s => s.id === u.id);
                            return (
                                <li key={u.id}>
                                    <button type="button" aria-pressed={chosen} onClick={() => onToggle(u)}>
                                        <Avatar user={u} alt="" className="userPicker__avatar" />
                                        <span className="userPicker__name">{u.name} {u.surname}</span>
                                        {chosen && <FontAwesomeIcon icon={faCheck} className="userPicker__check" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    : <p role={failed ? "alert" : "status"} className="userPicker__empty">{failed ? strings.search.failed : strings.group.noPeople}</p>)}
        </div>
    );
};
