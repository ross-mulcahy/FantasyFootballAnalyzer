import styles from './StudioAnchorDesk.module.css';

export type AnchorState = 'hazard' | 'sweat' | 'clear';
const art = (name: string) => `${import.meta.env.BASE_URL}studio/${name}.png`;
const descriptions: Record<AnchorState, string> = {
  hazard: 'hazard alert, leaning forward and pointing urgently',
  sweat: 'Witching Hour sweat, holding a microphone',
  clear: 'all clear, smiling with a studio mug',
};

/** Layered scene: the backdrop and desk remain fixed while Scott changes pose. */
export function PixelScott({ state, compact = false }: { state: AnchorState; compact?: boolean }) {
  return <div className={`${styles.pixelStage} ${compact ? styles.pixelPortrait : ''} ${styles[state]}`} role="img" aria-label={`Pixel Scott: ${descriptions[state]}`}>
    <img className={styles.stageBackdrop} src={art('studio-backdrop')} alt="" aria-hidden="true" draggable={false} />
    <img className={styles.anchorSprite} src={art(state === 'sweat' ? 'anchor-sweat-handheld' : `anchor-${state}`)} alt="" aria-hidden="true" draggable={false} />
    {!compact && <><img className={styles.deskSprite} src={art('studio-desk-no-mic')} alt="" aria-hidden="true" draggable={false} /><span className={styles.deskLogo} aria-hidden="true">OCTOBOX // LIVE</span><span className={styles.studioBeacon} aria-hidden="true" /></>}
  </div>;
}
