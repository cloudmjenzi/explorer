import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.appName,
    short_name: config.appName.split(" ")[0],
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f7",
    theme_color: "#1f5e8c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
