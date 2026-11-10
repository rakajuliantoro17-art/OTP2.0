export function inspectSephiaWav(bytes, {
  minDurationSeconds = 2,
  maxDurationSeconds = 8,
  maxBytes = 2 * 1024 * 1024,
} = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("WAV data must be a Uint8Array.");
  if (bytes.byteLength < 44 || bytes.byteLength > maxBytes) {
    throw new Error("WAV size is outside the permitted bounds.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WAVE") {
    throw new Error("Asset is not a RIFF/WAVE file.");
  }
  if (view.getUint32(4, true) + 8 !== bytes.byteLength) {
    throw new Error("RIFF length does not match the file size.");
  }

  let format = null;
  let dataOffset = -1;
  let dataLength = 0;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkId = ascii(offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > bytes.byteLength) throw new Error("WAV chunk exceeds file bounds.");
    if (chunkId === "fmt ") {
      if (chunkSize < 16) throw new Error("WAV format chunk is incomplete.");
      format = {
        audioFormat: view.getUint16(chunkStart, true),
        channels: view.getUint16(chunkStart + 2, true),
        sampleRate: view.getUint32(chunkStart + 4, true),
        byteRate: view.getUint32(chunkStart + 8, true),
        blockAlign: view.getUint16(chunkStart + 12, true),
        bitsPerSample: view.getUint16(chunkStart + 14, true),
      };
    } else if (chunkId === "data") {
      dataOffset = chunkStart;
      dataLength = chunkSize;
    }
    offset = chunkEnd + (chunkSize % 2);
  }

  if (!format || dataOffset < 0) throw new Error("WAV must contain fmt and data chunks.");
  if (format.audioFormat !== 1) throw new Error("Only uncompressed PCM WAV is accepted.");
  if (format.channels !== 1) throw new Error("SEPHIA audio must be mono.");
  if (![24000, 44100].includes(format.sampleRate)) {
    throw new Error("SEPHIA WAV sample rate must be 24000 or 44100 Hz.");
  }
  if (format.bitsPerSample !== 16) throw new Error("SEPHIA WAV must use 16-bit PCM.");
  if (format.blockAlign !== 2 || format.byteRate !== format.sampleRate * 2) {
    throw new Error("WAV PCM alignment metadata is inconsistent.");
  }
  if (dataLength === 0 || dataLength % format.blockAlign !== 0) {
    throw new Error("WAV audio data is empty or misaligned.");
  }

  const durationSeconds = dataLength / format.byteRate;
  if (durationSeconds < minDurationSeconds || durationSeconds > maxDurationSeconds) {
    throw new Error("SEPHIA announcement duration must be between 2 and 8 seconds.");
  }

  let peak = 0;
  let clippedSamples = 0;
  const sampleCount = dataLength / 2;
  for (let i = 0; i < sampleCount; i += 1) {
    const sample = view.getInt16(dataOffset + i * 2, true);
    const magnitude = Math.abs(sample);
    if (magnitude > peak) peak = magnitude;
    if (magnitude >= 32760) clippedSamples += 1;
  }
  const clippedRatio = clippedSamples / sampleCount;
  if (peak < 328) throw new Error("WAV signal level is too low to be a usable voice asset.");
  if (clippedRatio > 0.0005) throw new Error("WAV contains excessive clipped samples.");

  return Object.freeze({
    codec: "PCM",
    channels: format.channels,
    sampleRate: format.sampleRate,
    bitsPerSample: format.bitsPerSample,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    bytes: bytes.byteLength,
    peakDbfs: Number((20 * Math.log10(peak / 32768)).toFixed(2)),
    clippedRatio: Number(clippedRatio.toFixed(6)),
  });
}
