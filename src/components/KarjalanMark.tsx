type KarjalanMarkProps = {
  className?: string;
};

export function KarjalanMark({ className = "" }: KarjalanMarkProps) {
  return (
    <img
      src="/NEW%20KARJALAN%20LOGO.png"
      alt="Karjalan Logo"
      className={className}
      aria-label="Karjalan Logo"
      draggable={false}
      style={{ objectFit: "contain" }}
    />
  );
}
