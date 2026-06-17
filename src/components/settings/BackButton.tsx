type Props = {
  onClick: () => void;
};

export function BackButton({ onClick }: Props) {
  return (
    <button
      type="button"
      className="back-button"
      onClick={onClick}
      title="Back to terminal"
      aria-label="Back to terminal"
    >
      ←
    </button>
  );
}
