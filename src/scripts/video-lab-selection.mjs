/** Conservative demo: only confirmed smooth and power-efficient candidates, otherwise H.264. */
export async function chooseVideo(candidates, capabilities) {
  const fallback = candidates.find(v => v.id === 'original');
  if (!fallback) throw new Error('H.264 fallback missing');
  if (!capabilities?.decodingInfo) return fallback;
  const modern = candidates.filter(v => v.group === 'desktop' && v.width >= 1900 && v.codec !== 'h264')
    .sort((a, b) => a.bytes - b.bytes);
  for (const video of modern) {
    try {
      const result = await capabilities.decodingInfo({ type:'file', video:{ contentType:video.contentType, width:video.width, height:video.height, bitrate:video.bitrate, framerate:video.fps } });
      if (result.supported && result.smooth && result.powerEfficient) return video;
    } catch { /* A missing or rejected capability report is not a reason to force a modern codec. */ }
  }
  return fallback;
}
