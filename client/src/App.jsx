import { useState, useRef, useEffect } from "react";
import axios from "axios";

const sessionId = localStorage.getItem("sid") || crypto.randomUUID();
localStorage.setItem("sid", sessionId);

function ProductCard({ product }) {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/summarize/${product.id}`
      );
      setSummary(data.summary);
    } catch {
      setSummary("Could not load review summary right now.");
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="border rounded-lg p-2 text-left text-sm bg-white shadow-sm">
      <p className="font-medium text-gray-800">{product.name}</p>
      <p className="text-green-700 font-semibold">Rs {product.price}</p>

      {!summary && (
        <button
          onClick={fetchSummary}
          disabled={loadingSummary}
          className="mt-1 text-xs text-blue-600 hover:underline disabled:text-gray-400"
        >
          {loadingSummary ? "Summarizing..." : "Summarize reviews"}
        </button>
      )}

      {summary && (
        <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-2">
          {summary}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/chat/${sessionId}`)
      .then((res) => setMessages(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input;
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post("http://localhost:5000/api/chat", {
        sessionId,
        message: userText,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, products: data.products },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-3 text-gray-800">🛍️ AI Shopping Assistant</h1>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm">
            Ask me things like "suggest a budget bluetooth headphone under 1500 rupees"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block px-4 py-2 rounded-2xl whitespace-pre-wrap max-w-[85%] text-sm ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              {m.content}
            </div>
            {m.products && m.products.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-2">
                {m.products.slice(0, 3).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <p className="text-gray-400 text-sm">Thinking...</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className="flex-1 border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask about a product..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded-xl hover:bg-blue-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}