import variants from '../data/video-lab.json' with { type: 'json' };
export function heroVideoSources() {
  const find = (id: string) => {
    const item = variants.find(v => v.id === id);
    if (!item) throw new Error(`Missing approved hero rendition: ${id}`);
    return item;
  };
  return {
    desktop: { preferred: find('cut15-av1-1918'), fallback: find('cut15-h264-1918') },
    mobile: { preferred: find('cut15-mobile-av1-640'), fallback: find('cut15-mobile-h264-640') },
  };
}
