import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAuthDetails, setDetails } from "../../store/auth/authSlice";
import ChatAPI from "../../store/ChatAPI";
import strings from "../../strings";
import { validateName, validatePassword, validateUsername } from "./registerValidation";
import "../loginPage/LoginPage.scss";

const RegisterPage = () => {
    const authDetails = useAppSelector(selectAuthDetails);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [ username, setUsername ] = useState("");
    const [ name, setName ] = useState("");
    const [ surname, setSurname ] = useState("");
    const [ password, setPassword ] = useState("");
    const [ repeat, setRepeat ] = useState("");
    const [ touched, setTouched ] = useState(false);
    const [ submitting, setSubmitting ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    if (authDetails) return <Navigate to="/" />;

    const problems = {
        username: validateUsername(username) ? "" : strings.register.usernameRule,
        name: validateName(name) ? "" : strings.register.nameRule,
        surname: validateName(surname) ? "" : strings.register.nameRule,
        password: validatePassword(password) ? "" : strings.register.passwordRule,
        repeat: repeat === password ? "" : strings.register.passwordsDiffer
    };
    const valid = Object.values(problems).every(p => p === "");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (submitting || !valid) return;
        setSubmitting(true);
        setError(null);
        try {
            await ChatAPI.register({ username: username.trim(), name: name.trim(), surname: surname.trim(), password });
            const result = await ChatAPI.signIn(username.trim(), password);
            if (!result.success) throw new Error("The new account could not sign in");
            dispatch(setDetails(ChatAPI.getAuthDetails()));
            navigate("/");
        } catch (err) {
            console.error("Registration failed:", err);
            setError(axios.isAxiosError(err) && err.response?.status === 409 ? strings.register.taken : strings.register.failed);
            setSubmitting(false);
        }
    };

    const field = (id: string, label: string, value: string, set: (v: string) => void, problem: string,
                   props: { type?: string; autoComplete: string; maxLength?: number }) => (
        <>
            <label htmlFor={id} className="loginPage__label">{label}</label>
            <input id={id} type={props.type ?? "text"} autoComplete={props.autoComplete} maxLength={props.maxLength}
                   className="loginPage__input" value={value} onChange={e => set(e.target.value)}
                   aria-invalid={touched && !!problem} aria-describedby={touched && problem ? `${id}-problem` : undefined} />
            {touched && problem && <span id={`${id}-problem`} className="loginPage__problem">{problem}</span>}
        </>
    );

    return (
        <>
            <div className="loginPage">
                <span className="loginPage__title">
                    <span aria-hidden="true" style={{fontWeight: 700}}>&gt;&gt;&gt; </span> {strings.register.title}
                </span>
                <form className="loginPage__form" onSubmit={handleSubmit} noValidate>
                    {field("register-username", strings.register.username, username, setUsername, problems.username, { autoComplete: "username", maxLength: 30 })}
                    {field("register-name", strings.register.name, name, setName, problems.name, { autoComplete: "given-name", maxLength: 50 })}
                    {field("register-surname", strings.register.surname, surname, setSurname, problems.surname, { autoComplete: "family-name", maxLength: 50 })}
                    {field("register-password", strings.register.password, password, setPassword, problems.password, { type: "password", autoComplete: "new-password", maxLength: 72 })}
                    {field("register-repeat", strings.register.repeatPassword, repeat, setRepeat, problems.repeat, { type: "password", autoComplete: "new-password", maxLength: 72 })}
                    <input type="submit" className="loginPage__input" disabled={submitting}
                           value={submitting ? strings.register.submitting : strings.register.submit} />
                    <Link to="/login" className="loginPage__link">{strings.register.haveAccount}</Link>
                </form>
                {error && <span role="alert" className="loginPage__authFailed">{error}</span>}
            </div>
            <footer>
                <b><span aria-hidden="true">&gt;&gt;&gt;</span> <i>{strings.appName}</i></b> - {strings.footer.tagline} | &copy; {strings.footer.company} {strings.footer.since}&ndash;{new Date().getFullYear()}
            </footer>
        </>
    );
};

export default RegisterPage;
