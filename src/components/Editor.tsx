import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { vim } from "@replit/codemirror-vim";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Mode = "source" | "preview";

const INITIAL_MD = "# Untitled\n\n";

export function Editor() {
  const [content, setContent] = useState<string>(INITIAL_MD);
  const [mode, setMode] = useState<Mode>("preview");

  return (
    <div className="editor">
      <div className="editor-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "source"}
          className={mode === "source" ? "editor-tab editor-tab-active" : "editor-tab"}
          onClick={() => setMode("source")}
        >
          Edit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "preview"}
          className={mode === "preview" ? "editor-tab editor-tab-active" : "editor-tab"}
          onClick={() => setMode("preview")}
        >
          Preview
        </button>
      </div>
      <div className="editor-body">
        {mode === "source" ? (
          <CodeMirror
            value={content}
            onChange={setContent}
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
