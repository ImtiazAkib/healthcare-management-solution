import { ImageResponse } from 'next/og';

import { APP_DATA } from '@/constants';

export const alt = APP_DATA.NAME;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/*
  Styles are inline because satori has no stylesheet: the design tokens are repeated here as
  literal sRGB rather than read from `globals.css`. The two colors are the sRGB of
  `--primary` and `--primary-hover` in the light palette, so the card is the same teal the
  app is.
*/
export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '90px',
        background: 'linear-gradient(135deg, #00555b 0%, #00686e 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}>
      <div style={{ display: 'flex', fontSize: 104, fontWeight: 700, letterSpacing: '-0.03em' }}>{APP_DATA.SHORT_NAME}</div>

      <div style={{ display: 'flex', marginTop: 28, fontSize: 40, opacity: 0.95 }}>Unified Healthcare Management Solution</div>

      <div style={{ display: 'flex', marginTop: 44, fontSize: 30, opacity: 0.85 }}>{APP_DATA.TAGLINE}</div>
    </div>,
    { ...size }
  );
}
