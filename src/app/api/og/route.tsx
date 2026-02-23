import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const title = searchParams.get("title") || "Craveo";
    const type = searchParams.get("type") || "Explore";

    // Optional: passed as comma-separated URLs
    const postersParam = searchParams.get("posters");
    // Ensure we only try to parse valid URLs
    const posters = postersParam
      ? postersParam
          .split(",")
          .filter((url) => url.startsWith("http"))
          .slice(0, 3)
      : [];

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 50% 120%, #7e22ce, rgba(0, 0, 0, 0))",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            display: "flex",
            marginTop: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#fbcfe8",
              letterSpacing: "-0.05em",
            }}
          >
            Craveo
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "0 80px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#d8b4fe",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 24,
            }}
          >
            {type}
          </div>
          <div
            style={{
              fontSize: title.length > 40 ? 64 : 80,
              fontWeight: 900,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: posters.length > 0 ? 60 : 0,
            }}
          >
            {title}
          </div>

          {posters.length > 0 && (
            <div style={{ display: "flex", gap: 24 }}>
              {posters.map((poster, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    width: 220,
                    height: 330,
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                    border: "2px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={poster}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    alt=""
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.error("Error generating OG image:", e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
