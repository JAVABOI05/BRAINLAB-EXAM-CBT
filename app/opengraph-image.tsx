import { ImageResponse } from "next/og";

export const alt = "BrainLab Academy — Learn smarter. Practise with purpose. Grow beyond the exam.";
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
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#ffffff",
          background:
            "radial-gradient(circle at 82% 18%, rgba(47,111,237,0.55), transparent 34%), linear-gradient(135deg, #00112b 0%, #012153 58%, #0a2f72 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              background: "#ffffff",
              color: "#012153",
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            B
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>BrainLab</div>
            <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700, letterSpacing: 5, color: "#b4bdcc" }}>ACADEMY</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              borderRadius: 999,
              padding: "10px 18px",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 17,
              fontWeight: 700,
              color: "#dbeafe",
            }}
          >
            A connected learning experience
          </div>
          <div style={{ marginTop: 28, fontSize: 62, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2 }}>
            Learn smarter. Practise with purpose.
          </div>
          <div style={{ marginTop: 18, fontSize: 28, lineHeight: 1.3, color: "#dbe4f3" }}>
            Grow beyond the exam.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 22, color: "#b4bdcc", fontSize: 17 }}>
          <span>CBT practice · Learning · Progress</span>
          <span>brainlab academy</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
