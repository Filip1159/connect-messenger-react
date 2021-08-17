import React, { useContext, useState } from "react";
import "../styles/LoginPage.scss";
import { useHistory, Redirect } from "react-router-dom";
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
        const succeded = await ChatAPI.signIn(username, password);
        if (succeded) {
            dispatch({ type: "SET_DETAILS", newDetails: ChatAPI.getAuthDetails() });
            history.push("/");
        } else {
            console.log("Auth failed");
            setAuthFailed(true);
        }
    };

    return (
        (ChatAPI.isSignedIn() ? 
            <Redirect to="/" /> : 
            <>
                <div className="loginPage">
                    <span className="loginPage__title">
                        <span aria-hidden="true" style={{fontWeight: 700}}>&gt;&gt;&gt; </span> restore your CONNECTion
                    </span>
                    <form className="loginPage__form" onSubmit={handleSubmit} >
                        <label className="loginPage__label">your username:</label>
                        <input type="text" className="loginPage__input" onInput={e => setUsername(e.target.value)}/>
                        <label className="loginPage__label">password:</label>
                        <input type="password" className="loginPage__input" onInput={e => setPassword(e.target.value)}/>
                        <input type="submit" className="loginPage__input" value="sign in" />
                    </form>
                    {authFailed && <span className="loginPage__authFailed">Bad credentials! Try again</span>}
                </div>
                <footer><b><span aria-hidden="true">&gt;&gt;&gt;</span> <i>CONNECT</i></b> - free text messenger | &copy; CONNECT Inc. 2021</footer>
            </>
        )
    );
}

export default LoginPage;