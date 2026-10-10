export function Sunflower({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse
          key={i}
          cx="24"
          cy="10"
          rx="4.7"
          ry="9"
          fill={i % 2 ? "#f5b923" : "#ffd84c"}
          transform={`rotate(${i * 30} 24 24)`}
        />
      ))}
      <circle cx="24" cy="24" r="10" fill="#59351f" />
      <circle cx="24" cy="24" r="7" fill="#754726" />
      {[
        [-3, -3],
        [2, -4],
        [5, 0],
        [2, 4],
        [-3, 3],
        [-5, 0],
        [0, 0],
      ].map(([x, y], i) => (
        <circle key={i} cx={24 + x} cy={24 + y} r=".9" fill="#d6a55b" />
      ))}
    </svg>
  );
}
