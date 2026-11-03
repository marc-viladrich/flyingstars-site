import variants from '../data/video-lab.json' with { type: 'json' };
export function heroVideoSources() {
  const find = (id: string) => {
    const item = variants.find(v => v.id === id);
    if (!item) throw new Error(`Missing approved hero rendition: ${id}`);
    return item;
  };
  return {
    desktop: { preferred: find('cut14-av1-1440'), fallback: find('cut14-h264-1440') },
    mobile: { preferred: find('cut14-mobile-av1-640'), fallback: find('cut14-mobile-h264-640') },
  };
}
