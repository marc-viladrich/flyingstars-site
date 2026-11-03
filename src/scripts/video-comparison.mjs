/** One timeline and one reference for every resolution; metadata is generated from the real files. */
export function comparisonSet(videos, codec = 'h264') {
  const reference = videos.find(v => v.id === 'cut15-reference');
  if (!reference) throw new Error('15s reference missing');
  const candidates = [1600, 1440, 1280].map(width => {
    const video = videos.find(v => v.group === 'cut-desktop' && v.width === width && v.codec === codec);
    if (!video || video.edit !== reference.edit || video.duration !== reference.duration) throw new Error(`Matching ${width}px ${codec} comparison missing`);
    return video;
  });
  return [reference, ...candidates];
}
