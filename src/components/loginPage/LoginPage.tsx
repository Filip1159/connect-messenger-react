import { useState } from "react";
import type { FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import "./LoginPage.scss";
import strings from "../../strings";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { selectAuthDetails, setDetails } from "../../store/auth/authSlice";
import ChatAPI from "../../store/ChatAPI";

const LoginPage = () => {
    const authDetails = useAppSelector(selectAuthDetails);
    const dispatch = useAppDispatch();
    const [ error, setError ] = useState<string | null>(null);
    const [ submitting, setSubmitting ] = useState(false);
    const [ username, setUsername ] = useState("");
    const [ password, setPassword ] = useState("");
    const navigate = useNavigate()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        const result = await ChatAPI.signIn(username, password);
        setSubmitting(false);
        if (result.success) {
            dispatch(setDetails(ChatAPI.getAuthDetails()));
            navigate("/");
        } else {
            setError(result.reason === "BAD_CREDENTIALS" ? strings.login.badCredentials : strings.login.unavailable);
        }
    };

    return (
        (authDetails ? 
            <Navigate to="/" /> :
            <>
                <div className="loginPage">
                    <span className="loginPage__title">
                        <span aria-hidden="true" style={{fontWeight: 700}}>&gt;&gt;&gt; </span> {strings.login.title}
                    </span>
                    <form className="loginPage__form" onSubmit={handleSubmit} >
                        <label htmlFor="login-username" className="loginPage__label">{strings.login.username}</label>
                        <input id="login-username" type="text" autoComplete="username" className="loginPage__input"
                               value={username} onChange={e => setUsername(e.target.value)}/>
                        <label htmlFor="login-password" className="loginPage__label">{strings.login.password}</label>
                        <input id="login-password" type="password" autoComplete="current-password" className="loginPage__input"
                               value={password} onChange={e => setPassword(e.target.value)}/>
                        <input type="submit" className="loginPage__input" disabled={submitting}
                               value={submitting ? strings.login.submitting : strings.login.submit} />
                        <Link to="/register" className="loginPage__link">{strings.register.noAccount} {strings.register.link}</Link>
                    </form>
                    {error && <span role="alert" className="loginPage__authFailed">{error}</span>}
                </div>
                <footer>
                    <b><span aria-hidden="true">&gt;&gt;&gt;</span> <i>{strings.appName}</i></b> - {strings.footer.tagline} | &copy; {strings.footer.company} {strings.footer.since}&ndash;{new Date().getFullYear()}
                </footer>
            </>
        )
    );
}

export default LoginPage;