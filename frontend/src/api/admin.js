import api from "./axios";

export const getUsers = () => api.get("/admin/users");
export const getVideos = () => api.get("/admin/videos");
export const assignVideo = (data) => api.post("/admin/assign", data);