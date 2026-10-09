import { useState } from "react";

function MergePDF() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    const pdfFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf"
    );

    setFiles(pdfFiles);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      alert("Please select at least 2 PDF files.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(
        "http://localhost:8080/api/pdf/merge",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to merge PDFs");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "merged.pdf";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while merging PDFs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">

        <div className="rounded-2xl bg-white p-8 shadow-sm">

          <h1 className="text-3xl font-bold text-gray-900">
            Merge PDF
          </h1>

          <p className="mt-2 text-gray-600">
            Combine multiple PDF files into one PDF.
          </p>

          <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-12 transition hover:border-gray-500">

            <div className="text-center">
              <div className="text-5xl">
                📄
              </div>

              <p className="mt-4 text-lg font-medium">
                Select PDF files
              </p>

              <p className="mt-1 text-sm text-gray-500">
                You can select multiple PDF files
              </p>
            </div>

            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {files.length > 0 && (
            <div className="mt-6">

              <h2 className="font-semibold">
                Selected Files
              </h2>

              <div className="mt-3 space-y-2">

                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3"
                  >
                    <span className="truncate">
                      {file.name}
                    </span>

                    <span className="ml-4 text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))}

              </div>

            </div>
          )}

          <button
            onClick={handleMerge}
            disabled={loading || files.length < 2}
            className="mt-8 w-full rounded-lg bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? "Merging PDFs..." : "Merge PDF"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default MergePDF;