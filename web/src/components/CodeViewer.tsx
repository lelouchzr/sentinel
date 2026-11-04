import { useEffect, useState } from "react";
import { Code, Copy, Check } from "@phosphor-icons/react";
import { api } from "../api";
import type { Job } from "../types";

function Highlight({ text }: { text: string }) {
  // Tokenization is presentational only. React escapes source text, including HTML.
  const tokens = text.split(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#[^\n]*|\b(?:def|class|return|import|from|if|else|elif|raise|in|not|and|or|for|None|True|False|async|await)\b|\b\d+(?:\.\d+)?\b)/g,
  );
  return (
    <>
      {tokens.map((token, i) => (
        <span
          key={i}
          className={
            token.startsWith("#")
              ? "token-comment"
              : /^['"]/.test(token)
                ? "token-string"
                : /^\d/.test(token)
                  ? "token-number"
                  : /^(def|class|return|import|from|if|else|elif|raise|in|not|and|or|for|None|True|False|async|await)$/.test(
                        token,
                      )
                    ? "token-keyword"
                    : undefined
          }
        >
          {token}
        </span>
      ))}
    </>
  );
}

export function CodeViewer({ job }: { job: Job }) {
  const [files, setFiles] = useState<{ source: string[]; generated: string[] }>(
    { source: [], generated: [] },
  );
  const [side, setSide] = useState<"source" | "generated">("source");
  const [path, setPath] = useState(job.plan.entry.path);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    api<typeof files>(`/jobs/${job.id}/files`, undefined, abort.signal)
      .then(setFiles)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [job.id, job.status]);
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    setContent("");
    api<{ content: string }>(
      `/jobs/${job.id}/file?side=${side}&path=${encodeURIComponent(path)}`,
      undefined,
      abort.signal,
    )
      .then((result) => setContent(result.content))
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [job.id, side, path]);
  function changeSide(next: "source" | "generated") {
    setSide(next);
    setPath(
      next === "source"
        ? job.plan.entry.path
        : job.manifest?.files.find((f) => f.source === job.plan.entry.path)
            ?.generated ||
            files.generated[0] ||
            "",
    );
  }
  return (
    <section className="code-viewer">
      <div className="panel-heading">
        <div>
          <Code size={19} />
          <h2>Inspect the code</h2>
        </div>
        <div className="segmented">
          <button
            className={side === "source" ? "active" : ""}
            onClick={() => changeSide("source")}
          >
            Original
          </button>
          <button
            className={side === "generated" ? "active" : ""}
            disabled={!files.generated.length}
            onClick={() => changeSide("generated")}
          >
            Extracted
          </button>
        </div>
      </div>
      <div className="code-filebar">
        <select
          aria-label="Source file"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        >
          {files[side].map((file) => (
            <option key={file}>{file}</option>
          ))}
        </select>
        <button
          aria-label="Copy source code"
          className="icon-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              setError("Clipboard unavailable. Select the source to copy it.");
            }
          }}
        >
          {copied ? <Check /> : <Copy />}
        </button>
      </div>
      {error ? (
        <p className="error-inline">{error}</p>
      ) : (
        <pre className="source-code" aria-label={`${side} source code`}>
          {content.split("\n").map((line, i) => (
            <div className="code-line" key={i}>
              <span className="line-number" aria-hidden="true">
                {i + 1}
              </span>
              <code>
                <Highlight text={line} />
              </code>
            </div>
          ))}
        </pre>
      )}
    </section>
  );
}
