import React, { useContext, useState } from "react";
import "../styles/LoginPage.scss";
import { useHistory } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import ChatAPI from "../helpers/ChatAPI";

const LoginPage = () => {
    const { dispatch } = useContext(AuthContext);
    const [ authFailed, setAuthFailed ] = useState(false);
    const [ username, setUsername ] = useState("");
    const [ password, setPassword ] = useState("");
    const history = useHistory();

    const handleSubmit = async e => {
        e.preventDefault();
        if (await ChatAPI.signIn(username, password)) {
            dispatch({ type: "SET_DETAILS", newDetails: ChatAPI.getAuthDetails() });
            history.push("/");
        }
        else {
            setAuthFailed(true);
        }
    };

    return (
        <>
            <div className="loginPage">
                <form className="loginPage__form" onSubmit={handleSubmit} >
                    <label className="loginPage__label">Nazwa użytkownika:</label>
                    <input type="text" className="loginPage__input" onInput={e => setUsername(e.target.value)}/>
                    <label className="loginPage__label">Hasło:</label>
                    <input type="password" className="loginPage__input" onInput={e => setPassword(e.target.value)}/>
                    <input type="submit" className="loginPage__input" value="Zaloguj się" />
                </form>
                {authFailed && <span>Authentication failed</span>}
            </div>
            <footer>SpringChat &copy; 2021 | Losowy tekst na stopce</footer>
        </>
    );
}

export default LoginPage;