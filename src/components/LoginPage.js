import React, { useContext, useState } from "react";
import "./LoginPage.css";
import { useHistory } from "react-router-dom";
import jwt_decode from "jwt-decode";
import { AuthContext } from "../contexts/AuthContext";

const LoginPage = () => {
    const { dispatch } = useContext(AuthContext);
    const [ authFailed, setAuthFailed ] = useState(false);
    const [ username, setUsername ] = useState("");
    const [ password, setPassword ] = useState("");
    const history = useHistory();

    const handleSubmit = async e => {
        e.preventDefault();
        const message = { username, password };
        const res = await fetch("http://localhost:8080/login", {
            method: "POST",
            headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(message)
        });

        if (res.status === 200) {
            const token = res.headers.get("Authentication");
            localStorage.setItem("token", token);
            const decodedToken = jwt_decode(token);

            dispatch({ type: "SET_DETAILS", newDetails: { 
                username: decodedToken.sub,
                name: decodedToken.name,
                surname: decodedToken.surname,
                userId: decodedToken.userId
            } });
            history.push("/");
        } else setAuthFailed(true);
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
                    {authFailed && <span>Nieprawidłowa nazwa użytkownika lub hasło</span>}
                </form>
                <div className="loginPage__description">
                    &rarr; Pozostawaj w kontakcie ze wszystkimi<br/><br/>
                    wygodniej niż kiedykolwiek.<br/><br/>
                    &rarr; Wypróbuj aplikację<br/><br/>
                    zbudowaną z użyciem najnowszych technologii.
                </div>
            </div>
            <footer>SpringChat &copy; 2021 | Losowy tekst na stopce</footer>
        </>
    );
}

export default LoginPage;