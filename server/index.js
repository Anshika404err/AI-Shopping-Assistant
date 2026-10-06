require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }), "products");

const chatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  messages: [
    {
      role: String,
      content: String,
      at: { type: Date, default: Date.now },
    },
  ],
});
const Chat = mongoose.model("Chat", chatSchema);

app.get("/", (req, res) => {
  res.json({ status: "Express API is running" });
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().limit(50);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/summarize/:productId", async (req, res) => {
  try {
    const { data } = await axios.get(
      `${process.env.RAG_URL}/summarize/${req.params.productId}`
    );
    res.json(data);
  } catch (err) {
    console.error("Summarize error:", err.message);
    res.status(500).json({ error: "Could not summarize reviews right now" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message are required" });
    }

    let chat = await Chat.findOne({ sessionId });
    if (!chat) chat = new Chat({ sessionId, messages: [] });

    const history = chat.messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

    const { data } = await axios.post(`${process.env.RAG_URL}/chat`, { message, history });

    chat.messages.push({ role: "user", content: message });
    chat.messages.push({ role: "assistant", content: data.answer });
    await chat.save();

    res.json(data);
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Assistant is currently unavailable" });
  }
});

app.get("/api/chat/:sessionId", async (req, res) => {
  try {
    const chat = await Chat.findOne({ sessionId: req.params.sessionId });
    res.json(chat?.messages || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Express API running on port ${PORT}`));