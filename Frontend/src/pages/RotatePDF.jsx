import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const API_URL = "http://localhost:8080";

function RotatePDF() {
  const [file, setFile] = useState(null);

  const [pageCount, setPageCount] = useState(0);

  const [rotations, setRotations] = useState([]);

  const [loading, setLoading] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);

  const [error, setError] = useState("");

  const [pages, setPages] = useState([]);

  const canvasRefs = useRef([]);

  /*
   * Load PDF and create page previews
   */
  const loadPDFPreview = async (selectedFile) => {
    try {
      setPreviewLoading(true);
      setError("");

      const arrayBuffer =
        await selectedFile.arrayBuffer();

      const pdfDocument =
        await pdfjsLib.getDocument({
          data: arrayBuffer,
        }).promise;

      const totalPages =
        pdfDocument.numPages;

      setPageCount(totalPages);

      setRotations(
        Array(totalPages).fill(0)
      );

      const renderedPages = [];

      /*
       * Render every PDF page
       */
      for (
        let pageNumber = 1;
        pageNumber <= totalPages;
        pageNumber++
      ) {
        const page =
          await pdfDocument.getPage(
            pageNumber
          );

        const viewport =
          page.getViewport({
            scale: 1.2,
          });

        const canvas =
          document.createElement(
            "canvas"
          );

        const context =
          canvas.getContext("2d");

        canvas.width =
          viewport.width;

        canvas.height =
          viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        renderedPages.push({
          pageNumber,
          canvas,
          width: viewport.width,
          height: viewport.height,
        });
      }

      setPages(renderedPages);
    } catch (error) {
      console.error(
        "PDF Preview Error:",
        error
      );

      setError(
        "Unable to generate PDF preview."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  /*
   * File upload
   */
  const handleFileChange = async (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      setError(
        "Please select a PDF file."
      );

      return;
    }

    setFile(selectedFile);

    await loadPDFPreview(
      selectedFile
    );
  };

  /*
   * Rotate individual page
   */
  const rotatePage = (
    index,
    degrees
  ) => {
    setRotations((current) => {
      const updated = [
        ...current,
      ];

      updated[index] =
        (
          updated[index] +
          degrees
        ) % 360;

      return updated;
    });
  };

  /*
   * Rotate all pages
   */
  const rotateAll = (
    degrees
  ) => {
    setRotations((current) =>
      current.map(
        (rotation) =>
          (
            rotation +
            degrees
          ) % 360
      )
    );
  };

  /*
   * Reset rotations
   */
  const resetAll = () => {
    setRotations(
      Array(pageCount).fill(0)
    );
  };

  /*
   * Remove PDF
   */
  const removeFile = () => {
    setFile(null);
    setPageCount(0);
    setRotations([]);
    setPages([]);
    setError("");
  };

  /*
   * Generate rotated PDF
   */
  const handleRotate = async () => {
    if (!file) {
      setError(
        "Please select a PDF file."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "rotations",
        JSON.stringify(
          rotations
        )
      );

      const response =
        await fetch(
          `${API_URL}/api/pdf/rotate`,
          {
            method: "POST",
            body: formData,
          }
        );

      if (!response.ok) {
        let message =
          "Failed to rotate PDF.";

        try {
          const data =
            await response.json();

          message =
            data.message ||
            message;
        } catch {}

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        "rotated.pdf";

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Draw rendered PDF canvas
   * into React canvas
   */
  useEffect(() => {
    pages.forEach(
      (pageData, index) => {
        const targetCanvas =
          canvasRefs.current[index];

        if (!targetCanvas) {
          return;
        }

        const sourceCanvas =
          pageData.canvas;

        const context =
          targetCanvas.getContext(
            "2d"
          );

        const rotation =
          rotations[index] || 0;

        const radians =
          (rotation *
            Math.PI) /
          180;

        const sourceWidth =
          sourceCanvas.width;

        const sourceHeight =
          sourceCanvas.height;

        const isRotated =
          rotation === 90 ||
          rotation === 270;

        targetCanvas.width =
          isRotated
            ? sourceHeight
            : sourceWidth;

        targetCanvas.height =
          isRotated
            ? sourceWidth
            : sourceHeight;

        context.clearRect(
          0,
          0,
          targetCanvas.width,
          targetCanvas.height
        );

        context.save();

        context.translate(
          targetCanvas.width / 2,
          targetCanvas.height / 2
        );

        context.rotate(
          radians
        );

        context.drawImage(
          sourceCanvas,
          -sourceWidth / 2,
          -sourceHeight / 2
        );

        context.restore();
      }
    );
  }, [pages, rotations]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">

      <div className="mx-auto max-w-6xl">

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">

          {/* Header */}

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Rotate PDF
            </h1>

            <p className="mt-2 text-gray-600">
              Rotate individual pages or
              the entire PDF.
            </p>
          </div>

          {/* Error */}

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Upload */}

          {!file && (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center">

              <div className="text-5xl">
                📄
              </div>

              <h2 className="mt-4 text-lg font-semibold">
                Upload your PDF
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Preview and rotate your PDF
                pages.
              </p>

              <label className="mt-5 inline-flex cursor-pointer rounded-lg bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800">

                Select PDF

                <input
                  type="file"
                  accept="application/pdf"
                  onChange={
                    handleFileChange
                  }
                  className="hidden"
                />

              </label>

            </div>
          )}

          {/* PDF Loaded */}

          {file && (
            <>
              {/* File information */}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-gray-50 p-4">

                <div className="min-w-0">

                  <p className="truncate font-semibold text-gray-900">
                    {file.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {pageCount}{" "}
                    {pageCount === 1
                      ? "page"
                      : "pages"}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    removeFile
                  }
                  className="rounded-lg border border-red-200 px-4 py-2 text-red-600 transition hover:bg-red-50"
                >
                  Remove
                </button>

              </div>

              {/* Global Controls */}

              <div className="mt-6 flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() =>
                    rotateAll(90)
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-100"
                >
                  ↻ Rotate All Right
                </button>

                <button
                  type="button"
                  onClick={() =>
                    rotateAll(-90)
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-100"
                >
                  ↺ Rotate All Left
                </button>

                <button
                  type="button"
                  onClick={() =>
                    rotateAll(180)
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-100"
                >
                  180° All
                </button>

                <button
                  type="button"
                  onClick={
                    resetAll
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-100"
                >
                  Reset
                </button>

              </div>

              {/* Preview */}

              {previewLoading ? (
                <div className="mt-10 flex min-h-80 items-center justify-center rounded-xl border bg-gray-50">

                  <div className="text-center">

                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-black" />

                    <p className="mt-4 text-sm text-gray-500">
                      Generating PDF preview...
                    </p>

                  </div>

                </div>
              ) : (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                  {pages.map(
                    (
                      pageData,
                      index
                    ) => (
                      <div
                        key={
                          pageData.pageNumber
                        }
                        className="overflow-hidden rounded-xl border bg-gray-50 p-4"
                      >

                        {/* Page title */}

                        <div className="flex items-center justify-between">

                          <span className="font-semibold text-gray-900">
                            Page{" "}
                            {
                              pageData.pageNumber
                            }
                          </span>

                          <span className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-600">
                            {
                              rotations[
                                index
                              ]
                            }°
                          </span>

                        </div>

                        {/* Actual PDF Preview */}

                        <div className="mt-4 flex min-h-72 items-center justify-center overflow-hidden rounded-lg bg-gray-200 p-4">

                          <canvas
                            ref={(element) => {
                              canvasRefs.current[
                                index
                              ] =
                                element;
                            }}
                            className="h-32 max-w-full rounded bg-white shadow-md"
                          />

                        </div>

                        {/* Controls */}

                        <div className="mt-4 grid grid-cols-2 gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              rotatePage(
                                index,
                                -90
                              )
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-100"
                          >
                            ↺ Left
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              rotatePage(
                                index,
                                90
                              )
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-100"
                          >
                            ↻ Right
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

              {/* Download */}

              {!previewLoading && (
                <button
                  type="button"
                  onClick={
                    handleRotate
                  }
                  disabled={loading}
                  className="mt-8 flex w-full items-center justify-center rounded-lg bg-black px-6 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loading ? (
                    <>
                      <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />

                      Processing PDF...
                    </>
                  ) : (
                    "Rotate PDF & Download"
                  )}
                </button>
              )}

            </>
          )}

        </div>

      </div>

    </div>
  );
}

export default RotatePDF;