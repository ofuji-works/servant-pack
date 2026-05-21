import { Editor } from "./components/Editor";
import { SplitPane } from "./components/SplitPane";
import { Terminal } from "./components/Terminal";
import "./App.css";

function App() {
  return (
    <SplitPane
      left={<Editor />}
      right={<Terminal />}
      defaultRightPercent={50}
    />
  );
}

export default App;
