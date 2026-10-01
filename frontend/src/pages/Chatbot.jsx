import { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { sendChatMessage, detectUserLocation } from "../services/api";

function Chatbot() {
  const [inputMessage, setInputMessage]   = useState("");
  const [autoSpeak, setAutoSpeak]         = useState(false);
  const [userLocation, setUserLocation]   = useState(null);
  const [isListening, setIsListening]     = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [loading, setLoading]             = useState(false);

  const [messages, setMessages]           = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hello! I'm EcoSort AI, your personal real-time recycling & environmental assistant. Ask me anything by typing or speaking through your microphone! Click '🔊 Auto Voice: OFF' or '🔊 Listen' on any message to enable text-to-speech audio playback.",
      realtime_used: false,
    }
  ]);

  const chatEndRef     = useRef(null);
  const recognitionRef = useRef(null);

  // Stop speech playback whenever user leaves page or unmounts component
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Detect location on mount
  useEffect(() => {
    async function loadLoc() {
      const loc = await detectUserLocation();
      setUserLocation(loc);
    }
    loadLoc();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isListening, speakingMsgId]);

  // Hands-free Speech Recognition
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in your browser. Please try Google Chrome or MS Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = "";
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }

        setInputMessage(transcript);

        // Hands-free auto send when user finishes sentence
        if (isFinal && transcript.trim()) {
          setIsListening(false);
          handleSend(transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Mic initialization error:", e);
      setIsListening(false);
    }
  };

  // Text-to-Speech (TTS output)
  const speakText = (msgId, text) => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-Speech is not supported in this browser.");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_•`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    const userMsg = { id: Date.now(), sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const res = await sendChatMessage(query, userLocation || {});
      const botMsgId = Date.now() + 1;
      const botMsg = {
        id: botMsgId,
        sender: "bot",
        text: res.reply,
        realtime_used: res.realtime_used,
        source: res.source,
        suggestions: res.suggestions,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Auto-speak response if Auto Voice Mode is active
      if (autoSpeak) {
        setTimeout(() => speakText(botMsgId, res.reply), 200);
      }
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

  const quickPrompts = [
    { label: "🎙️ Talk to EcoSort", action: () => toggleListening() },
    { label: `🌤️ Air Quality in ${userLocation?.city || "my city"}`, text: `What is the Air Quality AQI in ${userLocation?.city || "my city"} today?` },
    { label: "🥤 How to recycle plastic bottles?", text: "How do I recycle plastic bottles?" },
    { label: "🍕 Is pizza box recyclable?", text: "Is a grease-stained pizza box recyclable or compostable?" },
    { label: "🔋 Where to drop batteries?", text: "Where can I dispose of hazardous lithium batteries?" },
  ];

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <section className="page-content">
          {/* HEADER & VOICE CONTROLS */}
          <div className="page-introduction">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="small-label">CONVERSATIONAL VOICE &amp; REAL-TIME AI</span>
                <h2>EcoSort Voice Assistant</h2>
                <p>
                  Hands-free conversational AI. Speak through your microphone, receive instant voice answers, and explore real-time local recycling rules.
                </p>
              </div>

              {/* ACTION TOGGLES BAR */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                {/* AUTO SPEAK TOGGLE */}
                <button
                  type="button"
                  onClick={() => {
                    if (speakingMsgId) window.speechSynthesis.cancel();
                    setAutoSpeak(!autoSpeak);
                  }}
                  style={{
                    background: autoSpeak ? "#e8f5e9" : "#f5f5f5",
                    border: autoSpeak ? "1px solid #81c784" : "1px solid #e0e0e0",
                    color: autoSpeak ? "#1b5e20" : "#616161",
                    borderRadius: "20px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <span>{autoSpeak ? "🔊 Auto Voice: ON" : "🔇 Auto Voice: OFF"}</span>
                </button>

                {/* LOCATION BADGE */}
                <div
                  style={{
                    background: "#eef7f0",
                    border: "1px solid #c3e5ca",
                    borderRadius: "20px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#1f6932",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>📍 {userLocation?.city || userLocation?.displayName || "Detecting Area..."}</span>
                </div>
              </div>
            </div>

            {/* QUICK VOICE PROMPTS BAR */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (qp.action) qp.action();
                    else handleSend(qp.text);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "16px",
                    border: "1px solid #c8e6c9",
                    background: "#ffffff",
                    color: "#2e7d32",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN CHAT CONTAINER */}
          <div className="chat-container" style={{ minHeight: "520px", display: "flex", flexDirection: "column", background: "#ffffff", borderRadius: "18px", border: "1px solid #e5ebe6", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            
            {/* MESSAGES LIST */}
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: "20px" }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      padding: "16px 20px",
                      borderRadius: msg.sender === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                      background: msg.sender === "user" ? "linear-gradient(135deg, #2e7d32, #1b5e20)" : "#f4f8f4",
                      color: msg.sender === "user" ? "#ffffff" : "#173f2c",
                      boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
                      fontSize: "14px",
                      lineHeight: "1.65",
                    }}
                  >
                    {msg.sender === "bot" && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #e0eae1", paddingBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#1b5e20" }}>
                            🤖 EcoSort Conversational AI
                          </span>
                          {speakingMsgId === msg.id && (
                            <span style={{ fontSize: "10px", background: "#a5d6a7", color: "#1b5e20", padding: "2px 6px", borderRadius: "8px", fontWeight: "bold" }}>
                              🔊 Speaking...
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {msg.realtime_used && (
                            <span
                              style={{
                                background: "#e1f5fe",
                                color: "#0288d1",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "10px",
                                fontWeight: "700",
                              }}
                            >
                              🌐 Live Web Data
                            </span>
                          )}

                          {/* READ ALOUD BUTTON */}
                          <button
                            type="button"
                            onClick={() => speakText(msg.id, msg.text)}
                            title="Read Aloud"
                            style={{
                              background: speakingMsgId === msg.id ? "#c8e6c9" : "#ffffff",
                              border: "1px solid #a5d6a7",
                              cursor: "pointer",
                              fontSize: "13px",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              color: "#2e7d32",
                              fontWeight: "600"
                            }}
                          >
                            {speakingMsgId === msg.id ? "🛑 Stop" : "🔊 Listen"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

                    {msg.source && (
                      <div style={{ marginTop: "8px", fontSize: "11px", color: "#546e7a", fontStyle: "italic" }}>
                        Source: {msg.source}
                      </div>
                    )}

                    {/* SUGGESTION CHIPS */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="suggestions" style={{ marginTop: "14px" }}>
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
                              marginRight: "6px",
                              marginBottom: "6px"
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
                  <div style={{ padding: "14px 20px", borderRadius: "20px", background: "#f4f8f4", color: "#256e3b", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }} />
                    <span>🤖 EcoSort AI is fetching real-time information...</span>
                  </div>
                </div>
              )}

              {/* LISTENING PULSE ANIMATION */}
              {isListening && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
                  <div
                    style={{
                      background: "#ffebee",
                      border: "2px solid #ef5350",
                      color: "#c62828",
                      padding: "10px 20px",
                      borderRadius: "25px",
                      fontSize: "13px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      animation: "pulse 1.2s infinite",
                      boxShadow: "0 0 15px rgba(211,47,47,0.3)"
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>🎙️</span>
                    <span>Listening... Speak your query now (Auto-submits on pause)</span>
                  </div>
                </div>
              )}

              {/* BOT SPEAKING WAVEFORM INDICATOR */}
              {speakingMsgId && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "14px" }}>
                  <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", padding: "8px 16px", borderRadius: "18px", fontSize: "12px", color: "#1b5e20", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🔊 EcoSort AI is speaking response out loud...</span>
                    <button
                      type="button"
                      onClick={() => {
                        window.speechSynthesis.cancel();
                        setSpeakingMsgId(null);
                      }}
                      style={{ border: "none", background: "#c8e6c9", padding: "2px 8px", borderRadius: "10px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
                    >
                      Mute
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* INPUT FORM WITH MICROPHONE BUTTON */}
            <form className="chat-input" onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "10px" }}>
              <input
                type="text"
                placeholder={isListening ? "Listening to your voice..." : "Type or click 🎙️ to speak hands-free..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "14px 18px",
                  borderRadius: "14px",
                  border: "1px solid #cfe0d2",
                  fontSize: "14px",
                }}
              />

              {/* HANDS-FREE MICROPHONE BTN */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                title={isListening ? "Click to stop listening" : "Click to speak hands-free"}
                style={{
                  background: isListening ? "#d32f2f" : "#2e7d32",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "50%",
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "20px",
                  transition: "all 0.2s ease",
                  boxShadow: isListening ? "0 0 15px rgba(211,47,47,0.6)" : "0 3px 10px rgba(46,125,50,0.3)",
                }}
              >
                {isListening ? "🛑" : "🎙️"}
              </button>

              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                style={{
                  padding: "14px 22px",
                  borderRadius: "14px",
                  background: "#2e7d32",
                  color: "#ffffff",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer"
                }}
              >
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