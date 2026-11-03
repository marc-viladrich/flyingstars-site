import variants from '../data/video-lab.json' with { type: 'json' };
export function heroVideoSources() {
  const find = (id: string) => {
    const item = variants.find(v => v.id === id);
    if (!item) throw new Error(`Missing approved hero rendition: ${id}`);
    return item;
  };
  const desktop = (width: number) => ({ preferred: find(`loop16-av1-${width}`), fallback: find(`loop16-h264-${width}`) });
  return {
    desktop: [960, 1280, 1440].map(desktop),
    mobile: { preferred: find('loop16-mobile-av1-640'), fallback: find('loop16-mobile-h264-640') },
  };
}
