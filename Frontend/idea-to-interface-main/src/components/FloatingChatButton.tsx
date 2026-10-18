import { useState } from "react";
import { MessageCircle } from "lucide-react";
import SimpleChat from "./SimpleChat";

export default function FloatingChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "6rem",
        right: "1.5rem",
        zIndex: 50,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "#2563eb",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
        }}
        title="Abrir chat veterinario"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#1d4ed8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#2563eb";
        }}
      >
        <MessageCircle size={28} color="white" />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            right: "0",
            width: "320px",
            height: "500px",
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 5px 20px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eee",
              fontWeight: "600",
              backgroundColor: "#f8f9fa",
              fontSize: "14px",
            }}
          >
            Asistente Veterinario
          </div>
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SimpleChat />
          </div>
        </div>
      )}
    </div>
  );
}
