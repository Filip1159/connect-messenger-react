/* the same rules as the backend (AccountService), so mistakes show up before the request */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;

export const validateUsername = (username: string): boolean => USERNAME_PATTERN.test(username.trim());

export const validateName = (name: string): boolean => name.trim().length >= 1 && name.trim().length <= 50;

/* 8-72 characters, with a letter and a digit */
export const validatePassword = (password: string): boolean =>
    password.length >= 8 && password.length <= 72 && /\p{L}/u.test(password) && /\d/.test(password);
