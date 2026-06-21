"use client";
import { useState, useRef, useEffect } from "react";
import { PageHeader, Loading } from "@/components/ui";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/api/coach/ask", { question: input.trim() });
      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to get response");
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat cleared");
  };

  const suggestedQuestions = [
    "How can I improve my savings rate?",
    "What's a good budget allocation for my income?",
    "Should I focus on paying debt or investing?",
    "How much emergency fund do I need?",
    "Tips for reducing monthly expenses?",
  ];

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 2rem)" }}>
      <PageHeader
        icon="fas fa-user-tie"
        title="AI FAB Coach"
        color="#6366f1"
        sub="Ask anything about budgeting, investing, or financial planning"
      >
        {messages.length > 0 && (
          <button onClick={clearChat} className="btn-ghost" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
            <i className="fas fa-trash" /> Clear Chat
          </button>
        )}
      </PageHeader>

      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem", overflow: "hidden" }}>
        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem", paddingRight: "0.5rem" }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <i className="fas fa-comments" style={{ fontSize: "3rem", color: "rgba(139,92,246,0.15)", marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text2)", marginBottom: "1.5rem" }}>
                Start a conversation
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.3rem" }}>
                  Suggested Questions
                </div>
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="card-hover"
                    style={{
                      padding: "0.8rem 1.2rem",
                      background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(59,130,246,0.04) 100%)",
                      border: "1px solid rgba(139,92,246,0.15)",
                      borderRadius: "12px",
                      textAlign: "left",
                      fontSize: "0.85rem",
                      color: "var(--text2)",
                      cursor: "pointer",
                      transition: "all 0.25s",
                    }}
                  >
                    <i className="fas fa-comment-dots" style={{ marginRight: "0.6rem", color: "#8b5cf6", fontSize: "0.75rem" }} />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-start",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        msg.role === "user"
                          ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                          : "linear-gradient(135deg, #10b981, #06b6d4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      boxShadow:
                        msg.role === "user"
                          ? "0 4px 16px rgba(59,130,246,0.30)"
                          : "0 4px 16px rgba(16,185,129,0.30)",
                    }}
                  >
                    {msg.role === "user" ? <i className="fas fa-user" /> : <i className="fas fa-robot" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "1rem 1.3rem",
                      borderRadius: "16px",
                      background:
                        msg.role === "user"
                          ? "var(--accent-dim)"
                          : "var(--surface2)",
                      border:
                        msg.role === "user"
                          ? "1px solid rgba(99,102,241,0.25)"
                          : "1px solid var(--border)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div style={{ fontSize: "0.88rem", color: "var(--text1)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text4)",
                        marginTop: "0.5rem",
                        textAlign: msg.role === "user" ? "right" : "left",
                      }}
                    >
                      {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #10b981, #06b6d4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "0.9rem",
                      boxShadow: "0 4px 16px rgba(16,185,129,0.30)",
                    }}
                  >
                    <i className="fas fa-robot" />
                  </div>
                  <div
                    style={{
                      padding: "1rem 1.3rem",
                      borderRadius: "16px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <div className="spinner-sm" />
                      <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            padding: "1rem",
            background: "var(--surface2)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me anything about budgeting, savings, investing..."
            disabled={loading}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text1)",
              fontSize: "0.9rem",
              resize: "none",
              minHeight: "24px",
              maxHeight: "120px",
              fontFamily: "Inter, sans-serif",
            }}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: input.trim() && !loading ? "var(--accent)" : "var(--border)",
              border: "none",
              color: "#fff",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              transition: "all 0.25s",
              flexShrink: 0,
              boxShadow: input.trim() && !loading ? "0 4px 16px rgba(139,92,246,0.30)" : "none",
            }}
          >
            <i className={loading ? "fas fa-circle-notch fa-spin" : "fas fa-paper-plane"} />
          </button>
        </div>
      </div>
    </div>
  );
}
