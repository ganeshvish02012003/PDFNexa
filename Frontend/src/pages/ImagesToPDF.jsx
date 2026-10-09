import {
  useEffect,
  useState,
} from "react";

const API_URL =
  "http://localhost:8080";

function ImagesToPDF() {
  const [files, setFiles] =
    useState([]);

  const [pageSize, setPageSize] =
    useState("A4");

  const [orientation, setOrientation] =
    useState("portrait");

  const [margin, setMargin] =
    useState("small");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [dragIndex, setDragIndex] =
    useState(null);

  /*
    Cleanup all object URLs
    when component unmounts.
  */
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(
            file.preview
          );
        }
      });
    };
  }, [files]);

  const addFiles = (
    selectedFiles
  ) => {
    const validFiles =
      Array.from(selectedFiles).filter(
        (file) =>
          [
            "image/jpeg",
            "image/png",
          ].includes(file.type)
      );

    if (
      validFiles.length === 0
    ) {
      setError(
        "Please select JPG, JPEG or PNG images."
      );

      return;
    }

    setError("");

    setFiles((previous) => {
      const remaining =
        30 - previous.length;

      if (remaining <= 0) {
        setError(
          "Maximum 30 images are allowed."
        );

        return previous;
      }

      const filesToAdd =
        validFiles
          .slice(0, remaining)
          .map((file) => ({
            id:
              `${Date.now()}-${Math.random()}`,
            file,
            preview:
              URL.createObjectURL(
                file
              ),
          }));

      return [
        ...previous,
        ...filesToAdd,
      ];
    });
  };

  const handleFileChange = (
    event
  ) => {
    addFiles(
      event.target.files
    );

    event.target.value = "";
  };

  const handleDrop = (
    event
  ) => {
    event.preventDefault();

    addFiles(
      event.dataTransfer.files
    );
  };

  const handleDragStart = (
    index
  ) => {
    setDragIndex(index);
  };

  const handleDragOver = (
    event
  ) => {
    event.preventDefault();
  };

  const handleDropOnItem = (
    event,
    targetIndex
  ) => {
    event.preventDefault();

    if (
      dragIndex === null ||
      dragIndex === targetIndex
    ) {
      setDragIndex(null);
      return;
    }

    setFiles((previous) => {
      const updated = [
        ...previous,
      ];

      const [
        movedItem,
      ] = updated.splice(
        dragIndex,
        1
      );

      updated.splice(
        targetIndex,
        0,
        movedItem
      );

      return updated;
    });

    setDragIndex(null);
  };

  const moveFile = (
    index,
    direction
  ) => {
    const newIndex =
      index + direction;

    if (
      newIndex < 0 ||
      newIndex >= files.length
    ) {
      return;
    }

    setFiles((previous) => {
      const updated = [
        ...previous,
      ];

      [
        updated[index],
        updated[newIndex],
      ] = [
        updated[newIndex],
        updated[index],
      ];

      return updated;
    });
  };

  const removeFile = (
    index
  ) => {
    setFiles((previous) => {
      const fileToRemove =
        previous[index];

      if (
        fileToRemove?.preview
      ) {
        URL.revokeObjectURL(
          fileToRemove.preview
        );
      }

      return previous.filter(
        (_, i) => i !== index
      );
    });
  };

  const removeAll = () => {
    files.forEach((item) => {
      if (item.preview) {
        URL.revokeObjectURL(
          item.preview
        );
      }
    });

    setFiles([]);
    setError("");
  };

  const handleCreatePDF =
    async () => {
      if (files.length === 0) {
        setError(
          "Please select at least one image."
        );

        return;
      }

      try {
        setLoading(true);
        setError("");

        const formData =
          new FormData();

        /*
          Important:
          files are appended in the
          exact current UI order.
        */
        files.forEach((item) => {
          formData.append(
            "files",
            item.file
          );
        });

        formData.append(
          "pageSize",
          pageSize
        );

        formData.append(
          "orientation",
          orientation
        );

        formData.append(
          "margin",
          margin
        );

        const response =
          await fetch(
            `${API_URL}/api/pdf/images-to-pdf`,
            {
              method: "POST",
              body: formData,
            }
          );

        if (!response.ok) {
          let message =
            "Failed to create PDF.";

          try {
            const data =
              await response.json();

            message =
              data.message ||
              message;
          } catch {
            // Ignore JSON parsing error
          }

          throw new Error(
            message
          );
        }

        const blob =
          await response.blob();

        const downloadUrl =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          downloadUrl;

        link.download =
          "images-to-pdf.pdf";

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
          downloadUrl
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">

      <div className="mx-auto max-w-5xl">

        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">

          {/* Header */}

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              JPG / PNG to PDF
            </h1>

            <p className="mt-2 text-gray-600">
              Convert multiple images
              into one PDF document.
            </p>
          </div>

          {/* Error */}

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Upload Area */}

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-gray-500 sm:p-12"
          >

            <div className="text-5xl">
              🖼️
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              Drag & drop images here
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              JPG, JPEG and PNG
            </p>

            <label className="mt-5 inline-flex cursor-pointer items-center rounded-lg bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800">
              Select Images

              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={
                  handleFileChange
                }
                className="hidden"
              />
            </label>

            <p className="mt-3 text-xs text-gray-400">
              Maximum 30 images
            </p>

          </div>

          {/* Image List */}

          {files.length > 0 && (
            <div className="mt-8">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-lg font-semibold">
                    Selected Images
                  </h2>

                  <p className="text-sm text-gray-500">
                    {files.length}{" "}
                    {files.length === 1
                      ? "image"
                      : "images"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeAll}
                  className="self-start text-sm font-medium text-red-600 hover:underline sm:self-auto"
                >
                  Remove All
                </button>

              </div>

              <p className="mt-3 text-sm text-gray-500">
                Drag images to change
                their PDF order.
              </p>

              <div className="mt-4 space-y-3">

                {files.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() =>
                        handleDragStart(
                          index
                        )
                      }
                      onDragOver={
                        handleDragOver
                      }
                      onDrop={(event) =>
                        handleDropOnItem(
                          event,
                          index
                        )
                      }
                      className={`flex cursor-grab items-center gap-3 rounded-xl border bg-gray-50 p-3 transition active:cursor-grabbing ${
                        dragIndex ===
                        index
                          ? "border-black opacity-50"
                          : "border-gray-200"
                      }`}
                    >

                      {/* Order */}

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                        {index + 1}
                      </div>

                      {/* Preview */}

                      <img
                        src={
                          item.preview
                        }
                        alt={
                          item.file.name
                        }
                        className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 object-cover"
                      />

                      {/* Name */}

                      <div className="min-w-0 flex-1">

                        <p className="truncate font-medium text-gray-900">
                          {
                            item.file
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {(
                            item.file
                              .size /
                            1024 /
                            1024
                          ).toFixed(
                            2
                          )}{" "}
                          MB
                        </p>

                      </div>

                      {/* Controls */}

                      <div className="flex shrink-0 items-center gap-1">

                        <button
                          type="button"
                          onClick={() =>
                            moveFile(
                              index,
                              -1
                            )
                          }
                          disabled={
                            index ===
                            0
                          }
                          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Move up"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveFile(
                              index,
                              1
                            )
                          }
                          disabled={
                            index ===
                            files.length -
                              1
                          }
                          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Move down"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeFile(
                              index
                            )
                          }
                          className="rounded-md border border-red-200 bg-white px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          title="Remove"
                        >
                          ×
                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

          {/* Options */}

          {files.length > 0 && (
            <div className="mt-8">

              <h2 className="text-lg font-semibold">
                PDF Options
              </h2>

              <div className="mt-4 grid gap-5 md:grid-cols-3">

                {/* Page Size */}

                <div>

                  <label className="text-sm font-semibold text-gray-700">
                    Page Size
                  </label>

                  <select
                    value={
                      pageSize
                    }
                    onChange={(event) =>
                      setPageSize(
                        event.target
                          .value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                  >
                    <option value="A4">
                      A4
                    </option>

                    <option value="Letter">
                      Letter
                    </option>

                    <option value="Original">
                      Original
                    </option>
                  </select>

                </div>

                {/* Orientation */}

                <div>

                  <label className="text-sm font-semibold text-gray-700">
                    Orientation
                  </label>

                  <select
                    value={
                      orientation
                    }
                    disabled={
                      pageSize ===
                      "Original"
                    }
                    onChange={(event) =>
                      setOrientation(
                        event.target
                          .value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-black"
                  >
                    <option value="portrait">
                      Portrait
                    </option>

                    <option value="landscape">
                      Landscape
                    </option>
                  </select>

                  {pageSize ===
                    "Original" && (
                    <p className="mt-1 text-xs text-gray-400">
                      Original size uses
                      the image's
                      orientation.
                    </p>
                  )}

                </div>

                {/* Margin */}

                <div>

                  <label className="text-sm font-semibold text-gray-700">
                    Margin
                  </label>

                  <select
                    value={
                      margin
                    }
                    onChange={(event) =>
                      setMargin(
                        event.target
                          .value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                  >
                    <option value="none">
                      No Margin
                    </option>

                    <option value="small">
                      Small
                    </option>

                    <option value="large">
                      Large
                    </option>
                  </select>

                </div>

              </div>

            </div>
          )}

          {/* Create PDF */}

          {files.length > 0 && (
            <button
              type="button"
              onClick={
                handleCreatePDF
              }
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center rounded-lg bg-black px-6 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading ? (
                <>
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />

                  Creating PDF...
                </>
              ) : (
                "Create PDF"
              )}
            </button>
          )}

        </div>

      </div>

    </div>
  );
}

export default ImagesToPDF;