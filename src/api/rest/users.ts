import type { User } from "../../types";
import { http } from "../http";

export async function searchUsersByQuery(query: string, signal?: AbortSignal): Promise<User[]> {
    const res = await http.get(`/user/${encodeURIComponent(query)}`, { signal });
    return res.data;
}

/* creates the account; the caller signs in afterwards */
export async function register(account: { username: string; name: string; surname: string; password: string }): Promise<User> {
    const res = await http.post("/users", account);
    return res.data;
}

export async function loadProfile(): Promise<User> {
    const res = await http.get("/users/me");
    return res.data;
}

export async function updateProfile(name: string, surname: string): Promise<User> {
    const res = await http.patch("/users/me", { name, surname });
    return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.put("/users/me/password", { currentPassword, newPassword });
}

export async function uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await http.put("/users/me/avatar", formData);
    return res.data;
}

export async function removeAvatar(): Promise<User> {
    const res = await http.delete("/users/me/avatar");
    return res.data;
}

export async function loadAvatar(userId: number, signal?: AbortSignal): Promise<Blob> {
    const res = await http.get(`/users/${userId}/avatar`, { responseType: "blob", signal });
    return res.data;
}

export async function loadBlocked(): Promise<User[]> {
    const res = await http.get("/users/blocked");
    return res.data;
}

export async function blockUser(userId: number): Promise<void> {
    await http.put(`/users/${userId}/block`);
}

export async function unblockUser(userId: number): Promise<void> {
    await http.delete(`/users/${userId}/block`);
}
