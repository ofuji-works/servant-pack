import { Editor } from "./components/Editor";
import { SplitPane } from "./components/SplitPane";
import { RightPane } from "./components/RightPane";
import { ToastProvider } from "./context/ToastContext";
import "./App.css";

function App() {
  return (
    <ToastProvider>
      <SplitPane
        left={<Editor />}
        right={<RightPane />}
        defaultRightPercent={50}
      />
    </ToastProvider>
  );
}

export default App;
