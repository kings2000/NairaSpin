/** A price or amount in game points, with the small gold points glyph. */
export function Points({ value }: { value: number }) {
  return (
    <span className="points">
      <span className="pts-icon" aria-hidden />
      {value.toLocaleString()}
    </span>
  );
}
