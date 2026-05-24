export default function BackgroundBlurs() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Yellow blob — top-right, bleeds in from edge */}
      <img
        src="/blurs/yellow.png"
        alt=""
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-20%',
          width: '55vw',
          maxWidth: '600px',
          opacity: 0.9,
          userSelect: 'none',
        } as React.CSSProperties}
      />

      {/* Black blob — top-right corner, overlapping yellow, multiply blends on white */}
      <img
        src="/blurs/black.png"
        alt=""
        style={{
          position: 'absolute',
          top: '-10%',
          right: '5%',
          width: '30vw',
          maxWidth: '360px',
          opacity: 0.6,
          mixBlendMode: 'multiply',
          userSelect: 'none',
        } as React.CSSProperties}
      />
    </div>
  )
}
