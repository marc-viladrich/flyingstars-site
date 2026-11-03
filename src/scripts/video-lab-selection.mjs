/** Prefer AV1 only after a bounded, positive decoder report; H.264 is always the safe default. */
export async function chooseVideo({ preferred, fallback }, capabilities, timeoutMs = 250) {
  if (!fallback) throw new Error('H.264 fallback missing');
  if (!preferred || !capabilities?.decodingInfo) return fallback;
  let timer;
  try {
    const result = await Promise.race([
      capabilities.decodingInfo({ type: 'file', video: { contentType: preferred.contentType, width: preferred.width, height: preferred.height, bitrate: preferred.bitrate, framerate: preferred.fps } }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Decoder query timed out')), timeoutMs); }),
    ]);
    return result.supported && result.smooth && result.powerEfficient ? preferred : fallback;
  } catch { return fallback; }
  finally { clearTimeout(timer); }
}
