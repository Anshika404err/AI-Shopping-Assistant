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
    <div className="relative bg-paper border border-ink/15 border-l-2 border-l-marigold rounded-sm pl-4 pr-3 py-3 text-left">
      <p className="font-sans text-[13px] text-ink font-medium leading-snug">
        {product.name}
      </p>
      <p className="font-display text-xl text-marigold-dark mt-1">
        ₹{product.price}
      </p>

      {!summary && (
        <button
          onClick={fetchSummary}
          disabled={loadingSummary}
          className="mt-2 font-sans text-xs text-sage font-medium hover:text-ink transition-colors disabled:text-slate/50"
        >
          {loadingSummary ? "Summarizing…" : "Summarize reviews →"}
        </button>
      )}

      {summary && (
        <div className="mt-3 pt-3 border-t border-dashed border-ink/20 text-xs text-slate whitespace-pre-wrap leading-relaxed">
          {summary}
        </div>
      )}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-marigold flex items-center justify-center shrink-0 mt-0.5">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#16213E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center px-1">
      <span
        className="w-1.5 h-1.5 rounded-full bg-marigold pulse-dot"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-marigold pulse-dot"
        style={{ animationDelay: "160ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-marigold pulse-dot"
        style={{ animationDelay: "320ms" }}
      />
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
  }, [messages, loading]);

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
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-paper">
      {/* Header */}
      <header className="border-b border-ink/15 px-5 py-4 flex items-baseline gap-2.5">
        <h1 className="font-display italic text-2xl text-ink">Bazaar</h1>
        <span className="font-sans text-xs text-slate tracking-wide">
          AI shopping assistant
        </span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 max-w-2xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-slate text-sm font-sans py-8 text-center">
            <p className="font-display italic text-lg text-ink mb-1">
              What are you shopping for?
            </p>
            <p>Try "suggest a budget bluetooth headphone under 1500 rupees"</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "flex justify-end"
                : "flex justify-start gap-2"
            }
          >
            {m.role === "assistant" && <AssistantAvatar />}
            <div className="max-w-[85%]">
              <div
                className={`font-sans text-sm leading-relaxed whitespace-pre-wrap px-4 py-2.5 ${
                  m.role === "user"
                    ? "bg-ink text-paper rounded-xl rounded-br-sm"
                    : "bg-white text-ink border border-ink/10 rounded-xl rounded-bl-sm"
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
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2">
            <AssistantAvatar />
            <div className="bg-white border border-ink/10 rounded-xl rounded-bl-sm px-4 py-3">
              <ThinkingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-ink/15 px-5 py-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            className="flex-1 font-sans text-sm bg-white border border-ink/20 rounded-full px-4 py-2.5 outline-none focus:border-marigold transition-colors placeholder:text-slate/60"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about a product…"
          />
          <button
            onClick={sendMessage}
            className="font-sans text-sm font-medium bg-marigold text-ink px-5 py-2.5 rounded-full hover:bg-marigold-dark hover:text-paper transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}