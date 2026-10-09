import { useState } from "react";

const API_URL =
  "http://localhost:8080";

function CompressPDF() {
  const [file, setFile] =
    useState(null);

  const [level, setLevel] =
    useState("recommended");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleFileChange = (
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

      setFile(null);

      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const handleCompress =
    async () => {
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
          "level",
          level
        );

        const response =
          await fetch(
            `${API_URL}/api/pdf/compress`,
            {
              method: "POST",
              body: formData,
            }
          );

        if (!response.ok) {
          let message =
            "Failed to compress PDF.";

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
          "compressed.pdf";

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

      <div className="mx-auto max-w-4xl">

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">

          <h1 className="text-3xl font-bold text-gray-900">
            Compress PDF
          </h1>

          <p className="mt-2 text-gray-600">
            Reduce your PDF file size
            while keeping good quality.
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!file && (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center">

              <div className="text-5xl">
                📄
              </div>

              <h2 className="mt-4 text-lg font-semibold">
                Upload your PDF
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Select a PDF file to
                compress.
              </p>

              <label className="mt-5 inline-flex cursor-pointer rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800">

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

          {file && (
            <div className="mt-8">

              <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-red-100 text-2xl">
                  📄
                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate font-semibold">
                    {file.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFile(null)
                  }
                  className="rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>

              </div>

              <div className="mt-8">

                <h2 className="text-lg font-semibold">
                  Compression Level
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-3">

                  <button
                    type="button"
                    onClick={() =>
                      setLevel("basic")
                    }
                    className={`rounded-xl border p-5 text-left transition ${
                      level ===
                      "basic"
                        ? "border-black bg-gray-100"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="font-semibold">
                      Basic
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Better quality,
                      lower compression.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLevel(
                        "recommended"
                      )
                    }
                    className={`rounded-xl border p-5 text-left transition ${
                      level ===
                      "recommended"
                        ? "border-black bg-gray-100"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="font-semibold">
                      Recommended
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Best balance of
                      size and quality.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLevel("strong")
                    }
                    className={`rounded-xl border p-5 text-left transition ${
                      level ===
                      "strong"
                        ? "border-black bg-gray-100"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="font-semibold">
                      Strong
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Maximum file-size
                      reduction.
                    </p>
                  </button>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  handleCompress
                }
                disabled={loading}
                className="mt-8 flex w-full items-center justify-center rounded-lg bg-black px-6 py-4 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? (
                  <>
                    <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />

                    Compressing...
                  </>
                ) : (
                  "Compress PDF"
                )}
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default CompressPDF;