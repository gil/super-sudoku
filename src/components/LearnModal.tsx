import * as React from "react";
import hotkeys from "hotkeys-js";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import {Trans} from "react-i18next";

import {isLearnSlug, learnAssetBase, learnDocUrl, LEARN_DOCS} from "src/lib/learn";

const resolveAsset = (src: string): string => {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("/")) {return src;}
  return learnAssetBase() + src.replace(/^\.?\//, "");
};

// Cross-doc links look like "tech_fishb.md" or "tech_sdp.md#er"; split into slug + fragment.
const parseDocLink = (href: string): {slug: string; frag: string | null} | null => {
  const match = href.match(/(?:^|\/)((?:tech_)[a-z0-9_]+)\.md(?:#(.*))?$/i);
  if (match && isLearnSlug(match[1])) {return {slug: match[1], frag: match[2] ?? null};}
  return null;
};

const LearnModal: React.FC<{
  initialSlug?: string;
  onClose: () => void;
}> = ({initialSlug = LEARN_DOCS[0].slug, onClose}) => {
  const [slug, setSlug] = React.useState(initialSlug);
  const [content, setContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const pendingFrag = React.useRef<string | null>(null);

  const scrollToFrag = React.useCallback((frag: string) => {
    const el = contentRef.current?.querySelector(`#${CSS.escape(frag)}`);
    if (el) {el.scrollIntoView({behavior: "smooth", block: "start"});}
  }, []);

  const goToDoc = React.useCallback(
    (nextSlug: string, frag: string | null) => {
      if (nextSlug === slug) {
        if (frag) {scrollToFrag(frag);}
        return;
      }
      pendingFrag.current = frag;
      setSlug(nextSlug);
    },
    [slug, scrollToFrag],
  );

  React.useEffect(() => {
    const previousScope = hotkeys.getScope();
    hotkeys("escape", "LearnModal", () => {
      onClose();
      return false;
    });
    hotkeys.setScope("LearnModal");
    return () => {
      hotkeys.deleteScope("LearnModal");
      hotkeys.setScope(previousScope);
    };
  }, [onClose]);

  React.useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(false);
    fetch(learnDocUrl(slug))
      .then((res) => {
        if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {setContent(text);}
      })
      .catch(() => {
        if (!cancelled) {setError(true);}
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  React.useEffect(() => {
    if (content === null) {return;}
    if (pendingFrag.current) {
      const frag = pendingFrag.current;
      pendingFrag.current = null;
      requestAnimationFrame(() => scrollToFrag(frag));
    } else {
      contentRef.current?.scrollTo(0, 0);
    }
  }, [content, scrollToFrag]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-gray-800 text-white shadow-xl sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="shrink-0 overflow-y-auto border-b border-gray-700 bg-gray-900 p-3 sm:w-64 sm:border-b-0 sm:border-r">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Learn</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-2xl leading-none text-gray-400 hover:text-white sm:hidden"
            >
              ×
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
            {LEARN_DOCS.map((doc) => (
              <button
                key={doc.slug}
                onClick={() => setSlug(doc.slug)}
                className={`whitespace-nowrap rounded px-3 py-2 text-left text-sm transition-colors sm:whitespace-normal ${
                  doc.slug === slug ? "bg-teal-600 text-white" : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {doc.title}
              </button>
            ))}
          </nav>
        </aside>

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 hidden text-3xl leading-none text-gray-400 hover:text-white sm:block"
          >
            ×
          </button>
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
            {error && <p className="text-red-400">Could not load this document.</p>}
            {!error && content === null && <p className="text-gray-300">Loading…</p>}
            {!error && content !== null && (
              <article className="learn-prose">
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    img: ({src, alt}) => (
                      <img src={resolveAsset(String(src ?? ""))} alt={alt ?? ""} loading="lazy" />
                    ),
                    a: ({href, children}) => {
                      const target = String(href ?? "");
                      const doc = parseDocLink(target);
                      if (doc) {
                        return (
                          <a
                            href={target}
                            onClick={(e) => {
                              e.preventDefault();
                              goToDoc(doc.slug, doc.frag);
                            }}
                          >
                            {children}
                          </a>
                        );
                      }
                      if (target.startsWith("#")) {
                        return (
                          <a
                            href={target}
                            onClick={(e) => {
                              e.preventDefault();
                              scrollToFrag(target.slice(1));
                            }}
                          >
                            {children}
                          </a>
                        );
                      }
                      return (
                        <a href={target} target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </article>
            )}
          </div>
          <footer className="shrink-0 border-t border-gray-700 bg-gray-900 px-6 py-3 text-sm text-gray-400">
            <Trans
              i18nKey="learn_disclaimer"
              components={{
                hodoku: (
                  <a
                    href="https://hodoku.sourceforge.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 underline hover:text-teal-300"
                  />
                ),
              }}
            />
          </footer>
        </div>
      </div>
    </div>
  );
};

export default LearnModal;
