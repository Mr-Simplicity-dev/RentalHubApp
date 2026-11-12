import api from "./api";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
const extensions = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "video/mp4": ".mp4",
};
export async function openPrivatePropertyFile(
  url,
  { mimeType = "application/pdf", name = "Evidence" } = {},
) {
  if (
    !/^\/(?:property-protection\/documents\/[a-f0-9-]{36}|disputes\/evidence\/\d+)$/i.test(
      url,
    )
  )
    throw Error("A private property evidence route is required.");
  const response = await api.get(url, { responseType: "arraybuffer" }),
    file = new File(
      Paths.cache,
      "property-evidence-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2) +
        (extensions[mimeType] || ".bin"),
    );
  file.create({ overwrite: false });
  try {
    file.write(new Uint8Array(response.data));
    if (!(await Sharing.isAvailableAsync()))
      throw Error("File sharing is unavailable on this device.");
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
  } finally {
    file.delete();
  }
}
