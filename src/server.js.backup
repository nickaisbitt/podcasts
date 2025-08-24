const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

app.post("/test/generate-episode", async (req, res) => {
  const { topic, episodeType } = req.body;
  const mockEpisode = { topic, episodeType, title: `CPTSD Recovery: ${topic}`, generatedAt: new Date().toISOString() };
  res.json({ success: true, data: mockEpisode });
});

app.get("/", (req, res) => {
  res.json({ message: "CPTSD Podcast Generator", status: "healthy", endpoints: { health: "/health", generateEpisode: "POST /test/generate-episode" } });
});
