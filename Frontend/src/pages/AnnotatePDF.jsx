import React, { useEffect, useRef, useState } from "react";

import {
  FileText,
  Upload,
  Pencil,
  Type,
  Highlighter,
  Minus,
  Square,
  Circle,
  Undo2,
  Trash2,
  Download,
  X,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCw,
  MousePointer2,
} from "lucide-react";

import * as pdfjsLib from "pdfjs-dist";

import "./AnnotatePDF.css";

// PDF.JS WORKER

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

// API

const API_URL = "http://localhost:8080/api/pdf/annotate";

// COLORS

const COLORS = [
  "#000000",
  "#ff0000",
  "#0066ff",
  "#00aa44",
  "#ff9900",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];

// FONT FAMILIES

const FONT_FAMILIES = [
  {
    value: "Arial",
    label: "Arial",
  },
  {
    value: "Roboto-Regular",
    label: "Roboto-Regular",
  },
  {
    value: "Times New Roman",
    label: "Times New Roman",
  },
  {
    value: "Poppins-Medium",
    label: "Poppins-Medium",
  },

  //     {
  //     value: "Roboto",
  //     label: "Roboto",
  //   },
];

// TOOLS

const tools = [
  {
    id: "select",
    label: "Select",
    icon: MousePointer2,
  },
  {
    id: "text",
    label: "Text",
    icon: Type,
  },
  {
    id: "highlight",
    label: "Highlight",
    icon: Highlighter,
  },
  {
    id: "draw",
    label: "Draw",
    icon: Pencil,
  },
  {
    id: "line",
    label: "Line",
    icon: Minus,
  },
  {
    id: "rectangle",
    label: "Rectangle",
    icon: Square,
  },
  {
    id: "circle",
    label: "Circle",
    icon: Circle,
  },
];

// COMPONENT

const AnnotatePDF = () => {
  const fileInputRef = useRef(null);

  const canvasRefs = useRef({});
  const overlayRefs = useRef({});

  // PDF STATE

  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);

  // TOOL STATE

  const [activeTool, setActiveTool] = useState("select");

  const [color, setColor] = useState("#ff0000");

  const [lineWidth, setLineWidth] = useState(3);

  const [fontSize, setFontSize] = useState(18);

  const [fontFamily, setFontFamily] = useState("Arial");

  const [fontBold, setFontBold] = useState(false);

  const [fontItalic, setFontItalic] = useState(false);

  const [textAlign, setTextAlign] = useState("left");

  const [textBackground, setTextBackground] = useState(false);

  const [textBackgroundColor, setTextBackgroundColor] = useState("#ffffff");

  const [textRotation, setTextRotation] = useState(0);

  // TEXT MODAL

  const [showTextModal, setShowTextModal] = useState(false);

  const [textInput, setTextInput] = useState("");

  const [textPosition, setTextPosition] = useState(null);

  const [editingTextId, setEditingTextId] = useState(null);

  // GENERAL STATE

  const [loading, setLoading] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // DRAWING STATE

  const [drawing, setDrawing] = useState(false);

  const [startPoint, setStartPoint] = useState(null);

  // SELECTED ANNOTATION

  const [selectedAnnotation, setSelectedAnnotation] = useState(null);

  const [draggingAnnotation, setDraggingAnnotation] = useState(false);

  const dragOffsetRef = useRef(null);

  // REDRAW WHEN PAGES CHANGE

  useEffect(() => {
    if (!pages.length) return;

    pages.forEach((page) => {
      redrawOverlay(page.pageNumber);
    });
  }, [pages]);

  // HANDLE FILE

  const handleFile = async (selectedFile) => {
    setError("");
    setSuccess("");

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file.");
      return;
    }

    setFile(selectedFile);

    await loadPDF(selectedFile);
  };

  // FILE INPUT

  const handleFileInput = async (event) => {
    const selectedFile = event.target.files?.[0];

    await handleFile(selectedFile);

    event.target.value = "";
  };

  // LOAD PDF

  const loadPDF = async (pdfFile) => {
    try {
      setLoading(true);
      setError("");
      setPages([]);

      const arrayBuffer = await pdfFile.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
      }).promise;

      const loadedPages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        const viewport = page.getViewport({
          scale: 1.5,
        });

        loadedPages.push({
          pageNumber: i,
          width: viewport.width,
          height: viewport.height,
          pdfPage: page,
          annotations: [],
        });
      }

      setPages(loadedPages);

      setTimeout(() => {
        renderAllPages(loadedPages);
      }, 100);
    } catch (err) {
      console.error("Load PDF Error:", err);

      setError("Failed to load PDF.");
    } finally {
      setLoading(false);
    }
  };

  // RENDER ALL PAGES

  const renderAllPages = async (loadedPages) => {
    for (const pageData of loadedPages) {
      await renderPage(pageData);
    }
  };

  // RENDER PAGE

  const renderPage = async (pageData) => {
    const canvas = canvasRefs.current[pageData.pageNumber];

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    const viewport = pageData.pdfPage.getViewport({
      scale: 1.5,
    });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await pageData.pdfPage.render({
      canvasContext: context,
      viewport,
    }).promise;

    const overlay = overlayRefs.current[pageData.pageNumber];

    if (overlay) {
      overlay.width = viewport.width;
      overlay.height = viewport.height;

      redrawOverlay(pageData.pageNumber);
    }
  };

  // REDRAW OVERLAY

  const redrawOverlay = (pageNumber) => {
    const overlay = overlayRefs.current[pageNumber];

    if (!overlay) {
      return;
    }

    const context = overlay.getContext("2d");

    context.clearRect(0, 0, overlay.width, overlay.height);

    const pageData = pages.find((page) => page.pageNumber === pageNumber);

    if (!pageData) {
      return;
    }

    pageData.annotations.forEach((annotation) => {
      drawAnnotation(context, annotation, overlay.width, overlay.height);
    });
  };

  // DRAW ANNOTATION

  const drawAnnotation = (context, annotation, canvasWidth, canvasHeight) => {
    context.save();

    context.strokeStyle = annotation.color || "#ff0000";

    context.fillStyle = annotation.color || "#ff0000";

    context.lineWidth = annotation.lineWidth || 3;

    context.lineCap = "round";

    context.lineJoin = "round";

    // TEXT

    if (annotation.type === "text") {
      const x = annotation.x * canvasWidth;

      const y = annotation.y * canvasHeight;

      const size = annotation.fontSize || 18;

      const family = annotation.fontFamily || "Arial";

      const weight = annotation.fontBold ? "700" : "400";

      const style = annotation.fontItalic ? "italic" : "normal";

      context.font = `${style} ${weight} ${size}px "${family}"`;

      context.textAlign = annotation.textAlign || "left";

      context.textBaseline = "top";

      const rotation = ((annotation.rotation || 0) * Math.PI) / 180;

      context.translate(x, y);

      context.rotate(rotation);

      const lines = String(annotation.text || "").split("\n");

      const lineHeight = size * 1.25;

      // ------------------------------------------------------
      // Background
      // ------------------------------------------------------

      if (annotation.background) {
        let maxWidth = 0;

        lines.forEach((line) => {
          maxWidth = Math.max(maxWidth, context.measureText(line).width);
        });

        let backgroundX = 0;

        if (annotation.textAlign === "center") {
          backgroundX = -maxWidth / 2;
        }

        if (annotation.textAlign === "right") {
          backgroundX = -maxWidth;
        }

        context.fillStyle = annotation.backgroundColor || "#ffffff";

        context.globalAlpha = 0.85;

        context.fillRect(
          backgroundX - 5,
          -4,
          maxWidth + 10,
          lines.length * lineHeight + 8,
        );

        context.globalAlpha = 1;

        context.fillStyle = annotation.color || "#ff0000";
      }

      // ------------------------------------------------------
      // Text
      // ------------------------------------------------------

      lines.forEach((line, index) => {
        context.fillText(line, 0, index * lineHeight);
      });

      context.restore();

      return;
    }

    // HIGHLIGHT

    if (annotation.type === "highlight") {
      context.globalAlpha = 0.3;

      context.fillStyle = annotation.color || "#ffff00";

      context.fillRect(
        annotation.x * canvasWidth,
        annotation.y * canvasHeight,
        annotation.width * canvasWidth,
        annotation.height * canvasHeight,
      );

      context.globalAlpha = 1;

      context.restore();

      return;
    }

    // RECTANGLE

    if (annotation.type === "rectangle") {
      context.strokeRect(
        annotation.x * canvasWidth,
        annotation.y * canvasHeight,
        annotation.width * canvasWidth,
        annotation.height * canvasHeight,
      );

      context.restore();

      return;
    }

    // CIRCLE

    if (annotation.type === "circle") {
      const centerX = (annotation.x + annotation.width / 2) * canvasWidth;

      const centerY = (annotation.y + annotation.height / 2) * canvasHeight;

      const radiusX = Math.abs((annotation.width * canvasWidth) / 2);

      const radiusY = Math.abs((annotation.height * canvasHeight) / 2);

      context.beginPath();

      context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

      context.stroke();

      context.restore();

      return;
    }

    // LINE

    if (annotation.type === "line") {
      context.beginPath();

      context.moveTo(annotation.x * canvasWidth, annotation.y * canvasHeight);

      context.lineTo(annotation.x2 * canvasWidth, annotation.y2 * canvasHeight);

      context.stroke();

      context.restore();

      return;
    }

    // FREEHAND

    if (annotation.type === "draw") {
      if (!annotation.points || annotation.points.length < 2) {
        context.restore();
        return;
      }

      context.beginPath();

      context.moveTo(
        annotation.points[0].x * canvasWidth,
        annotation.points[0].y * canvasHeight,
      );

      annotation.points.slice(1).forEach((point) => {
        context.lineTo(point.x * canvasWidth, point.y * canvasHeight);
      });

      context.stroke();
    }

    context.restore();
  };

  // GET POINTER POSITION

  const getPointerPosition = (event, pageNumber) => {
    const overlay = overlayRefs.current[pageNumber];

    if (!overlay) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect = overlay.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;

    const y = (event.clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  // FIND TEXT ANNOTATION

  const findTextAnnotation = (pageNumber, point) => {
    const page = pages.find((item) => item.pageNumber === pageNumber);

    if (!page) return null;

    const overlay = overlayRefs.current[pageNumber];

    if (!overlay) return null;

    const ctx = overlay.getContext("2d");

    const canvasWidth = overlay.width;
    const canvasHeight = overlay.height;

    // Reverse order = newest annotation first
    const reversed = [...page.annotations].reverse();

    for (const annotation of reversed) {
      if (annotation.type !== "text") continue;

      const x = annotation.x * canvasWidth;
      const y = annotation.y * canvasHeight;

      const size = annotation.fontSize || 18;

      const weight = annotation.fontBold ? "700" : "400";

      const style = annotation.fontItalic ? "italic" : "normal";

      ctx.font = `${style} ${weight} ${size}px "${
        annotation.fontFamily || "Arial"
      }"`;

      const lines = String(annotation.text || "").split("\n");

      let maxWidth = 0;

      lines.forEach((line) => {
        maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
      });

      const lineHeight = size * 1.25;

      const totalHeight = lines.length * lineHeight;

      let left = x;

      if (annotation.textAlign === "center") {
        left -= maxWidth / 2;
      }

      if (annotation.textAlign === "right") {
        left -= maxWidth;
      }

      const padding = 8;

      if (
        point.x * canvasWidth >= left - padding &&
        point.x * canvasWidth <= left + maxWidth + padding &&
        point.y * canvasHeight >= y - padding &&
        point.y * canvasHeight <= y + totalHeight + padding
      ) {
        return annotation;
      }
    }

    return null;
  };

  // POINTER DOWN

  const handlePointerDown = (event, pageNumber) => {
    event.preventDefault();

    const point = getPointerPosition(event, pageNumber);

    // SELECT TOOL

    if (activeTool === "select") {
      const found = findTextAnnotation(pageNumber, point);

      if (found) {
        setSelectedAnnotation({
          pageNumber,
          annotationId: found.id,
        });

        setDraggingAnnotation(true);

        dragOffsetRef.current = {
          x: point.x - found.x,
          y: point.y - found.y,
        };

        return;
      }

      setSelectedAnnotation(null);

      return;
    }

    // TEXT TOOL

    if (activeTool === "text") {
      setTextPosition(point);

      setEditingTextId(null);

      setTextInput("");

      setShowTextModal(true);

      return;
    }

    // DRAWING TOOLS

    setDrawing(true);

    setStartPoint(point);

    // FREEHAND

    if (activeTool === "draw") {
      addAnnotation(pageNumber, {
        type: "draw",
        points: [point],
        color,
        lineWidth,
        isTemporary: true,
      });
    }
  };

  // POINTER MOVE

  const handlePointerMove = (event, pageNumber) => {
    const point = getPointerPosition(event, pageNumber);

    // DRAG SELECTED TEXT

    if (activeTool === "select" && draggingAnnotation && selectedAnnotation) {
      const offset = dragOffsetRef.current;

      if (!offset) return;

      setPages((previousPages) =>
        previousPages.map((page) => {
          if (page.pageNumber !== selectedAnnotation.pageNumber) {
            return page;
          }

          return {
            ...page,

            annotations: page.annotations.map((annotation) => {
              if (annotation.id !== selectedAnnotation.annotationId) {
                return annotation;
              }

              return {
                ...annotation,

                x: Math.max(0, Math.min(1, point.x - offset.x)),

                y: Math.max(0, Math.min(1, point.y - offset.y)),
              };
            }),
          };
        }),
      );

      return;
    }

    // DRAWING

    if (!drawing || !startPoint) {
      return;
    }

    // FREEHAND

    if (activeTool === "draw") {
      setPages((previousPages) =>
        previousPages.map((page) => {
          if (page.pageNumber !== pageNumber) {
            return page;
          }

          return {
            ...page,

            annotations: page.annotations.map((annotation) => {
              if (annotation.type === "draw" && annotation.isTemporary) {
                return {
                  ...annotation,

                  points: [...annotation.points, point],
                };
              }

              return annotation;
            }),
          };
        }),
      );

      return;
    }

    // SHAPE PREVIEW

    redrawOverlay(pageNumber);

    drawPreview(pageNumber, startPoint, point);
  };

  // DRAW PREVIEW

  const drawPreview = (pageNumber, start, current) => {
    const overlay = overlayRefs.current[pageNumber];

    if (!overlay) return;

    const context = overlay.getContext("2d");

    const canvasWidth = overlay.width;

    const canvasHeight = overlay.height;

    context.save();

    context.strokeStyle = color;

    context.fillStyle = color;

    context.lineWidth = lineWidth;

    context.lineCap = "round";

    context.lineJoin = "round";

    // LINE

    if (activeTool === "line") {
      context.beginPath();

      context.moveTo(start.x * canvasWidth, start.y * canvasHeight);

      context.lineTo(current.x * canvasWidth, current.y * canvasHeight);

      context.stroke();

      context.restore();

      return;
    }

    // SHAPES

    if (
      activeTool === "rectangle" ||
      activeTool === "highlight" ||
      activeTool === "circle"
    ) {
      const x = Math.min(start.x, current.x);

      const y = Math.min(start.y, current.y);

      const width = Math.abs(current.x - start.x);

      const height = Math.abs(current.y - start.y);

      drawAnnotation(
        context,
        {
          type: activeTool,

          x,

          y,

          width,

          height,

          color,

          lineWidth,
        },
        canvasWidth,
        canvasHeight,
      );
    }

    context.restore();
  };

  // POINTER UP

  const handlePointerUp = (event, pageNumber) => {
    if (activeTool === "select" && draggingAnnotation) {
      setDraggingAnnotation(false);

      dragOffsetRef.current = null;

      return;
    }

    if (!drawing || !startPoint) {
      return;
    }

    const point = getPointerPosition(event, pageNumber);

    setDrawing(false);

    // FREEHAND

    if (activeTool === "draw") {
      setPages((previousPages) =>
        previousPages.map((page) => {
          if (page.pageNumber !== pageNumber) {
            return page;
          }

          return {
            ...page,

            annotations: page.annotations.map((annotation) => {
              if (annotation.type === "draw" && annotation.isTemporary) {
                return {
                  ...annotation,

                  isTemporary: false,
                };
              }

              return annotation;
            }),
          };
        }),
      );

      setStartPoint(null);

      return;
    }

    // SHAPES

    if (
      activeTool === "rectangle" ||
      activeTool === "highlight" ||
      activeTool === "circle"
    ) {
      const x = Math.min(startPoint.x, point.x);

      const y = Math.min(startPoint.y, point.y);

      const width = Math.abs(point.x - startPoint.x);

      const height = Math.abs(point.y - startPoint.y);

      if (width > 0.005 && height > 0.005) {
        addAnnotation(pageNumber, {
          type: activeTool,

          x,

          y,

          width,

          height,

          color,

          lineWidth,
        });
      }
    }

    // LINE

    if (activeTool === "line") {
      const distance = Math.sqrt(
        Math.pow(point.x - startPoint.x, 2) +
          Math.pow(point.y - startPoint.y, 2),
      );

      if (distance > 0.005) {
        addAnnotation(pageNumber, {
          type: "line",

          x: startPoint.x,

          y: startPoint.y,

          x2: point.x,

          y2: point.y,

          color,

          lineWidth,
        });
      }
    }

    setStartPoint(null);
  };

  // ADD ANNOTATION

  const addAnnotation = (pageNumber, annotation) => {
    setPages((previousPages) =>
      previousPages.map((page) => {
        if (page.pageNumber !== pageNumber) {
          return page;
        }

        return {
          ...page,

          annotations: [
            ...page.annotations,

            {
              id: `${Date.now()}-${Math.random()}`,

              ...annotation,
            },
          ],
        };
      }),
    );
  };

  // ADD / UPDATE TEXT

  const saveTextAnnotation = () => {
    if (!textInput.trim()) {
      return;
    }

    // UPDATE EXISTING TEXT

    if (editingTextId && selectedAnnotation) {
      setPages((previousPages) =>
        previousPages.map((page) => {
          if (page.pageNumber !== selectedAnnotation.pageNumber) {
            return page;
          }

          return {
            ...page,

            annotations: page.annotations.map((annotation) => {
              if (annotation.id !== editingTextId) {
                return annotation;
              }

              return {
                ...annotation,

                text: textInput.trim(),

                color,

                fontSize,

                fontFamily,

                fontBold,

                fontItalic,

                textAlign,

                background: textBackground,

                backgroundColor: textBackgroundColor,

                rotation: textRotation,
              };
            }),
          };
        }),
      );

      setShowTextModal(false);

      setEditingTextId(null);

      setSelectedAnnotation(null);

      setTextInput("");

      return;
    }

    // ADD NEW TEXT

    if (!textPosition) {
      return;
    }

    // Current page is determined by click handler.
    // Stored temporarily in textPosition.
    if (!textPosition.pageNumber) {
      return;
    }

    addAnnotation(textPosition.pageNumber, {
      type: "text",

      x: textPosition.x,

      y: textPosition.y,

      text: textInput.trim(),

      color,

      fontSize,

      fontFamily,

      fontBold,

      fontItalic,

      textAlign,

      background: textBackground,

      backgroundColor: textBackgroundColor,

      rotation: textRotation,
    });

    setShowTextModal(false);

    setTextInput("");

    setTextPosition(null);
  };

  // TEXT CLICK HANDLER FIX

  const openTextModal = (pageNumber, point) => {
    setTextPosition({
      pageNumber,
      x: point.x,
      y: point.y,
    });

    setEditingTextId(null);

    setTextInput("");

    setShowTextModal(true);
  };

  // EDIT SELECTED TEXT

  const editSelectedText = () => {
    if (!selectedAnnotation) {
      return;
    }

    const page = pages.find(
      (item) => item.pageNumber === selectedAnnotation.pageNumber,
    );

    if (!page) return;

    const annotation = page.annotations.find(
      (item) => item.id === selectedAnnotation.annotationId,
    );

    if (!annotation || annotation.type !== "text") {
      return;
    }

    setTextInput(annotation.text || "");

    setColor(annotation.color || "#ff0000");

    setFontSize(annotation.fontSize || 18);

    setFontFamily(annotation.fontFamily || "Arial");

    setFontBold(annotation.fontBold || false);

    setFontItalic(annotation.fontItalic || false);

    setTextAlign(annotation.textAlign || "left");

    setTextBackground(annotation.background || false);

    setTextBackgroundColor(annotation.backgroundColor || "#ffffff");

    setTextRotation(annotation.rotation || 0);

    setEditingTextId(annotation.id);

    setShowTextModal(true);
  };

  // DELETE SELECTED TEXT

  const deleteSelectedAnnotation = () => {
    if (!selectedAnnotation) {
      return;
    }

    setPages((previousPages) =>
      previousPages.map((page) => {
        if (page.pageNumber !== selectedAnnotation.pageNumber) {
          return page;
        }

        return {
          ...page,

          annotations: page.annotations.filter(
            (annotation) => annotation.id !== selectedAnnotation.annotationId,
          ),
        };
      }),
    );

    setSelectedAnnotation(null);
  };

  // UNDO PAGE

  const undoPage = (pageNumber) => {
    setPages((previousPages) =>
      previousPages.map((page) => {
        if (page.pageNumber !== pageNumber) {
          return page;
        }

        return {
          ...page,

          annotations: page.annotations.slice(0, -1),
        };
      }),
    );

    setSelectedAnnotation(null);
  };

  // CLEAR PAGE

  const clearPage = (pageNumber) => {
    setPages((previousPages) =>
      previousPages.map((page) => {
        if (page.pageNumber !== pageNumber) {
          return page;
        }

        return {
          ...page,

          annotations: [],
        };
      }),
    );

    setSelectedAnnotation(null);
  };

  // DOWNLOAD

  const handleAnnotate = async () => {
    try {
      setError("");
      setSuccess("");

      if (!file) {
        setError("Please upload a PDF first.");

        return;
      }

      const hasAnnotations = pages.some((page) => page.annotations.length > 0);

      if (!hasAnnotations) {
        setError("Please add at least one annotation.");

        return;
      }

      setProcessing(true);

      const annotations = pages.map((page) => ({
        pageNumber: page.pageNumber,

        annotations: page.annotations.map(
          ({ isTemporary, ...annotation }) => annotation,
        ),
      }));

      const formData = new FormData();

      formData.append("file", file);

      formData.append("annotations", JSON.stringify(annotations));

      const response = await fetch(API_URL, {
        method: "POST",

        body: formData,
      });

      if (!response.ok) {
        let message = "Failed to annotate PDF.";

        try {
          const data = await response.json();

          message = data.message || message;
        } catch {}

        throw new Error(message);
      }

      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = downloadUrl;

      anchor.download = "annotated.pdf";

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setSuccess("PDF annotated successfully.");
    } catch (err) {
      console.error("Annotate PDF Error:", err);

      setError(err.message || "Failed to annotate PDF.");
    } finally {
      setProcessing(false);
    }
  };

  // REMOVE FILE

  const removeFile = () => {
    setFile(null);

    setPages([]);

    setError("");

    setSuccess("");

    setSelectedAnnotation(null);

    setShowTextModal(false);
  };

  // TOOL CLICK

  const handleToolChange = (toolId) => {
    setActiveTool(toolId);

    setSelectedAnnotation(null);

    setDrawing(false);

    setStartPoint(null);
  };

  // RETURN

  return (
    <div className="annotate-page">
      {/* ====================================================
          HEADER
      ==================================================== */}


<div className="annotate-header">
  <div className="annotate-header-content">
    <h1>Annotate PDF</h1>
    <p>Add text, highlights, drawings and shapes to your PDF.</p>
  </div>

  {file && (
    <button
      type="button"
      className="download-btn header-download-btn"
      onClick={handleAnnotate}
      disabled={processing || loading}
    >
      <Download size={20} />
      {processing ? "Creating PDF..." : "Download Annotated PDF"}
    </button>
  )}
</div>



      {/* ====================================================
          UPLOAD
      ==================================================== */}

      {!file && (
        <div className="annotate-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            hidden
          />

          <div
            className="upload-box"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={42} />

            <h3>Upload PDF</h3>

            <p>Click to select your PDF file</p>
          </div>
        </div>
      )}

                         {/* ==================================================
              MESSAGES
          ================================================== */}

          {error && <div className="annotate-message error">{error}</div>}

          {success && <div className="annotate-message success">{success}</div>}



      {/* ====================================================
          FILE CONTENT
      ==================================================== */}

      {file && (
        <>
          {/* ==================================================
              FILE BAR
          ================================================== */}

          <div className="annotate-file-bar">
            <div className="file-info">
              <FileText size={22} />

              <div>
                <strong>{file.name}</strong>

                <span>{pages.length} pages</span>
              </div>
            </div>

            <button
              type="button"
              className="remove-file-btn"
              onClick={removeFile}
            >
              <X size={18} />
              Remove
            </button>
          </div>

          {/* ==================================================
              TOOLBAR
          ================================================== */}

          <div className="annotate-toolbar">
            <div className="tool-group">
              {tools.map((tool) => {
                const Icon = tool.icon;

                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={
                      activeTool === tool.id ? "tool-btn active" : "tool-btn"
                    }
                    onClick={() => handleToolChange(tool.id)}
                    title={tool.label}
                  >
                    <Icon size={17} />

                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ==================================================
                OPTIONS
            ================================================== */}

            <div className="tool-options">
              {/* COLOR */}

              <label>Color</label>

              <div className="color-list">
                {COLORS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={
                      color === item ? "color-btn selected" : "color-btn"
                    }
                    style={{
                      backgroundColor: item,
                    }}
                    onClick={() => setColor(item)}
                  />
                ))}
              </div>

              {/* WIDTH */}

              <label>Width</label>

              <select
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
              >
                <option value="1">1px</option>

                <option value="2">2px</option>

                <option value="3">3px</option>

                <option value="5">5px</option>

                <option value="8">8px</option>
              </select>

              {/* TEXT SIZE */}

              <label>Text</label>

              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              >
                <option value="12">12</option>

                <option value="16">16</option>

                <option value="18">18</option>

                <option value="24">24</option>

                <option value="32">32</option>

                <option value="40">40</option>

                <option value="48">48</option>
              </select>
            </div>
          </div>

          {/* ==================================================
              TEXT EDIT TOOLBAR
          ================================================== */}

          {activeTool === "text" && (
            <div className="text-options-panel">
              <div className="text-option-item">
                <label>Font</label>

                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={fontBold ? "format-btn active" : "format-btn"}
                onClick={() => setFontBold(!fontBold)}
                title="Bold"
              >
                <Bold size={17} />
              </button>

              <button
                type="button"
                className={fontItalic ? "format-btn active" : "format-btn"}
                onClick={() => setFontItalic(!fontItalic)}
                title="Italic"
              >
                <Italic size={17} />
              </button>

              <button
                type="button"
                className={
                  textAlign === "left" ? "format-btn active" : "format-btn"
                }
                onClick={() => setTextAlign("left")}
              >
                <AlignLeft size={17} />
              </button>

              <button
                type="button"
                className={
                  textAlign === "center" ? "format-btn active" : "format-btn"
                }
                onClick={() => setTextAlign("center")}
              >
                <AlignCenter size={17} />
              </button>

              <button
                type="button"
                className={
                  textAlign === "right" ? "format-btn active" : "format-btn"
                }
                onClick={() => setTextAlign("right")}
              >
                <AlignRight size={17} />
              </button>

              <div className="text-option-item">
                <label>Rotation</label>

                <select
                  value={textRotation}
                  onChange={(e) => setTextRotation(Number(e.target.value))}
                >
                  <option value="0">0°</option>

                  <option value="45">45°</option>

                  <option value="90">90°</option>

                  <option value="180">180°</option>

                  <option value="270">270°</option>

                  <option value="-45">-45°</option>

                  <option value="-90">-90°</option>
                </select>
              </div>

              <label className="background-check">
                <input
                  type="checkbox"
                  checked={textBackground}
                  onChange={(e) => setTextBackground(e.target.checked)}
                />
                Background
              </label>
            </div>
          )}


          {/* ==================================================
              SELECTED TEXT ACTIONS
          ================================================== */}

          {activeTool === "select" && selectedAnnotation && (
            <div className="selected-text-toolbar">
              <span>Text selected</span>

              <button type="button" onClick={editSelectedText}>
                <Type size={16} />
                Edit Text
              </button>

              <button
                type="button"
                className="delete-selected-btn"
                onClick={deleteSelectedAnnotation}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}

 
          {/* ==================================================
              PDF PAGES
          ================================================== */}

          <div className="pdf-pages-container">
            {loading && <div className="loading-state">Loading PDF...</div>}

            {pages.map((page) => (
              <div className="pdf-page-wrapper" key={page.pageNumber}>
                <div className="page-heading">
                  <span>Page {page.pageNumber}</span>

                  <div className="page-actions">
                    <button
                      type="button"
                      onClick={() => undoPage(page.pageNumber)}
                      title="Undo"
                      disabled={page.annotations.length === 0}
                    >
                      <Undo2 size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => clearPage(page.pageNumber)}
                      title="Clear"
                      disabled={page.annotations.length === 0}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <div
                  className="pdf-canvas-container"
                  style={{
                    aspectRatio: `${page.width}/${page.height}`,
                  }}
                >
                  <canvas
                    ref={(element) => {
                      canvasRefs.current[page.pageNumber] = element;
                    }}
                  />

                  <canvas
                    ref={(element) => {
                      overlayRefs.current[page.pageNumber] = element;
                    }}
                    className={
                      activeTool === "select"
                        ? "annotation-overlay select-mode"
                        : "annotation-overlay"
                    }
                    onPointerDown={(event) => {
                      if (activeTool === "text") {
                        const point = getPointerPosition(
                          event,
                          page.pageNumber,
                        );

                        openTextModal(page.pageNumber, point);

                        return;
                      }

                      handlePointerDown(event, page.pageNumber);
                    }}
                    onPointerMove={(event) =>
                      handlePointerMove(event, page.pageNumber)
                    }
                    onPointerUp={(event) =>
                      handlePointerUp(event, page.pageNumber)
                    }
                    onPointerLeave={(event) => {
                      if (drawing) {
                        handlePointerUp(event, page.pageNumber);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ======================================================
          TEXT MODAL
      ====================================================== */}

      {showTextModal && (
        <div
          className="text-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowTextModal(false);
            }
          }}
        >
          <div className="text-modal">
            <div className="text-modal-header">
              <div>
                <h3>{editingTextId ? "Edit Text" : "Add Text"}</h3>

                <p>Enter the text you want to place on the PDF.</p>
              </div>

              <button type="button" onClick={() => setShowTextModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* TEXT */}

            <div className="text-input-wrapper">
              <label>Text</label>

              <textarea
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your text here..."
                rows={5}
              />
            </div>

            {/* PREVIEW */}

            <div className="text-preview-box">
              <span>Preview</span>

              <div
                style={{
                  fontFamily,
                  fontSize: `${Math.min(fontSize, 32)}px`,
                  fontWeight: fontBold ? 700 : 400,
                  fontStyle: fontItalic ? "italic" : "normal",
                  color,
                  textAlign,
                  background: textBackground
                    ? textBackgroundColor
                    : "transparent",
                  transform: `rotate(${textRotation}deg)`,
                  padding: textBackground ? "5px 8px" : "0",
                  whiteSpace: "pre-wrap",
                  width: "100%",
                }}
              >
                {textInput || "Your text preview"}
              </div>
            </div>

            {/* SETTINGS */}

            <div className="text-modal-grid">
              <div className="text-option-item">
                <label>Font</label>

                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-option-item">
                <label>Size</label>

                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                >
                  <option value="12">12px</option>

                  <option value="16">16px</option>

                  <option value="18">18px</option>

                  <option value="24">24px</option>

                  <option value="32">32px</option>

                  <option value="40">40px</option>

                  <option value="48">48px</option>
                </select>
              </div>

              <div className="text-option-item">
                <label>Rotation</label>

                <select
                  value={textRotation}
                  onChange={(e) => setTextRotation(Number(e.target.value))}
                >
                  <option value="0">0°</option>

                  <option value="45">45°</option>

                  <option value="90">90°</option>

                  <option value="180">180°</option>

                  <option value="270">270°</option>

                  <option value="-45">-45°</option>

                  <option value="-90">-90°</option>
                </select>
              </div>
            </div>

            {/* FORMAT */}

            <div className="text-modal-format">
              <button
                type="button"
                className={fontBold ? "format-btn active" : "format-btn"}
                onClick={() => setFontBold(!fontBold)}
              >
                <Bold size={17} />
                Bold
              </button>

              <button
                type="button"
                className={fontItalic ? "format-btn active" : "format-btn"}
                onClick={() => setFontItalic(!fontItalic)}
              >
                <Italic size={17} />
                Italic
              </button>

              <button
                type="button"
                className={
                  textAlign === "left" ? "format-btn active" : "format-btn"
                }
                onClick={() => setTextAlign("left")}
              >
                <AlignLeft size={17} />
              </button>

              <button
                type="button"
                className={
                  textAlign === "center" ? "format-btn active" : "format-btn"
                }
                onClick={() => setTextAlign("center")}
              >
                <AlignCenter size={17} />
              </button>

              <button
                type="button"
                className={
                  textAlign === "right" ? "format-btn active" : "format-btn"
                }
                onClick={() => setTextAlign("right")}
              >
                <AlignRight size={17} />
              </button>
            </div>

            {/* BACKGROUND */}

            <label className="background-option">
              <input
                type="checkbox"
                checked={textBackground}
                onChange={(e) => setTextBackground(e.target.checked)}
              />

              <span>Add text background</span>
            </label>

            {/* ACTIONS */}

            <div className="text-modal-actions">
              <button
                type="button"
                className="cancel-text-btn"
                onClick={() => setShowTextModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-text-btn"
                onClick={saveTextAnnotation}
                disabled={!textInput.trim()}
              >
                {editingTextId ? "Update Text" : "Add Text"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotatePDF;
