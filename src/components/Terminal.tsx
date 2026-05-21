import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);

    term.open(containerRef.current);
    fit.fit();

    let unlisten: UnlistenFn | undefined;
    let dispose = false;

    (async () => {
      try {
        await invoke("pty_open", { cols: term.cols, rows: term.rows });
      } catch (e) {
        console.error("pty_open failed", e);
        return;
      }
      unlisten = await listen<string>("pty:data", (e) => {
        if (!dispose) term.write(e.payload);
      });

      term.onData((data) => {
        invoke("pty_write", { data }).catch((e) =>
          console.error("pty_write failed", e),
        );
      });

      term.onResize(({ cols, rows})  => {
        invoke("pty_resize", {cols, rows}).catch((e) => console.error("pty_resize failed", e))
      });
    })();


    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // container has zero size during transient layouts; ignore
      }
    });
    observer.observe(containerRef.current);

    return () => {
      dispose = true;
      observer.disconnect();
      unlisten?.();
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="terminal" />;
}
