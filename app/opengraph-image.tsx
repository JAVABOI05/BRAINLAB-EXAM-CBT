import { ImageResponse } from "next/og";

export const alt =
  "BrainLab Academy online learning and CBT exam practice for Nigerian students.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "58px 64px",
          color: "#ffffff",
          background:
            "linear-gradient(135deg, #0B1536 0%, #102b64 58%, #1356E8 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -100,
            top: -160,
            width: 520,
            height: 520,
            borderRadius: 260,
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            width: 520,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                background: "#ffffff",
                color: "#0B1536",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 900,
              }}
            >
              B
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: -0.8 }}>
                BrainLab
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 4,
                  color: "#cbd5e1",
                }}
              >
                ACADEMY
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 44,
              fontSize: 48,
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: -1.6,
            }}
          >
            Learn smarter.
            <br />
            Practise with purpose.
          </div>
          <div
            style={{
              marginTop: 22,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 18,
              fontWeight: 700,
              color: "#dbeafe",
            }}
          >
            <span>JAMB UTME</span>
            <span style={{ color: "#FF5238" }}>•</span>
            <span>WAEC</span>
            <span style={{ color: "#FF5238" }}>•</span>
            <span>NECO</span>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 19,
              lineHeight: 1.35,
              color: "#cbd5e1",
            }}
          >
            CBT practice · Topic lessons · AI-supported revision
          </div>
        </div>

        <div
          style={{
            width: 470,
            height: 440,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 360,
              height: 360,
              borderRadius: 180,
              background: "rgba(255,255,255,0.08)",
              border: "2px solid rgba(255,255,255,0.12)",
            }}
          />
          <div
            style={{
              width: 400,
              height: 286,
              borderRadius: 22,
              padding: 14,
              background: "#e8eef8",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              transform: "rotate(2deg)",
            }}
          >
            <div
              style={{
                height: 30,
                borderRadius: "10px 10px 0 0",
                background: "#0B1536",
                display: "flex",
                alignItems: "center",
                paddingLeft: 12,
                gap: 6,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 4, background: "#FF5238" }} />
              <span style={{ width: 7, height: 7, borderRadius: 4, background: "#fbbf24" }} />
              <span style={{ width: 7, height: 7, borderRadius: 4, background: "#34d399" }} />
              <span style={{ marginLeft: 12, color: "#dbeafe", fontSize: 10 }}>BrainLab CBT Practice</span>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "22px 22px",
                color: "#0B1536",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>Practice question</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1356E8",
                    background: "#dbeafe",
                    borderRadius: 8,
                    padding: "5px 8px",
                  }}
                >
                  01 / 50
                </span>
              </div>
              <div style={{ marginTop: 17, fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>
                Select the correct answer to continue.
              </div>
              <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 9 }}>
                {["Option A", "Option B", "Option C"].map((option, index) => (
                  <div
                    key={option}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: index === 1 ? "2px solid #1356E8" : "1px solid #cbd5e1",
                      background: index === 1 ? "#dbeafe" : "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        border: index === 1 ? "5px solid #1356E8" : "1px solid #94a3b8",
                        background: "#ffffff",
                      }}
                    />
                    {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: 4,
              bottom: 16,
              width: 112,
              height: 112,
              borderRadius: 22,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(-8deg)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                background: "#e0eaff",
                color: "#1356E8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 43,
                fontWeight: 900,
              }}
            >
              ✓
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
