import type { CSSProperties } from 'react';

interface LoginBackgroundProps {
  src: string;
}

const baseStyle: CSSProperties = {
  inset: 0,
  width: '100vw',
  height: '100dvh',
  objectFit: 'cover',
  objectPosition: 'center',
  zIndex: 0,
};

const containerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
};

export default function LoginBackground({ src }: LoginBackgroundProps) {
  return (
    <div style={containerStyle} className="bg-gray-100">
      <img
        src={src}
        alt=""
        style={{
          ...baseStyle,
          opacity: 1,
          transition: 'opacity 0.8s ease',
        }}
        className="login-bg-img"
        onLoad={(e) => {
          const target = e.currentTarget;
          target.style.opacity = '0';
          requestAnimationFrame(() => {
            target.style.opacity = '1';
          });
        }}
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}
