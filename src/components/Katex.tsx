import { useMemo } from "react";
import katex from "katex";

interface KatexProps {
  tex: string;
  block?: boolean;
  className?: string;
}

/** Renderer matematik med KaTeX — fejl vises som rå tekst, aldrig en crash. */
export function Katex({ tex, block = false, className = "" }: KatexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: block,
        throwOnError: false,
        strict: false,
        output: "html",
      });
    } catch {
      return tex;
    }
  }, [tex, block]);

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
