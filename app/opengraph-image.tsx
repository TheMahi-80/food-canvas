import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { messages } from "@/lib/i18n";

// Share preview (Facebook, WhatsApp, Messenger): the unmodified logo centred on the brand background.
// Replace with the text-free FC mark once that asset exists (see README, "Logo and images").
export const alt = messages.meta.siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#050505" }}>
        <img src={src} width={480} height={471} alt="" />
      </div>
    ),
    size,
  );
}
