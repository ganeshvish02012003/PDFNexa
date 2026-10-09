import { useState } from "react";

function SplitPDF() {
  const [file, setFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pages, setPages] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setTotalPages(0);
    setPages("");

    const formData = new FormData();

    formData.append("file", selectedFile);

    try {
      const response = await fetch(
        "http://localhost:8080/api/pdf/info",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setTotalPages(data.totalPages);
    } catch (error) {
      console.error(error);

      alert(
        error.message || "Unable to read PDF"
      );

      setFile(null);
    }
  };

  const handleSplit = async () => {
    if (!file) {
      alert("Please select a PDF");
      return;
    }

    if (!pages.trim()) {
      alert("Please enter page numbers");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("pages", pages);

      const response = await fetch(
        "http://localhost:8080/api/pdf/split",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.message || "Failed to split PDF"
        );
      }

      const blob = await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download = "split.pdf";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Something went wrong"
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
            Split PDF
          </h1>

          <p className="mt-2 text-gray-600">
            Extract selected pages from your PDF.
          </p>

          {!file && (
            <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-12 hover:border-gray-500">

              <div className="text-center">

                <div className="text-5xl">
                  📄
                </div>

                <p className="mt-4 text-lg font-semibold">
                  Select PDF
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Upload a PDF file
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

                {totalPages > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    {totalPages} pages
                  </p>
                )}

              </div>

              {totalPages > 0 && (
                <div className="mt-6">

                  <label className="font-semibold">
                    Pages to extract
                  </label>

                  <input
                    type="text"
                    value={pages}
                    onChange={(e) =>
                      setPages(e.target.value)
                    }
                    placeholder="Example: 1,2,3,5"
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />

                  <p className="mt-2 text-sm text-gray-500">
                    Enter page numbers separated by commas.
                  </p>

                  <button
                    onClick={handleSplit}
                    disabled={loading}
                    className="mt-6 w-full rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800 disabled:bg-gray-400"
                  >
                    {loading
                      ? "Splitting PDF..."
                      : "Split PDF"}
                  </button>

                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default SplitPDF;