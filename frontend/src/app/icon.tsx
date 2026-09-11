import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default async function Icon() {
  const source = await readFile(
    join(process.cwd(), "public/brand/cr-solid.png"),
  );

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "white",
      }}
    >
      <img
        src={`data:image/png;base64,${source.toString("base64")}`}
        alt=""
        width={80}
        height={80}
      />
    </div>,
    size,
  );
}
