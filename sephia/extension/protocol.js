export const NATIVE_HOST_NAME = "com.smansasoo.sephia";
export const MAX_NATIVE_AUDIO_BYTES = 700 * 1024;
export const MAX_NATIVE_AUDIO_BASE64_LENGTH = 955736;

export function validateNativeResponse(value) {
  if (!value || typeof value !== "object" || value.version !== 1 || typeof value.ok !== "boolean") {
    return false;
  }
  if (value.ok === false) {
    const keys = Object.keys(value).sort().join(",");
    return keys === "code,ok,version" &&
      ["ENGINE_UNAVAILABLE", "BUSY", "RATE_LIMITED", "INVALID_REQUEST",
        "SYNTHESIS_FAILED", "TIMEOUT", "OUTPUT_TOO_LARGE"].includes(value.code);
  }
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "audioBase64,channels,durationMs,format,ok,sampleRate,version") return false;
  return value.format === "pcm_s16le" &&
    value.sampleRate === 24000 &&
    value.channels === 1 &&
    Number.isInteger(value.durationMs) &&
    value.durationMs >= 250 && value.durationMs <= 15000 &&
    typeof value.audioBase64 === "string" &&
    value.audioBase64.length > 0 &&
    value.audioBase64.length <= MAX_NATIVE_AUDIO_BASE64_LENGTH &&
    value.audioBase64.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value.audioBase64) &&
    ((value.audioBase64.length / 4) * 3 -
      (value.audioBase64.endsWith("==") ? 2 : value.audioBase64.endsWith("=") ? 1 : 0)) <= MAX_NATIVE_AUDIO_BYTES;
}
