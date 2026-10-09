import React, { useEffect, useRef, useState } from "react";

import {
  Upload,
  FileText,
  Download,
  Trash2,
  RotateCw,
  Copy,
  RotateCcw,
  GripVertical,
  X,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import "./OrganizePDF.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* =====================================================
   SORTABLE PAGE CARD
===================================================== */

const SortablePage = ({
  page,
  index,
  onDelete,
  onRotate,
  onDuplicate,
  selected,
  onSelect,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: page.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : "auto",
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`organize-page-card ${
        selected ? "selected" : ""
      } ${isDragging ? "dragging" : ""}`}
    >
      {/* =================================================
          TOP BAR
      ================================================= */}

      <div className="page-card-top">
        <div className="page-number">{index + 1}</div>

        <button
          type="button"
          className="drag-handle"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>
      </div>

      {/* =================================================
          PAGE PREVIEW
      ================================================= */}

      <button
        type="button"
        className="page-preview-button"
        onClick={() => onSelect(page.id)}
      >
        <div className="page-preview">
          {page.thumbnail ? (
<img
  src={page.thumbnail}
  alt={`Page ${index + 1}`}
  style={{
    transform: `rotate(${Number(page.rotation) || 0}deg)`,
    transition: "transform 0.3s ease",
  }}
/>
          ) : (
            <div className="page-loading">
              <FileText size={40} />
            </div>
          )}
        </div>
      </button>

      {/* =================================================
          PAGE ACTIONS
      ================================================= */}

      <div className="page-actions">
        <button type="button" title="Rotate" onClick={() => onRotate(page.id)}>
          <RotateCw size={17} />
        </button>

        <button
          type="button"
          title="Duplicate"
          onClick={() => onDuplicate(page.id)}
        >
          <Copy size={17} />
        </button>

        <button
          type="button"
          title="Delete"
          className="delete-page-button"
          onClick={() => onDelete(page.id)}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

const OrganizePDF = () => {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);

  const [pages, setPages] = useState([]);

  const [originalPages, setOriginalPages] = useState([]);

  const [loading, setLoading] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [selectedPage, setSelectedPage] = useState(null);

  const [dragActive, setDragActive] = useState(false);

  /* =====================================================
     DND SENSORS
  ===================================================== */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  /* =====================================================
     CLEANUP THUMBNAILS
  ===================================================== */

  useEffect(() => {
    return () => {
      pages.forEach((page) => {
        if (page.thumbnail) {
          URL.revokeObjectURL(page.thumbnail);
        }
      });
    };
  }, []);

  /* =====================================================
     CLEAR MESSAGES
  ===================================================== */

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  /* =====================================================
     HANDLE FILE
  ===================================================== */

  const handleFile = async (selectedFile) => {
    clearMessages();

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file.");

      return;
    }

    setFile(selectedFile);

    await loadPDFPages(selectedFile);
  };

  /* =====================================================
     FILE INPUT
  ===================================================== */

  const handleFileInput = async (event) => {
    const selectedFile = event.target.files?.[0];

    await handleFile(selectedFile);

    event.target.value = "";
  };

  /* =====================================================
     DRAG & DROP FILE
  ===================================================== */

  const handleDrop = async (event) => {
    event.preventDefault();

    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];

    await handleFile(droppedFile);
  };

  /* =====================================================
     LOAD PDF PAGES
  ===================================================== */

  const loadPDFPages = async (pdfFile) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const arrayBuffer = await pdfFile.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
      }).promise;

      const generatedPages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        const viewport = page.getViewport({
          scale: 0.5,
        });

        const canvas = document.createElement("canvas");

        const context = canvas.getContext("2d");

        canvas.width = viewport.width;

        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const thumbnail = canvas.toDataURL("image/jpeg", 0.85);

        generatedPages.push({
          id: `page-${i}-${Date.now()}`,
          originalPage: i,
          rotation: 0,
          thumbnail,
        });
      }

      setPages(generatedPages);

      setOriginalPages(
        generatedPages.map((page) => ({
          ...page,
        })),
      );

      setSelectedPage(null);
    } catch (err) {
      console.error("PDF preview error:", err);

      setError("Failed to read PDF. Please select another PDF.");

      setFile(null);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     DRAG PAGE END
  ===================================================== */

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setPages((currentPages) => {
      const oldIndex = currentPages.findIndex((page) => page.id === active.id);

      const newIndex = currentPages.findIndex((page) => page.id === over.id);

      return arrayMove(currentPages, oldIndex, newIndex);
    });
  };

  /* =====================================================
     DELETE PAGE
  ===================================================== */

  const deletePage = (pageId) => {
    if (pages.length <= 1) {
      setError("At least one page must remain in the PDF.");

      return;
    }

    clearMessages();

    setPages((currentPages) =>
      currentPages.filter((page) => page.id !== pageId),
    );

    if (selectedPage === pageId) {
      setSelectedPage(null);
    }
  };

  /* =====================================================
     ROTATE PAGE
  ===================================================== */

/* =====================================================
   ROTATE PAGE
===================================================== */

const handleRotate = (pageId) => {
  setPages((prevPages) =>
    prevPages.map((page) => {
      if (page.id !== pageId) {
        return page;
      }

      const currentRotation = Number(page.rotation) || 0;

      return {
        ...page,
        rotation: (currentRotation + 90) % 360,
      };
    })
  );

  setSuccess("");
  setError("");
};

  /* =====================================================
     DUPLICATE PAGE
  ===================================================== */

  const duplicatePage = (pageId) => {
    clearMessages();

    setPages((currentPages) => {
      const index = currentPages.findIndex((page) => page.id === pageId);

      if (index === -1) {
        return currentPages;
      }

      const original = currentPages[index];

      const duplicate = {
        ...original,
        id: `page-copy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };

      const newPages = [...currentPages];

      newPages.splice(index + 1, 0, duplicate);

      return newPages;
    });
  };

  /* =====================================================
     SELECT PAGE
  ===================================================== */

  const handleSelectPage = (pageId) => {
    setSelectedPage((current) => (current === pageId ? null : pageId));
  };

  /* =====================================================
     RESET
  ===================================================== */

 const resetPages = () => {
  clearMessages();

  const restoredPages = originalPages.map(
    (page) => ({
      ...page,
      rotation: 0,
    })
  );

  setPages(restoredPages);

  setSelectedPage(null);
};

  /* =====================================================
     REMOVE FILE
  ===================================================== */

  const removeFile = () => {
    clearMessages();

    setFile(null);
    setPages([]);
    setOriginalPages([]);
    setSelectedPage(null);
  };

  /* =====================================================
     ORGANIZE PDF
  ===================================================== */

const organizePDF = async () => {
  try {
    clearMessages();

    if (!file) {
      throw new Error("Please select a PDF file");
    }

    if (!pages || pages.length === 0) {
      throw new Error("No pages available");
    }

    setProcessing(true);

    /*
     * =====================================================
     * PAGE ORDER
     * =====================================================
     *
     * Example:
     *
     * [page 3, page 1, page 2]
     *
     * becomes:
     *
     * [3, 1, 2]
     *
     */

    const pageOrder = pages.map((page) => {
      const originalPage =
        page.originalPage ??
        page.originalIndex ??
        page.index;

      const pageNumber = Number(originalPage);

      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new Error("Invalid page number");
      }

      return pageNumber;
    });

    /*
     * =====================================================
     * ROTATIONS
     * =====================================================
     *
     * Backend needs rotation based on ORIGINAL page number.
     *
     * Example:
     *
     * {
     *   "1": 90,
     *   "3": 180
     * }
     *
     */

    const rotations = {};

    pages.forEach((page) => {
      const originalPage =
        page.originalPage ??
        page.originalIndex ??
        page.index;

      const pageNumber = Number(originalPage);

      const rotation =
        Number(page.rotation) || 0;

      if (
        Number.isInteger(pageNumber) &&
        pageNumber >= 1
      ) {
        rotations[pageNumber] =
          ((rotation % 360) + 360) % 360;
      }
    });

    /*
     * =====================================================
     * DEBUG
     * =====================================================
     */

    console.log(
      "Sending page order:",
      pageOrder.join(",")
    );

    console.log(
      "Sending rotations:",
      rotations
    );

    /*
     * =====================================================
     * FORM DATA
     * =====================================================
     */

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "pageOrder",
      JSON.stringify(pageOrder)
    );

    formData.append(
      "rotations",
      JSON.stringify(rotations)
    );

    /*
     * =====================================================
     * API REQUEST
     * =====================================================
     */

    const response = await fetch(
      "http://localhost:8080/api/pdf/organize",
      {
        method: "POST",
        body: formData,
      }
    );

    /*
     * =====================================================
     * ERROR RESPONSE
     * =====================================================
     */

    if (!response.ok) {
      let errorMessage =
        "Failed to organize PDF";

      try {
        const data =
          await response.json();

        errorMessage =
          data?.message ||
          errorMessage;
      } catch {
        // Ignore JSON parsing error
      }

      throw new Error(
        errorMessage
      );
    }

    /*
     * =====================================================
     * DOWNLOAD
     * =====================================================
     */

    const blob =
      await response.blob();

    const downloadUrl =
      window.URL.createObjectURL(
        blob
      );

    const link =
      document.createElement("a");

    link.href =
      downloadUrl;

    link.download =
      "organized.pdf";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    window.URL.revokeObjectURL(
      downloadUrl
    );

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    setSuccess(
      "PDF organized successfully."
    );

  } catch (error) {
    console.error(
      "Organize PDF Error:",
      error
    );

    setError(
      error.message ||
        "Failed to organize PDF"
    );

  } finally {
    setProcessing(false);
  }
};

  /* =====================================================
     PAGE COUNT
  ===================================================== */

  const pageCount = pages.length;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="organize-pdf-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="organize-header">
        <div>
          <h1>Organize PDF</h1>

          <p>Rearrange, rotate, duplicate and delete PDF pages.</p>
        </div>

        {file && (
          <button
            type="button"
            className="remove-file-button"
            onClick={removeFile}
          >
            <X size={18} />
            Remove PDF
          </button>
        )}
      </div>

      {/* =================================================
          ALERTS
      ================================================= */}

      {error && (
        <div className="organize-alert error">
          <AlertCircle size={20} />

          <span>{error}</span>

          <button type="button" onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="organize-alert success">
          <CheckCircle size={20} />

          <span>{success}</span>

          <button type="button" onClick={() => setSuccess("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {/* =================================================
          UPLOAD AREA
      ================================================= */}

      {!file && (
        <div
          className={`organize-upload ${dragActive ? "drag-active" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={handleFileInput}
          />

          <div className="upload-icon">
            <Upload size={32} />
          </div>

          <h2>Drop your PDF here</h2>

          <p>or click to browse from your computer</p>

          <span>
            Maximum supported file depends on your server configuration.
          </span>
        </div>
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && (
        <div className="organize-loading">
          <Loader2 size={32} className="spin" />

          <p>Loading PDF pages...</p>
        </div>
      )}

      {/* =================================================
          FILE INFO
      ================================================= */}

      {file && !loading && (
        <div className="organize-file-info">
          <div className="file-info-left">
            <div className="file-icon">
              <FileText size={28} />
            </div>

            <div>
              <strong>{file.name}</strong>

              <span>
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {" • "}
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
            </div>
          </div>

          <button type="button" onClick={removeFile} className="file-remove">
            <X size={18} />
          </button>
        </div>
      )}

      {/* =================================================
          TOOLBAR
      ================================================= */}

      {file && !loading && pages.length > 0 && (
        <div className="organize-toolbar">
          <div className="toolbar-left">
            <span className="page-count">
              {pages.length} {pages.length === 1 ? "Page" : "Pages"}
            </span>

            {selectedPage && (
              <span className="selected-info">Page selected</span>
            )}
          </div>

          <div className="toolbar-right">
            <button type="button" onClick={resetPages}>
              <RotateCcw size={17} />
              Reset
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          PAGE GRID
      ================================================= */}

      {file && !loading && pages.length > 0 && (
        <div className="organize-pages-section">
          <div className="section-title">
            <div>
              <h2>Organize Pages</h2>

              <p>Drag pages to change their order.</p>
            </div>

            <div className="section-hint">
              <GripVertical size={16} />
              Drag & Drop
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((page) => page.id)}
              strategy={rectSortingStrategy}
            >
              <div className="organize-page-grid">
                {pages.map((page, index) => (
                  <SortablePage
                    key={page.id}
                    page={page}
                    index={index}
                    selected={selectedPage === page.id}
                    onDelete={deletePage}
                    onRotate={handleRotate}
                    onDuplicate={duplicatePage}
                    onSelect={handleSelectPage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* =================================================
          BOTTOM ACTION
      ================================================= */}

      {file && !loading && pages.length > 0 && (
        <div className="organize-bottom">
          <div className="bottom-info">
            <CheckCircle size={18} />

            <span>{pages.length} pages ready to organize</span>
          </div>

          <button
            type="button"
            className="organize-button"
            onClick={organizePDF}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 size={20} className="spin" />
                Processing...
              </>
            ) : (
              <>
                <Download size={20} />
                Organize & Download
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrganizePDF;
