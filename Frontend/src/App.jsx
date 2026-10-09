// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import MergePDF from "./pages/MergePDF";
// import SplitPDF from "./pages/SplitPDF";
// import PDFToImages from "./pages/PDFToImages";
// import ImagesToPDF from "./pages/ImagesToPDF";
// import CompressPDF from "./pages/CompressPDF";
// import RotatePDF from "./pages/RotatePDF";
// import WatermarkPDF from "./pages/WatermarkPDF";
// import ProtectPDF from "./pages/ProtectPDF";
// import UnlockPDF from "./pages/UnlockPDF";
// import MetadataPDF from "./pages/MetadataPDF";
// import OrganizePDF from "./pages/OrganizePDF";
// import AnnotatePDF from "./pages/AnnotatePDF";
// import PageNumbers from "./pages/PageNumbers";

// function Home() {
//   return (
//     <div className="min-h-screen bg-gray-50">
//       <header className="border-b bg-white">
//         <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
//           <h1 className="text-2xl font-bold">PDFNexa</h1>

//           <nav>
//             <a href="/merge-pdf" className="text-gray-600 hover:text-black">
//               Merge PDF
//             </a>
//           </nav>
//         </div>
//       </header>

//       <main className="mx-auto max-w-5xl px-6 py-20 text-center">
//         <h2 className="text-5xl font-bold">Every PDF tool you need</h2>

//         <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
//           Merge, split, compress and manage your PDF files without relying on
//           paid PDF APIs.
//         </p>

//         <a
//           href="/merge-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-blue-800 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Merge PDF
//         </a>

//         <a
//           href="/split-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-blue-800 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Split PDF
//         </a>

//         <a
//           href="/pdf-to-images"
//           className="mt-8 m-4 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           PDF to Images
//         </a>
//         <a
//           href="/images-to-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-blue-500 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           JPG / PNG to PDF
//         </a>
//         <a
//           href="/compress-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Compress PDF
//         </a>
//         <a
//           href="/rotate-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Rotate PDF
//         </a>
//         <a
//           href="/watermark-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Watermark
//         </a>
//         <a
//           href="/protect-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           🔐 Protect PDF
//         </a>
//         <a
//           href="/unlock-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Unlock PDF
//         </a>
//         <a
//           href="/metadata-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Metadata PDF
//         </a>
//         <a
//           href="/organize-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Organize PDF
//         </a>
//         <a
//           href="/annotate-pdf"
//           className="mt-8 m-4 inline-block rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Annotate PDF
//         </a>

//         <a
//           href="/page-numbers"
//           className="mt-8 m-4 inline-block rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
//         >
//           Page Numbers
//         </a>
//       </main>
//     </div>
//   );
// }

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Home />} />

//         <Route path="/merge-pdf" element={<MergePDF />} />
//         <Route path="/split-pdf" element={<SplitPDF />} />
//         <Route path="/pdf-to-images" element={<PDFToImages />} />
//         <Route path="/images-to-pdf" element={<ImagesToPDF />} />
//         <Route path="/rotate-pdf" element={<RotatePDF />} />
//         <Route path="/compress-pdf" element={<CompressPDF />} />
//         <Route path="/watermark-pdf" element={<WatermarkPDF />} />
//         <Route path="/protect-pdf" element={<ProtectPDF />} />
//         <Route path="/unlock-pdf" element={<UnlockPDF />} />
//         <Route path="/metadata-pdf" element={<MetadataPDF />} />
//         <Route path="/organize-pdf" element={<OrganizePDF />} />
//         <Route path="/annotate-pdf" element={<AnnotatePDF />} />
//         <Route path="/page-numbers" element={<PageNumbers />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;



import { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";

import MergePDF from "./pages/MergePDF";
import SplitPDF from "./pages/SplitPDF";
import PDFToImages from "./pages/PDFToImages";
import ImagesToPDF from "./pages/ImagesToPDF";
import CompressPDF from "./pages/CompressPDF";
import RotatePDF from "./pages/RotatePDF";
import WatermarkPDF from "./pages/WatermarkPDF";
import ProtectPDF from "./pages/ProtectPDF";
import UnlockPDF from "./pages/UnlockPDF";
import MetadataPDF from "./pages/MetadataPDF";
import OrganizePDF from "./pages/OrganizePDF";
import AnnotatePDF from "./pages/AnnotatePDF";
import PageNumbers from "./pages/PageNumbers";

// Inline SVG icons: no additional icon package required.
function ToolIcon({ type }) {
  const common = {
    width: 30,
    height: 30,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    merge: (
      <>
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
        <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
        <path d="M8 12h8M12 8v8" />
      </>
    ),
    split: (
      <>
        <rect x="3" y="3" width="7" height="18" rx="1.5" />
        <rect x="14" y="3" width="7" height="18" rx="1.5" />
        <path d="M10 12h4M12 10l2 2-2 2" />
      </>
    ),
    compress: (
      <>
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
        <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
        <path d="m9 9 3 3 3-3M12 12V6" />
        <path d="m9 15 3-3 3 3M12 12v6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
    convert: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </>
    ),
    rotate: (
      <>
        <path d="M3 11a9 9 0 0 1 15-6l2 2" />
        <path d="M20 3v4h-4" />
        <path d="M21 13a9 9 0 0 1-15 6l-2-2" />
        <path d="M4 21v-4h4" />
      </>
    ),
    watermark: (
      <>
        <path d="M12 3 3 21h18L12 3Z" />
        <path d="M9 15h6M10 11h4" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    unlock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 7.5-2" />
        <path d="M12 14v3" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    organize: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
      </>
    ),
    numbers: (
      <>
        <path d="M4 7h3M5 5 4 7v2M4 13h3l-3 4h3" />
        <path d="M11 6h9M11 12h9M11 18h9" />
      </>
    ),
  };

  return <svg {...common}>{icons[type] || icons.convert}</svg>;
}

const tools = [
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document.",
    path: "/merge-pdf",
    icon: "merge",
    color: "violet",
    tag: "POPULAR",
  },
  {
    title: "Split PDF",
    description: "Separate pages or split a PDF into files.",
    path: "/split-pdf",
    icon: "split",
    color: "orange",
  },
  {
    title: "Compress PDF",
    description: "Reduce PDF file size while balancing quality.",
    path: "/compress-pdf",
    icon: "compress",
    color: "green",
    tag: "POPULAR",
  },
  {
    title: "PDF to Images",
    description: "Convert PDF pages into image files.",
    path: "/pdf-to-images",
    icon: "image",
    color: "blue",
  },
  {
    title: "Images to PDF",
    description: "Turn JPG and PNG images into a PDF.",
    path: "/images-to-pdf",
    icon: "convert",
    color: "pink",
  },
  {
    title: "Rotate PDF",
    description: "Correct the orientation of PDF pages.",
    path: "/rotate-pdf",
    icon: "rotate",
    color: "cyan",
  },
  {
    title: "Watermark PDF",
    description: "Add a watermark to your PDF document.",
    path: "/watermark-pdf",
    icon: "watermark",
    color: "orange",
  },
  {
    title: "Protect PDF",
    description: "Protect PDF documents with a password.",
    path: "/protect-pdf",
    icon: "lock",
    color: "green",
  },
  {
    title: "Unlock PDF",
    description: "Unlock a PDF using its authorized password.",
    path: "/unlock-pdf",
    icon: "unlock",
    color: "blue",
  },
  {
    title: "PDF Metadata",
    description: "View and manage PDF document properties.",
    path: "/metadata-pdf",
    icon: "info",
    color: "violet",
  },
  {
    title: "Organize PDF",
    description: "Arrange and manage your PDF pages.",
    path: "/organize-pdf",
    icon: "organize",
    color: "pink",
  },
  {
    title: "Annotate PDF",
    description: "Add notes and annotations to your PDF.",
    path: "/annotate-pdf",
    icon: "edit",
    color: "cyan",
  },
  {
    title: "Page Numbers",
    description: "Add page numbers to your PDF pages.",
    path: "/page-numbers",
    icon: "numbers",
    color: "orange",
  },
];

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredTools = tools.filter((tool) =>
    `${tool.title} ${tool.description}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  return (
    <div className="pdf-app">
      <header className="site-header">
        <div className="nav-container">
          <Link
            to="/"
            className="brand"
            aria-label="PDFNexa home"
            onClick={() => setMenuOpen(false)}
          >
            <span className="brand-mark">
              <svg
                viewBox="0 0 32 32"
                width="31"
                height="31"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 3h11l7 7v18H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"
                  fill="currentColor"
                  opacity=".17"
                />
                <path
                  d="M19 3v7h7M10 16h11M10 21h8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m12 10 3-4 3 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="brand-name">
              PDF<span>Nexa</span>
              <small>YOUR PDF WORKSPACE</small>
            </span>
          </Link>

          <button
            className="mobile-menu-button"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
            <a href="#tools" onClick={() => setMenuOpen(false)}>
              All tools
            </a>
            <a href="#about" onClick={() => setMenuOpen(false)}>
              About
            </a>
            <Link
              to="/merge-pdf"
              className="nav-cta"
              onClick={() => setMenuOpen(false)}
            >
              Get started <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-content">
            <div className="hero-badge">
              <span className="status-dot" />
              YOUR ALL-IN-ONE PDF TOOLKIT
            </div>

            <h1>
              Every PDF tool.
              <br />
              <span>One simple workspace.</span>
            </h1>

            <p className="hero-description">
              Merge, split, compress and edit your PDF documents with ease.
              Everything you need to manage your files, all in one place.
            </p>

            <div className="hero-actions">
              <a href="#tools" className="primary-button">
                Explore all tools <span>→</span>
              </a>
              <Link to="/merge-pdf" className="secondary-button">
                <ToolIcon type="merge" /> Start with Merge PDF
              </Link>
            </div>

            <div className="hero-trust">
              <span>
                <span className="trust-check">✓</span> Simple workflow
              </span>
              <span>
                <span className="trust-check">✓</span> Multiple PDF tools
              </span>
              <span>
                <span className="trust-check">✓</span> No paid PDF API required
              </span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-back-card">
              <span className="mini-file mini-file-one">PDF</span>
              <span className="mini-file mini-file-two">PDF</span>
            </div>
            <div className="document-card">
              <div className="document-top">
                <div className="document-logo">
                  <ToolIcon type="convert" />
                </div>
                <span className="document-label">YOUR DOCUMENT</span>
                <span className="document-menu">•••</span>
              </div>
              <div className="document-page">
                <div className="document-heading" />
                <div className="document-line long" />
                <div className="document-line" />
                <div className="document-line medium" />
                <div className="document-chart">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="document-line long" />
                <div className="document-line medium" />
              </div>
              <div className="document-footer">
                <span className="pdf-pill">PDF FILE</span>
                <span className="document-ready">Ready to work</span>
              </div>
            </div>
            <div className="floating-tool floating-merge">
              <span className="floating-icon violet">
                <ToolIcon type="merge" />
              </span>
              <span>Merge PDFs</span>
              <b>↗</b>
            </div>
            <div className="floating-tool floating-compress">
              <span className="floating-icon green">
                <ToolIcon type="compress" />
              </span>
              <span>Compress</span>
              <b>✓</b>
            </div>
            <div className="floating-sparkle sparkle-one">✳</div>
            <div className="floating-sparkle sparkle-two">✦</div>
          </div>
        </section>

        <section className="tools-section" id="tools">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TOOLS FOR EVERY TASK</span>
              <h2>Everything you need to work with PDFs</h2>
              <p>
                Choose a tool and get straight to work. No complicated
                workflow.
              </p>
            </div>
            <div className="tool-count">
              <strong>{filteredTools.length.toString().padStart(2, "0")}</strong>
              <span>{search ? "MATCHING TOOLS" : "AVAILABLE TOOLS"}</span>
            </div>
          </div>

          <div className="tool-search">
            <svg
              viewBox="0 0 24 24"
              width="21"
              height="21"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search PDF tools..."
              aria-label="Search PDF tools"
            />
            <kbd>⌕</kbd>
          </div>

          <div className="tools-grid">
            {filteredTools.map((tool) => (
              <Link
                to={tool.path}
                className="tool-card"
                key={tool.path}
                onClick={() => setMenuOpen(false)}
              >
                <div className="tool-card-top">
                  <div className={`tool-icon ${tool.color}`}>
                    <ToolIcon type={tool.icon} />
                  </div>
                  {tool.tag && (
                    <span className="tool-tag">{tool.tag}</span>
                  )}
                  <span className="tool-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
                <span className="tool-open">
                  Open tool <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">
                <ToolIcon type="info" />
              </div>
              <h3>No tools found</h3>
              <p>Try another search term.</p>
              <button
                type="button"
                className="reset-search"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            </div>
          )}
        </section>

        <section className="about-section" id="about">
          <div className="about-icon">
            <ToolIcon type="convert" />
          </div>
          <div>
            <span className="eyebrow">BUILT FOR SIMPLICITY</span>
            <h2>Your documents, your workflow.</h2>
            <p>
              PDFNexa brings everyday PDF tasks together in one convenient
workspace. Pick a tool, upload your file and follow the steps
on screen.
            </p>
          </div>
          <Link to="/merge-pdf" className="about-button">
            Try PDFNexa <span>→</span>
          </Link>
        </section>
      </main>

      <footer className="site-footer">
        <Link to="/" className="footer-brand">
          <span className="footer-brand-mark">P</span>
          PDFNexa
        </Link>
        <p>Simple tools for everyday PDF work.</p>
        <a href="#tools">Explore tools ↑</a>
        <span className="copyright">
          © {new Date().getFullYear()} PDFNexa
        </span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/merge-pdf" element={<MergePDF />} />
        <Route path="/split-pdf" element={<SplitPDF />} />
        <Route path="/pdf-to-images" element={<PDFToImages />} />
        <Route path="/images-to-pdf" element={<ImagesToPDF />} />
        <Route path="/rotate-pdf" element={<RotatePDF />} />
        <Route path="/compress-pdf" element={<CompressPDF />} />
        <Route path="/watermark-pdf" element={<WatermarkPDF />} />
        <Route path="/protect-pdf" element={<ProtectPDF />} />
        <Route path="/unlock-pdf" element={<UnlockPDF />} />
        <Route path="/metadata-pdf" element={<MetadataPDF />} />
        <Route path="/organize-pdf" element={<OrganizePDF />} />
        <Route path="/annotate-pdf" element={<AnnotatePDF />} />
        <Route path="/page-numbers" element={<PageNumbers />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;