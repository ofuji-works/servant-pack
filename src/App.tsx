import { SplitPane } from "./components/SplitPane";
import { Terminal } from "./components/Terminal";
import "./App.css";

function App() {
  return (
    <SplitPane
      left={<div className="main-pane">servant-pack</div>}
      right={<Terminal />}
      defaultRightPercent={50}
    />
  );
}

export default App;
