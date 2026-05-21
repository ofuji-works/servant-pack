import { useCallback, useEffect, useRef, useState, type ReactNode, type FC } from "react";

type Props = {
  left: ReactNode;
  right: ReactNode;
  defaultRightPercent?: number;
  minPercent?: number;
  maxPercent?: number;
};

export const SplitPane: FC<Props> = ({
  left,
  right,
  defaultRightPercent = 50,
  minPercent = 10,
  maxPercent = 90,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightPercent, setRightPercent] = useState(defaultRightPercent);
  const draggingRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((rect.right - e.clientX) / rect.width) * 100;
      const clamped = Math.min(maxPercent, Math.max(minPercent, pct));
      setRightPercent(clamped);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [minPercent, maxPercent]);

  return (
    <div ref={containerRef} className="split-pane">
      <div className="split-pane-left" style={{ width: `${100 - rightPercent}%` }}>
        {left}
      </div>
      <div
        className="split-pane-divider"
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onMouseDown}
      />
      <div className="split-pane-right" style={{ width: `${rightPercent}%` }}>
        {right}
      </div>
    </div>
  );
}
