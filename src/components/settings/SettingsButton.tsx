type Props = {
  onClick: () => void;
};

export function SettingsButton({ onClick }: Props) {
  return (
    <button
      type="button"
      className="settings-button"
      onClick={onClick}
      title="Settings"
      aria-label="Open settings"
    >
      ⚙
    </button>
  );
}
