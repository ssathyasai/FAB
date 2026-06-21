"use client";
import { useState, useEffect } from "react";

interface HistoryItem {
  id: string;
  advisor_type: string;
  request_data: any;
  response_data: any;
  created_at: string;
}

export default function AdvisorHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const url = filter === "all" 
        ? "/api/advisor/history" 
        : `/api/advisor/history?advisor_type=${filter}`;
      
      const res = await fetch(`http://127.0.0.1:8000${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this history item?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:8000/api/advisor/history/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchHistory();
        if (selectedItem?.id === id) setSelectedItem(null);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const clearHistory = async () => {
    if (!confirm(`Clear all ${filter === "all" ? "" : filter + " "}history?`)) return;
    
    try {
      const token = localStorage.getItem("token");
      const url = filter === "all"
        ? "/api/advisor/history"
        : `/api/advisor/history?advisor_type=${filter}`;
        
      const res = await fetch(`http://127.0.0.1:8000${url}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchHistory();
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const getAdvisorIcon = (type: string) => {
    switch (type) {
      case "debt": return "fas fa-hand-holding-usd";
      case "savings": return "fas fa-piggy-bank";
      case "investment": return "fas fa-chart-line";
      case "emergency": return "fas fa-first-aid";
      default: return "fas fa-file-alt";
    }
  };

  const getAdvisorColor = (type: string) => {
    switch (type) {
      case "debt": return "#ff6b6b";
      case "savings": return "#fbbf24";
      case "investment": return "#6366f1";
      case "emergency": return "#ef4444";
      default: return "#60a5fa";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div style={{ display: "flex", gap: "1.5rem", height: "calc(100vh - 300px)" }}>
      
      {/* Left: History List */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {["all", "debt", "savings", "investment", "emergency"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "1.5rem",
                border: `1px solid ${filter === f ? "rgba(240,180,41,0.35)" : "rgba(240,180,41,0.09)"}`,
                background: filter === f
                  ? "linear-gradient(135deg,rgba(240,180,41,0.16),rgba(99,102,241,0.12))"
                  : "rgba(240,180,41,0.03)",
                color: filter === f ? "#f0b429" : "rgba(240,180,41,0.45)",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "capitalize",
                transition: "all 0.2s"
              }}
            >
              {f}
            </button>
          ))}
          
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "1.5rem",
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.1)",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
                marginLeft: "auto"
              }}
            >
              <i className="fas fa-trash" style={{ marginRight: 4 }} />
              Clear
            </button>
          )}
        </div>

        {/* History Items */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem", color: "rgba(240,180,41,0.45)" }}>
              Loading history...
            </div>
          )}
          
          {!loading && history.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "rgba(240,180,41,0.45)" }}>
              <i className="fas fa-history" style={{ fontSize: "2rem", marginBottom: "1rem", opacity: 0.3 }} />
              <div>No history yet</div>
              <div style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                Your advisor requests will appear here
              </div>
            </div>
          )}
          
          {!loading && history.map(item => {
            const isSelected = selectedItem?.id === item.id;
            const color = getAdvisorColor(item.advisor_type);
            
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                style={{
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: `1px solid ${isSelected ? `${color}44` : "rgba(240,180,41,0.09)"}`,
                  background: isSelected
                    ? `linear-gradient(135deg,${color}11,rgba(240,180,41,0.05))`
                    : "rgba(240,180,41,0.03)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "0.5rem",
                    background: `${color}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: color,
                    fontSize: "0.9rem"
                  }}>
                    <i className={getAdvisorIcon(item.advisor_type)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: "#f5f0e8",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      textTransform: "capitalize"
                    }}>
                      {item.advisor_type} Advisor
                    </div>
                    <div style={{ color: "rgba(240,180,41,0.35)", fontSize: "0.7rem", marginTop: 2 }}>
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                    style={{
                      padding: "0.3rem 0.6rem",
                      borderRadius: "0.4rem",
                      border: "1px solid rgba(239,68,68,0.2)",
                      background: "rgba(239,68,68,0.1)",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "0.7rem"
                    }}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Selected Item Details */}
      {selectedItem && (
        <div style={{
          flex: 1.5,
          borderRadius: "0.75rem",
          border: "1px solid rgba(240,180,41,0.12)",
          background: "rgba(240,180,41,0.03)",
          padding: "1.5rem",
          overflowY: "auto"
        }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.75rem"
            }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: "0.6rem",
                background: `${getAdvisorColor(selectedItem.advisor_type)}22`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: getAdvisorColor(selectedItem.advisor_type),
                fontSize: "1.1rem"
              }}>
                <i className={getAdvisorIcon(selectedItem.advisor_type)} />
              </div>
              <div>
                <div style={{ color: "#f5f0e8", fontWeight: 700, fontSize: "1.1rem", textTransform: "capitalize" }}>
                  {selectedItem.advisor_type} Advisor
                </div>
                <div style={{ color: "rgba(240,180,41,0.35)", fontSize: "0.75rem", marginTop: 2 }}>
                  {formatDate(selectedItem.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Request Data */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{
              color: "rgba(240,180,41,0.65)",
              fontSize: "0.75rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Your Request
            </div>
            <div style={{
              padding: "1rem",
              borderRadius: "0.5rem",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(240,180,41,0.08)",
              fontSize: "0.8rem",
              color: "rgba(240,180,41,0.7)",
              maxHeight: "200px",
              overflowY: "auto"
            }}>
              <pre style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                fontFamily: "monospace"
              }}>
                {JSON.stringify(selectedItem.request_data, null, 2)}
              </pre>
            </div>
          </div>

          {/* Response Data */}
          <div>
            <div style={{
              color: "rgba(240,180,41,0.65)",
              fontSize: "0.75rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              AI Response
            </div>
            <div style={{
              padding: "1rem",
              borderRadius: "0.5rem",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(240,180,41,0.08)",
              fontSize: "0.8rem",
              color: "rgba(240,180,41,0.7)",
              lineHeight: 1.6,
              maxHeight: "400px",
              overflowY: "auto"
            }}>
              {selectedItem.response_data?.recommendation || 
               selectedItem.response_data?.suggestion ||
               <pre style={{
                 margin: 0,
                 whiteSpace: "pre-wrap",
                 wordWrap: "break-word",
                 fontFamily: "monospace"
               }}>
                 {JSON.stringify(selectedItem.response_data, null, 2)}
               </pre>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
