import { useState } from "react";

function PDFToImages() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    setFile(selectedFile);
  };

  const handleConvert = async () => {
    if (!file) {
      alert("Please select a PDF file.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "http://localhost:8080/api/pdf/to-images",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        let message =
          "Failed to convert PDF.";

        try {
          const data =
            await response.json();

          message =
            data.message || message;
        } catch {}

        throw new Error(message);
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        "pdf-images.zip";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">

      <div className="mx-auto max-w-3xl">

        <div className="rounded-2xl bg-white p-8 shadow-sm">

          <h1 className="text-3xl font-bold">
            PDF to JPG / PNG
          </h1>

          <p className="mt-2 text-gray-600">
            Convert every PDF page into an
            image.
          </p>

          {!file && (
            <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-12 transition hover:border-gray-500">

              <div className="text-center">

                <div className="text-5xl">
                  🖼️
                </div>

                <p className="mt-4 text-lg font-semibold">
                  Select PDF
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Upload your PDF file
                </p>

              </div>

              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

            </label>
          )}

          {file && (
            <div className="mt-8">

              <div className="rounded-xl bg-gray-100 p-4">

                <p className="font-medium">
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
                onClick={handleConvert}
                disabled={loading}
                className="mt-6 w-full rounded-lg bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading
                  ? "Converting..."
                  : "Convert to Images"}
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default PDFToImages;