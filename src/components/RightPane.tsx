import { useState } from "react";
import { Terminal } from "./Terminal";
import { SettingsPane } from "./settings/SettingsPane";
import { SettingsButton } from "./settings/SettingsButton";
import { BackButton } from "./settings/BackButton";

type RightPaneMode = "terminal" | "settings";

export function RightPane() {
  const [mode, setMode] = useState<RightPaneMode>("terminal");

  return (
    <div className="right-pane">
      <div hidden={mode !== "terminal"} className="right-pane-slot">
        <div className="right-pane-header right-pane-header-right">
          <SettingsButton onClick={() => setMode("settings")} />
        </div>
        <div className="right-pane-content">
          <Terminal />
        </div>
      </div>
      <div hidden={mode !== "settings"} className="right-pane-slot">
        <div className="right-pane-header right-pane-header-left">
          <BackButton onClick={() => setMode("terminal")} />
        </div>
        <div className="right-pane-content">
          <SettingsPane />
        </div>
      </div>
    </div>
  );
}
