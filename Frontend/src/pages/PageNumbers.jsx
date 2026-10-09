import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import "./PageNumbers.css";

// ============================================================
// PDF.JS WORKER
// ============================================================

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

// ============================================================
// API
// ============================================================

const API_URL = import.meta.env.VITE_BACKEND_DOMAIN || "http://localhost:8080";

// ============================================================
// DEFAULT SETTINGS
// ============================================================

const DEFAULT_SETTINGS = {
  position: "bottom-center",
  pageRange: "",
  startNumber: 1,
  fontSize: 12,
  margin: 30,
  prefix: "",
  suffix: "",
  format: "number",
  color: "#000000",
  fontFamily: "Helvetica",
};

// ============================================================
// PAGE POSITIONS
// ============================================================

const POSITION_OPTIONS = [
  {
    id: "top-left",
    label: "Top Left",
  },
  {
    id: "top-center",
    label: "Top Center",
  },
  {
    id: "top-right",
    label: "Top Right",
  },
  {
    id: "bottom-left",
    label: "Bottom Left",
  },
  {
    id: "bottom-center",
    label: "Bottom Center",
  },
  {
    id: "bottom-right",
    label: "Bottom Right",
  },
];

// ============================================================
// FORMAT OPTIONS
// ============================================================

const FORMAT_OPTIONS = [
  {
    id: "number",
    label: "1",
    description: "Number only",
  },
  {
    id: "page-number",
    label: "Page 1",
    description: "Page number",
  },
  {
    id: "number-total",
    label: "1 / 10",
    description: "Number / total",
  },
  {
    id: "page-number-total",
    label: "Page 1 / 10",
    description: "Page number / total",
  },
];

// ============================================================
// HELPERS
// ============================================================

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================
// PAGE RANGE PARSER
// Supports:
// 1
// 1,3,5
// 1-5
// 1,3-5,8
// Empty = all pages
// ============================================================

const parsePageRange = (input, totalPages) => {
  if (!input || !input.trim()) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  // Special case: no pages selected
  if (input.trim().toLowerCase() === "none") {
    return [];
  }

  // Baaki existing function bilkul same rakho

  if (!input || !input.trim()) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set();

  const parts = input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const part of parts) {
    // Single page
    if (/^\d+$/.test(part)) {
      const page = Number(part);

      if (page >= 1 && page <= totalPages) {
        pages.add(page);
      }

      continue;
    }

    // Range
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);

    if (rangeMatch) {
      let start = Number(rangeMatch[1]);
      let end = Number(rangeMatch[2]);

      if (start > end) {
        [start, end] = [end, start];
      }

      start = clamp(start, 1, totalPages);
      end = clamp(end, 1, totalPages);

      for (let page = start; page <= end; page++) {
        pages.add(page);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
};

// ============================================================
// FORMAT TEXT
// ============================================================

const getNumberText = ({ format, pageNumber, totalPages, prefix, suffix }) => {
  let text = "";

  switch (format) {
    case "page-number":
      text = `Page ${pageNumber}`;
      break;

    case "number-total":
      text = `${pageNumber} / ${totalPages}`;
      break;

    case "page-number-total":
      text = `Page ${pageNumber} / ${totalPages}`;
      break;

    case "number":
    default:
      text = `${pageNumber}`;
      break;
  }

  return `${prefix}${text}${suffix}`;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const PageNumbers = () => {
  // ==========================================================
  // STATE
  // ==========================================================

  const [file, setFile] = useState(null);

  const [pdfDocument, setPdfDocument] = useState(null);

  const [totalPages, setTotalPages] = useState(0);

  const [selectedPage, setSelectedPage] = useState(1);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [previewUrl, setPreviewUrl] = useState(null);

  const [loading, setLoading] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [dragActive, setDragActive] = useState(false);

  const canvasRef = useRef(null);

  const [pageMode, setPageMode] = useState("all");

  // ==========================================================
  // SELECTED PAGES
  // ==========================================================

  const selectedPages = useMemo(() => {
    if (!totalPages) return [];

    // All Pages: har thumbnail selected rahega
    if (pageMode === "all") {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    // Selected Pages: sirf selected page numbers
    if (!settings.pageRange.trim()) {
      return [];
    }

    return parsePageRange(settings.pageRange, totalPages);
  }, [pageMode, settings.pageRange, totalPages]);
  // ==========================================================
  // DISPLAY NUMBER
  // ==========================================================

  const selectedPageNumber = useMemo(() => {
    const index = selectedPages.indexOf(selectedPage);

    if (index === -1) {
      return settings.startNumber;
    }

    return settings.startNumber + index;
  }, [selectedPage, selectedPages, settings.startNumber]);

  // ==========================================================
  // UPDATE SETTING
  // ==========================================================

  const updateSetting = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setError("");
    setSuccess("");
  };

  const togglePageSelection = (pageNumber) => {
    const nextPages = selectedPages.includes(pageNumber)
      ? selectedPages.filter((page) => page !== pageNumber)
      : [...selectedPages, pageNumber].sort((a, b) => a - b);

    setPageMode("selected");

    updateSetting("pageRange", nextPages.length ? nextPages.join(",") : "none");
  };

  const selectAllPages = () => {
    updateSetting(
      "pageRange",
      Array.from({ length: totalPages }, (_, index) => index + 1).join(","),
    );
  };

  const deselectAllPages = () => {
    setPageMode("selected");
    updateSetting("pageRange", "none");
  };

  // ==========================================================
  // LOAD PDF
  // ==========================================================

  const loadPDF = async (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();

      const pdf = await getDocument({
        data: arrayBuffer,
      }).promise;

      setFile(selectedFile);
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setSelectedPage(1);

      setSettings((previous) => ({
        ...previous,
        pageRange: "",
      }));
    } catch (err) {
      console.error("PDF loading error:", err);

      setError("Unable to load this PDF. Please make sure the PDF is valid.");

      setFile(null);
      setPdfDocument(null);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // FILE INPUT
  // ==========================================================

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      await loadPDF(selectedFile);
    }

    event.target.value = "";
  };

  // ==========================================================
  // DRAG & DROP
  // ==========================================================

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();

    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      await loadPDF(droppedFile);
    }
  };

  // ==========================================================
  // CLEAR FILE
  // ==========================================================

  const clearFile = () => {
    setFile(null);
    setPdfDocument(null);
    setTotalPages(0);
    setSelectedPage(1);
    setPreviewUrl(null);
    setError("");
    setSuccess("");
    setSettings(DEFAULT_SETTINGS);
  };

  // ==========================================================
  // RENDER PDF PAGE
  // ==========================================================

  const renderPage = async (pageNumber) => {
    if (!pdfDocument || !canvasRef.current) {
      return;
    }

    try {
      const page = await pdfDocument.getPage(pageNumber);

      const scale = 1.35;

      const viewport = page.getViewport({
        scale,
      });

      const canvas = canvasRef.current;

      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      context.clearRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      drawPageNumberPreview(canvas, pageNumber);
    } catch (err) {
      console.error("Page rendering error:", err);
    }
  };

  // ==========================================================
  // DRAW NUMBER ON PREVIEW
  // ==========================================================

  const drawPageNumberPreview = (canvas, pageNumber) => {
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const scale = 1.35;

    const margin = Number(settings.margin) * scale;

    const fontSize = Number(settings.fontSize) * scale;

    const selectedIndex = selectedPages.indexOf(pageNumber);

    if (selectedIndex === -1) {
      return;
    }

    const numberToShow = (() => {
      const index = selectedPages.indexOf(pageNumber);

      if (index === -1) {
        return settings.startNumber;
      }

      return settings.startNumber + index;
    })();

    const text = getNumberText({
      format: settings.format,
      pageNumber: numberToShow,
      totalPages,
      prefix: settings.prefix,
      suffix: settings.suffix,
    });

    context.save();

    context.font = `${fontSize}px ${settings.fontFamily}`;

    // Direct text only — no background box
    context.fillStyle = settings.color;

    context.textBaseline = "middle";

    let x;
    let y;

    switch (settings.position) {
      case "top-left":
        x = margin;
        y = margin;
        context.textAlign = "left";
        break;

      case "top-center":
        x = canvas.width / 2;
        y = margin;
        context.textAlign = "center";
        break;

      case "top-right":
        x = canvas.width - margin;
        y = margin;
        context.textAlign = "right";
        break;

      case "bottom-left":
        x = margin;
        y = canvas.height - margin;
        context.textAlign = "left";
        break;

      case "bottom-center":
        x = canvas.width / 2;
        y = canvas.height - margin;
        context.textAlign = "center";
        break;

      case "bottom-right":
        x = canvas.width - margin;
        y = canvas.height - margin;
        context.textAlign = "right";
        break;

      default:
        x = canvas.width / 2;
        y = canvas.height - margin;
        context.textAlign = "center";
        break;
    }

    // Draw only the page number text
    context.fillText(text, x, y);

    context.restore();
  };

  // ==========================================================
  // RENDER WHEN SETTINGS CHANGE
  // ==========================================================

  useEffect(() => {
    if (!pdfDocument || !selectedPage) {
      return;
    }

    renderPage(selectedPage);
  }, [
    pdfDocument,
    selectedPage,
    settings.position,
    settings.startNumber,
    settings.fontSize,
    settings.margin,
    settings.prefix,
    settings.suffix,
    settings.format,
    settings.color,
    settings.fontFamily,
    settings.pageRange,
  ]);

  // ==========================================================
  // DOWNLOAD RESULT
  // ==========================================================

  const processPDF = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    if (!totalPages) {
      setError("Unable to determine PDF pages.");
      return;
    }

    const pages = selectedPages;

    if (!pages.length) {
      setError("Please enter a valid page range.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      // IMPORTANT:
      // Backend uses upload.single("file")
      formData.append("file", file);

      formData.append("pageRange", pages.join(","));

      formData.append("startNumber", String(settings.startNumber));

      formData.append("position", settings.position);

      formData.append("fontSize", String(settings.fontSize));

      formData.append("margin", String(settings.margin));

      formData.append("prefix", settings.prefix);

      formData.append("suffix", settings.suffix);

      formData.append("format", settings.format);

      formData.append("color", settings.color);

      formData.append("fontFamily", settings.fontFamily);

      const response = await fetch(`${API_URL}/api/pdf/page-numbers`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        let message = "Failed to add page numbers.";

        try {
          const data = await response.json();

          message = data?.message || data?.error || message;
        } catch {
          // Response isn't JSON
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      setPreviewUrl(url);

      const downloadLink = document.createElement("a");

      downloadLink.href = url;

      downloadLink.download = "page-numbered.pdf";

      document.body.appendChild(downloadLink);

      downloadLink.click();

      downloadLink.remove();

      setSuccess(
        "Page numbers added successfully. Your PDF download has started.",
      );
    } catch (err) {
      console.error("Page Numbers Error:", err);

      setError(
        err.message || "Something went wrong while adding page numbers.",
      );
    } finally {
      setProcessing(false);
    }
  };

  // ==========================================================
  // PAGE NAVIGATION
  // ==========================================================

  const previousPage = () => {
    setSelectedPage((previous) => Math.max(1, previous - 1));
  };

  const nextPage = () => {
    setSelectedPage((previous) => Math.min(totalPages, previous + 1));
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="page-numbers-page">
      <div className="page-numbers-container">
        {/* ====================================================
            HEADER
        ==================================================== */}



        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="page-numbers-alert error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}

        {success && (
          <div className="page-numbers-alert success">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* ====================================================
            NO FILE
        ==================================================== */}

        {!file && (
          <div
            className={`pdf-upload-area ${dragActive ? "drag-active" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon">↑</div>

            <h2>Upload your PDF</h2>

            <p>
              Drag & drop your PDF here or choose a file from your computer.
            </p>

            <label className="choose-file-button">
              Choose PDF
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                hidden
              />
            </label>

            <span className="upload-note">PDF files only</span>
          </div>
        )}

        {/* ====================================================
            WORKSPACE
        ==================================================== */}

        {file && (
          <div className="page-numbers-workspace">
            {/* =================================================
                LEFT / PREVIEW
            ================================================= */}

            <div className="preview-panel">
              <div className="preview-header">
                <div>
                  <h2>Preview</h2>

                  <span>{file.name}</span>
                </div>

                <button
                  type="button"
                  className="change-file-button"
                  onClick={clearFile}
                >
                  Change PDF
                </button>
              </div>

              {/* PAGE NAVIGATION */}

              <div className="page-navigation">
                <button
                  type="button"
                  onClick={previousPage}
                  disabled={selectedPage <= 1}
                >
                  ←
                </button>

                <span>
                  Page {selectedPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={nextPage}
                  disabled={selectedPage >= totalPages}
                >
                  →
                </button>
              </div>

              {/* CANVAS */}

              <div className="pdf-preview-wrapper">
                {loading ? (
                  <div className="preview-loading">Loading PDF...</div>
                ) : (
                  <canvas ref={canvasRef} className="pdf-preview-canvas" />
                )}
              </div>

              {/* THUMBNAILS */}

              <div className="thumbnail-section">
                <div className="thumbnail-title">Pages</div>

                <div className="thumbnail-list">
                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) => {
                      const pageNumber = index + 1;

                      return (
                        <PageThumbnail
                          key={pageNumber}
                          pdfDocument={pdfDocument}
                          pageNumber={pageNumber}
                          selected={selectedPage === pageNumber}
                          checked={selectedPages.includes(pageNumber)}
                          onClick={() => setSelectedPage(pageNumber)}
                          onToggle={() => togglePageSelection(pageNumber)}
                        />
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            {/* =================================================
                RIGHT / SETTINGS
            ================================================= */}



            <div className="settings-panel">
              {/* PAGE NUMBERING MODE */}

            <div className="page-numbers-header">
          <div>
            <h1>Add Page Numbers</h1>

            <p>Add customizable page numbers to your PDF.</p>
          </div>
        </div>
              <div className="page-mode-section">
                
                

                <div className="page-mode-options">
                  <label
                    className={`page-mode-option ${
                      pageMode === "all" ? "active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="pageMode"
                      value="all"
                      checked={pageMode === "all"}
                      onChange={() => setPageMode("all")}
                    />
                    <span>All Pages</span>
                  </label>

                  <label
                    className={`page-mode-option ${
                      pageMode === "selected" ? "active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="pageMode"
                      value="selected"
                      checked={pageMode === "selected"}
                      onChange={() => {
                        if (pageMode === "all" && !settings.pageRange.trim()) {
                          updateSetting("pageRange", "none");
                        }

                        setPageMode("selected");
                      }}
                    />
                    <span>Selected Pages</span>
                  </label>
                </div>
              </div>

              {/* PAGE RANGE */}

              <section className="settings-section">
                <h3>Pages</h3>

                <label>Page range</label>

                <input
                  type="text"
                  value={
                    pageMode === "all"
                      ? ""
                      : settings.pageRange === "none"
                        ? ""
                        : settings.pageRange
                  }
                  disabled={pageMode === "all"}
                  onChange={(event) =>
                    updateSetting("pageRange", event.target.value)
                  }
                  placeholder={
                    pageMode === "all"
                      ? `All pages (1-${totalPages})`
                      : "Example: 1, 3-5, 8"
                  }
                />

                <div className="selected-pages-info">
                  {selectedPages.length} page
                  {selectedPages.length !== 1 ? "s" : ""} selected
                </div>
              </section>

              {/* START NUMBER */}

              <section className="settings-section">
                <h3>Numbering</h3>

                <label>Start number</label>

                <input
                  type="number"
                  min="1"
                  max="999999"
                  value={settings.startNumber}
                  onChange={(event) =>
                    updateSetting(
                      "startNumber",
                      Math.max(1, Number(event.target.value) || 1),
                    )
                  }
                />
              </section>

              {/* POSITION */}

              <section className="settings-section">
                <h3>Position</h3>

                <div className="position-grid">
                  {POSITION_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`position-option ${
                        settings.position === option.id ? "active" : ""
                      }`}
                      onClick={() => updateSetting("position", option.id)}
                    >
                      <PositionIcon position={option.id} />

                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* FORMAT */}

              <section className="settings-section">
                <h3>Format</h3>

                <div className="format-list">
                  {FORMAT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`format-option ${
                        settings.format === option.id ? "active" : ""
                      }`}
                      onClick={() => updateSetting("format", option.id)}
                    >
                      <strong>{option.label}</strong>

                      <span>{option.description}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* FONT */}

              <section className="settings-section">
                <h3>Font</h3>

                <div className="two-column">
                  <div>
                    <label>Font family</label>

                    <select
                      value={settings.fontFamily}
                      onChange={(event) =>
                        updateSetting("fontFamily", event.target.value)
                      }
                    >
                      <option value="Helvetica">Helvetica</option>

                      <option value="Times-Roman">Times</option>

                      <option value="Courier">Courier</option>
                    </select>
                  </div>

                  <div>
                    <label>Font size</label>

                    <input
                      type="number"
                      min="6"
                      max="100"
                      value={settings.fontSize}
                      onChange={(event) =>
                        updateSetting(
                          "fontSize",
                          clamp(Number(event.target.value) || 12, 6, 100),
                        )
                      }
                    />
                  </div>
                </div>
              </section>

              {/* MARGIN */}

              <section className="settings-section">
                <h3>Spacing</h3>

                <label>Margin</label>

                <div className="range-with-value">
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={settings.margin}
                    onChange={(event) =>
                      updateSetting("margin", Number(event.target.value))
                    }
                  />

                  <span>{settings.margin} pt</span>
                </div>
              </section>

              {/* PREFIX / SUFFIX */}

              <section className="settings-section">
                <h3>Custom text</h3>

                <div className="two-column">
                  <div>
                    <label>Prefix</label>

                    <input
                      type="text"
                      maxLength="50"
                      value={settings.prefix}
                      onChange={(event) =>
                        updateSetting("prefix", event.target.value)
                      }
                      placeholder="e.g. [ "
                    />
                  </div>

                  <div>
                    <label>Suffix</label>

                    <input
                      type="text"
                      maxLength="50"
                      value={settings.suffix}
                      onChange={(event) =>
                        updateSetting("suffix", event.target.value)
                      }
                      placeholder="e.g. ]"
                    />
                  </div>
                </div>
              </section>

              {/* COLOR */}

              <section className="settings-section">
                <h3>Color</h3>

                <div className="color-picker-row">
                  <input
                    type="color"
                    value={settings.color}
                    onChange={(event) =>
                      updateSetting("color", event.target.value)
                    }
                  />

                  <input
                    type="text"
                    value={settings.color}
                    maxLength="7"
                    onChange={(event) =>
                      updateSetting("color", event.target.value)
                    }
                  />
                </div>
              </section>

              {/* FINAL PREVIEW TEXT */}

              <section className="number-preview-box">
                <span>Preview</span>

                <strong>
                  {getNumberText({
                    format: settings.format,
                    pageNumber: selectedPageNumber,
                    totalPages,
                    prefix: settings.prefix,
                    suffix: settings.suffix,
                  })}
                </strong>
              </section>

              {/* PROCESS */}

              <button
                type="button"
                className="add-numbers-button"
                onClick={processPDF}
                disabled={processing || !file || selectedPages.length === 0}
              >
                {processing ? (
                  <>
                    <span className="spinner" />
                    Processing...
                  </>
                ) : (
                  <>
                    Add Page Numbers
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            PREVIEW DOWNLOAD MESSAGE
        ==================================================== */}

        {previewUrl && (
          <div className="result-card">
            <div>
              <strong>PDF ready</strong>

              <p>Your page-numbered PDF has been generated.</p>
            </div>

            <a
              href={previewUrl}
              download="page-numbered.pdf"
              className="result-download-button"
            >
              Download Again
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// THUMBNAIL COMPONENT
// ============================================================

const PageThumbnail = ({
  pdfDocument,
  pageNumber,
  selected,
  checked,
  onClick,
  onToggle,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask;

    const renderThumbnail = async () => {
      if (!pdfDocument || !canvasRef.current) return;

      try {
        const page = await pdfDocument.getPage(pageNumber);

        if (cancelled) return;

        const viewport = page.getViewport({ scale: 0.22 });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (cancelled) return;

        renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;
      } catch (error) {
        if (!cancelled) {
          console.error("Thumbnail error:", error);
        }
      }
    };

    renderThumbnail();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDocument, pageNumber]);

  return (
    <div
      className={`page-thumbnail ${
        selected ? "selected" : ""
      } ${checked ? "numbering-selected" : ""}`}
      title={`Preview page ${pageNumber}`}
    >
      <label
        className="thumbnail-checkbox"
        title={`Add numbering to page ${pageNumber}`}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Number page ${pageNumber}`}
        />
      </label>

      <button
        type="button"
        className="thumbnail-preview-button"
        onClick={onClick}
        aria-label={`Preview page ${pageNumber}`}
      >
        <canvas ref={canvasRef} />
        <span>{pageNumber}</span>
      </button>
    </div>
  );
};

// ============================================================
// POSITION ICON
// ============================================================

const PositionIcon = ({ position }) => {
  return (
    <div className="position-icon">
      <span className={`position-dot ${position}`} />
    </div>
  );
};

export default PageNumbers;
