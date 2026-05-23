import { Editor } from "./components/Editor";
import { SplitPane } from "./components/SplitPane";
import { RightPane } from "./components/RightPane";
import "./App.css";

function App() {
  return (
    <SplitPane
      left={<Editor />}
      right={<RightPane />}
      defaultRightPercent={50}
    />
  );
}

export default App;
