import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { vim } from "@replit/codemirror-vim";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Mode = "source" | "preview";

const INITIAL_MD = "# Untitled\n\n";

export function Editor() {
  const [content, setContent] = useState<string>(INITIAL_MD);
  const [mode, setMode] = useState<Mode>("source");

  const toggle = () => setMode((m) => (m === "source" ? "preview" : "source"));

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <button type="button" onClick={toggle}>
          {mode === "source" ? "Preview" : "Edit"}
        </button>
      </div>
      <div className="editor-body">
        {mode === "source" ? (
          <CodeMirror
            value={content}
            onChange={setContent}
            theme={oneDark}
            extensions={[vim(), markdown()]}
            height="100%"
            style={{ height: "100%" }}
          />
        ) : (
          <div className="editor-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
