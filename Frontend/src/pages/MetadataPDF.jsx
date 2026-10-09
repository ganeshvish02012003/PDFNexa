import React, {
  useRef,
  useState,
} from "react";

const MetadataPDF = () => {
  /*
   * =====================================================
   * STATE
   * =====================================================
   */

  const [file, setFile] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [reading, setReading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [metadata, setMetadata] =
    useState({
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
      creationDate: "",
      modificationDate: "",
    });

  const inputRef =
    useRef(null);

  /*
   * =====================================================
   * FILE SELECT
   * =====================================================
   */

  const handleFileChange = (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isPDF =
      selectedFile.type ===
        "application/pdf" ||
      selectedFile.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPDF) {
      setError(
        "Please select a PDF file."
      );

      event.target.value = "";
      setFile(null);

      return;
    }

    setFile(
      selectedFile
    );

    /*
     * Reset metadata
     */

    setMetadata({
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
      creationDate: "",
      modificationDate: "",
    });
  };

  /*
   * =====================================================
   * REMOVE FILE
   * =====================================================
   */

  const handleRemoveFile = () => {
    setFile(null);

    setError("");
    setSuccess("");

    setMetadata({
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
      creationDate: "",
      modificationDate: "",
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  /*
   * =====================================================
   * READ METADATA
   * =====================================================
   */

  const handleReadMetadata =
    async () => {
      if (!file) {
        setError(
          "Please select a PDF file."
        );

        return;
      }

      try {
        setReading(true);

        setError("");
        setSuccess("");

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        const response =
          await fetch(
            "http://localhost:8080/api/pdf/metadata/read",
            {
              method: "POST",

              credentials: "include",

              body: formData,
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to read PDF metadata."
          );
        }

        if (
          data?.metadata
        ) {
          setMetadata(
            data.metadata
          );
        }

        setSuccess(
          "PDF metadata loaded successfully."
        );
      } catch (error) {
        console.error(
          "Read Metadata Error:",
          error
        );

        setError(
          error?.message ||
            "Failed to read PDF metadata."
        );
      } finally {
        setReading(false);
      }
    };

  /*
   * =====================================================
   * INPUT CHANGE
   * =====================================================
   */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setMetadata(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  /*
   * =====================================================
   * CLEAR METADATA
   * =====================================================
   */

  const handleClearMetadata =
    () => {
      setMetadata({
        title: "",
        author: "",
        subject: "",
        keywords: "",
        creator: "",
        producer: "",
        creationDate: "",
        modificationDate: "",
      });

      setError("");
      setSuccess(
        "Metadata fields cleared. Click Update PDF to apply."
      );
    };

  /*
   * =====================================================
   * UPDATE PDF
   * =====================================================
   */

  const handleUpdateMetadata =
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
        setSuccess("");

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        formData.append(
          "title",
          metadata.title
        );

        formData.append(
          "author",
          metadata.author
        );

        formData.append(
          "subject",
          metadata.subject
        );

        formData.append(
          "keywords",
          metadata.keywords
        );

        formData.append(
          "creator",
          metadata.creator
        );

        formData.append(
          "producer",
          metadata.producer
        );

        formData.append(
          "creationDate",
          metadata.creationDate
        );

        formData.append(
          "modificationDate",
          metadata.modificationDate
        );

        const response =
          await fetch(
            "http://localhost:8080/api/pdf/metadata/update",
            {
              method: "POST",

              credentials: "include",

              body: formData,
            }
          );

        if (!response.ok) {
          let message =
            "Failed to update PDF metadata.";

          try {
            const data =
              await response.json();

            if (
              data?.message
            ) {
              message =
                data.message;
            }
          } catch {
            // Non JSON response
          }

          throw new Error(
            message
          );
        }

        const blob =
          await response.blob();

        if (
          !blob ||
          blob.size === 0
        ) {
          throw new Error(
            "Updated PDF is empty."
          );
        }

        /*
         * =================================================
         * DOWNLOAD
         * =================================================
         */

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
          "metadata-updated.pdf";

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
          downloadUrl
        );

        setSuccess(
          "PDF metadata updated successfully!"
        );
      } catch (error) {
        console.error(
          "Update Metadata Error:",
          error
        );

        setError(
          error?.message ||
            "Failed to update PDF metadata."
        );
      } finally {
        setLoading(false);
      }
    };

const formatDateTimeLocal = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  // Convert to Indian Standard Time (IST)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};
  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">

      <div className="mx-auto max-w-4xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8 text-center">

          <h1 className="text-3xl font-bold text-slate-900">
            PDF Metadata
          </h1>

          <p className="mt-2 text-slate-500">
            View and edit PDF document metadata.
          </p>

        </div>

        {/* =================================================
            CARD
        ================================================= */}

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

          {/* =================================================
              UPLOAD
          ================================================= */}

          {!file ? (
            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-14 transition hover:border-blue-500 hover:bg-blue-50"
            >

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl">
                📄
              </div>

              <h2 className="text-lg font-semibold text-slate-800">
                Upload PDF
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Click to select a PDF file
              </p>

            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 p-4">

              <div className="flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-xl">
                    📄
                  </div>

                  <div className="min-w-0">

                    <p className="truncate font-medium text-slate-800">
                      {file.name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {(
                        file.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    handleRemoveFile
                  }
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>

              </div>

            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={
              handleFileChange
            }
            className="hidden"
          />

          {/* =================================================
              READ BUTTON
          ================================================= */}

          {file && (
            <button
              type="button"
              onClick={
                handleReadMetadata
              }
              disabled={reading}
              className="mt-5 w-full rounded-xl border border-blue-600 px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reading
                ? "Reading Metadata..."
                : "🔍 Read Existing Metadata"}
            </button>
          )}

          {/* =================================================
              METADATA FORM
          ================================================= */}

          {file && (
            <div className="mt-8">

              <div className="mb-5">

                <h2 className="text-xl font-bold text-slate-800">
                  Document Metadata
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Edit the information below and
                  update the PDF.
                </p>

              </div>

              <div className="grid gap-5 md:grid-cols-2">

                {/* TITLE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Title
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={
                      metadata.title
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Document title"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* AUTHOR */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Author
                  </label>

                  <input
                    type="text"
                    name="author"
                    value={
                      metadata.author
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Author name"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* SUBJECT */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Subject
                  </label>

                  <input
                    type="text"
                    name="subject"
                    value={
                      metadata.subject
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Document subject"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* KEYWORDS */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Keywords
                  </label>

                  <input
                    type="text"
                    name="keywords"
                    value={
                      metadata.keywords
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="pdf, document, report"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* CREATOR */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Creator
                  </label>

                  <input
                    type="text"
                    name="creator"
                    value={
                      metadata.creator
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Creator"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* PRODUCER */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Producer
                  </label>

                  <input
                    type="text"
                    name="producer"
                    value={
                      metadata.producer
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Producer"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* CREATION DATE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Creation Date
                  </label>

                  <input
                    type="datetime-local"
                    name="creationDate"
                    value={formatDateTimeLocal(
                      metadata.creationDate
                    )}
                    onChange={
                      handleChange
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* MODIFICATION DATE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Modification Date
                  </label>

                  <input
                    type="datetime-local"
                    name="modificationDate"
                    value={formatDateTimeLocal(
                      metadata.modificationDate
                    )}
                    onChange={
                      handleChange
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>

              {/* =================================================
                  ACTIONS
              ================================================= */}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={
                    handleClearMetadata
                  }
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  🗑️ Clear Fields
                </button>

                <button
                  type="button"
                  onClick={
                    handleUpdateMetadata
                  }
                  disabled={loading}
                  className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Updating PDF..."
                    : "💾 Update & Download PDF"}
                </button>

              </div>

            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* =================================================
              SUCCESS
          ================================================= */}

          {success && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

        </div>

        {/* =================================================
            INFO
        ================================================= */}

        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">

          <p className="font-semibold">
            📌 About PDF Metadata
          </p>

          <p className="mt-1">
            Metadata describes your PDF document,
            including its title, author, subject,
            keywords, creator and producer.
          </p>

        </div>

      </div>
    </div>
  );
};

export default MetadataPDF;