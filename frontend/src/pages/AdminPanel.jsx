import { useEffect, useState } from "react";
import { getUsers, getVideos, assignVideo } from "../api/admin";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [u, v] = await Promise.all([getUsers(), getVideos()]);
    setUsers(u.data);
    setVideos(v.data);
  };

  const handleAssign = async () => {
    if (!selectedVideo) return alert("Select video");

    await assignVideo({
      videoId: selectedVideo,
      userIds: selectedUsers,
    });

    alert("Assigned successfully");
  };

  return (
    <div className="page-wrap">
      <h1>Admin Panel</h1>

      <h3>Select Video</h3>
      <select onChange={(e) => setSelectedVideo(e.target.value)}>
        <option value="">Select</option>
        {videos.map((v) => (
          <option key={v._id} value={v._id}>
            {v.title}
          </option>
        ))}
      </select>

      <h3>Assign Users</h3>
      {users.map((u) => (
        <label key={u._id} style={{ display: "block" }}>
          <input
            type="checkbox"
            value={u._id}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedUsers((prev) => [...prev, u._id]);
              } else {
                setSelectedUsers((prev) =>
                  prev.filter((id) => id !== u._id)
                );
              }
            }}
          />
          {u.name} ({u.role})
        </label>
      ))}

      <button onClick={handleAssign}>Assign</button>
    </div>
  );
}