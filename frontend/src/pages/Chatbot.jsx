import { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { sendChatMessage } from "../services/api";

function Chatbot() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages]         = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hello! I'm EcoSort AI, your personal recycling and waste management expert. Ask me anything about waste sorting, composting, decomposition times, or local recycling rules!",
    }
  ]);
  const [loading, setLoading]           = useState(false);
  const chatEndRef                      = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    const userMsg = { id: Date.now(), sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const res = await sendChatMessage(query);
      const botMsg = {
        id: Date.now() + 1,
        sender: "bot",
        text: res.reply,
        suggestions: res.suggestions,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        id: Date.now() + 1,
        sender: "bot",
        text: "Sorry, I had trouble connecting. Please check that the backend is running and try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          <div className="page-introduction">
            <span className="small-label">AI ASSISTANT</span>
            <h2>Ask EcoSort AI</h2>
            <p>
              Instant real-world AI answers for recycling guidelines, composting techniques, e-waste safety, and material decomposition.
            </p>
          </div>

          <div className="chat-container" style={{ minHeight: "500px", display: "flex", flexDirection: "column" }}>
            
            {/* MESSAGES LIST */}
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: "20px" }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "14px 18px",
                      borderRadius: msg.sender === "user" ? "18px 18px 2px 18px" : "18px 18px 18px 2px",
                      background: msg.sender === "user" ? "#31864a" : "#f4f8f4",
                      color: msg.sender === "user" ? "#ffffff" : "#173f2c",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}
                  >
                    {msg.sender === "bot" && (
                      <div style={{ fontSize: "11px", fontWeight: "bold", color: "#256e3b", marginBottom: "4px" }}>
                        🤖 EcoSort AI
                      </div>
                    )}

                    {msg.text}

                    {/* SUGGESTION CHIPS */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="suggestions" style={{ marginTop: "12px" }}>
                        {msg.suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSend(sug)}
                            style={{
                              border: "1px solid #c2dcc8",
                              background: "#ffffff",
                              color: "#256e3b",
                              borderRadius: "16px",
                              padding: "6px 12px",
                              fontSize: "11px",
                              cursor: "pointer",
                              fontWeight: "500",
                            }}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px" }}>
                  <div style={{ padding: "12px 18px", borderRadius: "18px", background: "#f4f8f4", color: "#666", fontSize: "13px" }}>
                    🤖 EcoSort AI is thinking...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* INPUT FORM */}
            <form className="chat-input" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Ask a recycling or waste management question..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading || !inputMessage.trim()}>
                {loading ? "..." : "Send"}
              </button>
            </form>

          </div>
        </section>
      </main>
    </div>
  );
}

export default Chatbot;