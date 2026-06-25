export default function PixelGridPreview({ pixels = [] }) {
  return (
    <div className="pixel-grid" aria-label="Grade de pixels 28 por 28">
      {Array.from({ length: 784 }, (_, index) => {
        const value = pixels[index] ?? 0;
        const shade = Math.round(value * 255);
        return <span key={index} style={{ backgroundColor: `rgb(${shade}, ${shade}, ${shade})` }} title={value.toFixed(2)} />;
      })}
    </div>
  );
}
