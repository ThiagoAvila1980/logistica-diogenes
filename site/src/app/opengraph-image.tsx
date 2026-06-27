import { ImageResponse } from "next/og";

export const alt = "Diogenes Envidraçamentos Especiais — Campo Grande MS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#060d1a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Gold accent top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #c8a96e, #4a8fe8, #c8a96e)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <p
            style={{
              color: "#c8a96e",
              fontSize: "18px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Envidraçamentos Especiais
          </p>

          <h1
            style={{
              color: "#ffffff",
              fontSize: "72px",
              fontWeight: "bold",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            DIOGENES
          </h1>

          <p
            style={{
              color: "#c8a96e",
              fontSize: "28px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            ENVIDRAÇAMENTOS
          </p>

          <div
            style={{
              width: "80px",
              height: "3px",
              background: "linear-gradient(90deg, #c8a96e, #4a8fe8)",
              borderRadius: "2px",
              marginTop: "8px",
            }}
          />

          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "22px",
              textAlign: "center",
              margin: 0,
              marginTop: "8px",
              maxWidth: "700px",
              lineHeight: 1.5,
            }}
          >
            A sofisticação dos envidraçamentos a seu alcance.
          </p>

          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "16px",
              margin: 0,
              letterSpacing: "0.1em",
            }}
          >
            Campo Grande – Mato Grosso do Sul
          </p>
        </div>

        {/* Gold accent bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #c8a96e, #4a8fe8, #c8a96e)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
