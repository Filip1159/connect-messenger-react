import axios from "axios";

export const baseURL = "http://192.168.8.107:8080";

const api = axios.create({ baseURL });

export default api;