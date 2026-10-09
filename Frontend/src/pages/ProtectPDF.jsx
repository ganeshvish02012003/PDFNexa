import { useEffect, useRef, useState } from "react";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_DOMAIN || "http://localhost:8080";

const API_URL = `${BACKEND_URL}/api/pdf/protect`;

const ProtectPDF = () => {
  const [file, setFile] = useState(null);

  const [userPassword, setUserPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [ownerPassword, setOwnerPassword] = useState("");

  const [allowPrinting, setAllowPrinting] = useState(true);

  const [allowCopying, setAllowCopying] = useState(false);

  const [allowModification, setAllowModification] = useState(false);

  const [showUserPassword, setShowUserPassword] = useState(false);

  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const fileInputRef = useRef(null);

  /*
   * =====================================================
   * FILE VALIDATION
   * =====================================================
   */

  const validatePDF = (selectedFile) => {
    if (!selectedFile) {
      return false;
    }

    const isPDF =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      setError("Please select a valid PDF file.");

      return false;
    }

    return true;
  };

  /*
   * =====================================================
   * SET FILE
   * =====================================================
   */

  const handleFile = (selectedFile) => {
    setError("");
    setSuccess("");

    if (!validatePDF(selectedFile)) {
      return;
    }

    setFile(selectedFile);
  };

  /*
   * =====================================================
   * FILE INPUT
   * =====================================================
   */

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  /*
   * =====================================================
   * DRAG EVENTS
   * =====================================================
   */

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  /*
   * =====================================================
   * REMOVE FILE
   * =====================================================
   */

  const removeFile = () => {
    setFile(null);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
   * =====================================================
   * FORMAT FILE SIZE
   * =====================================================
   */

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "0 KB";
    }

    const mb = bytes / (1024 * 1024);

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }

    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  /*
   * =====================================================
   * PROTECT PDF
   * =====================================================
   */

  const handleProtect = async () => {
    setError("");
    setSuccess("");

    /*
     * PDF check
     */

    if (!file) {
      setError("Please upload a PDF file.");

      return;
    }

    /*
     * Password check
     */

    if (!userPassword) {
      setError("Please enter a password.");

      return;
    }

    /*
     * Minimum password length
     */

    if (userPassword.length < 4) {
      setError("Password must be at least 4 characters.");

      return;
    }

    /*
     * Confirm password
     */

    if (userPassword !== confirmPassword) {
      setError("Passwords do not match.");

      return;
    }

    /*
     * Owner password is optional.
     *
     * If empty, backend will
     * generate/use a secure owner
     * password.
     */

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("file", file);

      formData.append("userPassword", userPassword);

      formData.append("ownerPassword", ownerPassword);

      formData.append("allowPrinting", String(allowPrinting));

      formData.append("allowCopying", String(allowCopying));

      formData.append("allowModification", String(allowModification));

      const response = await fetch(API_URL, {
        method: "POST",

        body: formData,

        credentials: "include",
      });

      if (!response.ok) {
        let message = "Failed to protect PDF.";

        try {
          const data = await response.json();

          if (data?.message) {
            message = data.message;
          }
        } catch {
          // Ignore JSON parse error
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      /*
       * Download
       */

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;

      link.download = `protected-${file.name}`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setSuccess("PDF protected successfully.");
    } catch (err) {
      console.error("Protect PDF Error:", err);

      setError(err.message || "Failed to protect PDF.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * CLEAN SUCCESS MESSAGE
   * =====================================================
   */

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccess("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [success]);

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-xl text-white">
              🔐
            </div>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Protect PDF
            </h1>
          </div>

          <p className="text-gray-500">
            Add a password and control permissions for your PDF.
          </p>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <span>⚠️</span>

            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <span>✓</span>

            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* =================================================
              LEFT
          ================================================= */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Upload PDF
            </h2>

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex min-h-70 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragActive
                    ? "border-black bg-gray-100"
                    : "border-gray-300 hover:border-gray-500 hover:bg-gray-50"
                }`}
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                  📄
                </div>

                <h3 className="mb-2 text-lg font-semibold text-gray-800">
                  Drop your PDF here
                </h3>

                <p className="mb-4 text-sm text-gray-500">
                  or click to browse from your computer
                </p>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    fileInputRef.current?.click();
                  }}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Choose PDF
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-100 text-2xl">
                    📄
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">
                      {file.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={removeFile}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* =================================================
                SECURITY INFO
            ================================================= */}

            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex gap-3">
                <span>🔒</span>

                <div>
                  <p className="font-medium text-blue-900">
                    Your PDF stays private
                  </p>

                  <p className="mt-1 text-sm text-blue-700">
                    The uploaded file is processed by the PDF server and
                    temporary files are removed after processing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              RIGHT
          ================================================= */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Security Settings
            </h2>

            {/* =================================================
                USER PASSWORD
            ================================================= */}

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={showUserPassword ? "text" : "password"}
                  value={userPassword}
                  onChange={(event) => setUserPassword(event.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                />

                <button
                  type="button"
                  onClick={() => setShowUserPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500"
                >
                  {showUserPassword ? "Hide" : "Show"}
                </button>
              </div>

              <p className="mt-1.5 text-xs text-gray-500">
                Minimum 4 characters.
              </p>
            </div>

            {/* =================================================
                CONFIRM PASSWORD
            ================================================= */}

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Confirm Password
              </label>

              <input
                type={showUserPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* =================================================
                OWNER PASSWORD
            ================================================= */}

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Owner Password
                <span className="ml-2 text-xs font-normal text-gray-400">
                  Optional
                </span>
              </label>

              <div className="relative">
                <input
                  type={showOwnerPassword ? "text" : "password"}
                  value={ownerPassword}
                  onChange={(event) => setOwnerPassword(event.target.value)}
                  placeholder="Optional owner password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                />

                <button
                  type="button"
                  onClick={() => setShowOwnerPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500"
                >
                  {showOwnerPassword ? "Hide" : "Show"}
                </button>
              </div>

              <p className="mt-1.5 text-xs text-gray-500">
                Used for document permissions.
              </p>
            </div>

            {/* =================================================
                PERMISSIONS
            ================================================= */}

            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Permissions
              </h3>

              <div className="space-y-3">
                {/* PRINTING */}

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3 transition hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Allow Printing
                    </p>

                    <p className="text-xs text-gray-500">
                      Users can print the PDF.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={allowPrinting}
                    onChange={(event) => setAllowPrinting(event.target.checked)}
                    className="h-5 w-5 accent-black"
                  />
                </label>

                {/* COPYING */}

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3 transition hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Allow Copying
                    </p>

                    <p className="text-xs text-gray-500">
                      Users can copy text and content.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={allowCopying}
                    onChange={(event) => setAllowCopying(event.target.checked)}
                    className="h-5 w-5 accent-black"
                  />
                </label>

                {/* MODIFICATION */}

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3 transition hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Allow Modification
                    </p>

                    <p className="text-xs text-gray-500">
                      Users can modify the PDF.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={allowModification}
                    onChange={(event) =>
                      setAllowModification(event.target.checked)
                    }
                    className="h-5 w-5 accent-black"
                  />
                </label>
              </div>
            </div>

            {/* =================================================
                PROTECT BUTTON
            ================================================= */}

            <button
              type="button"
              onClick={handleProtect}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Protecting PDF...
                </>
              ) : (
                <>🔐 Protect PDF</>
              )}
            </button>
          </div>
        </div>

        {/* =================================================
            FOOTER INFO
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="grid gap-4 text-sm text-gray-600 sm:grid-cols-3">
            <div className="flex gap-3">
              <span>🔐</span>

              <div>
                <p className="font-medium text-gray-900">Password Protection</p>

                <p className="mt-1">Require a password to open the PDF.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span>🛡️</span>

              <div>
                <p className="font-medium text-gray-900">Permissions</p>

                <p className="mt-1">Control printing, copying and editing.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span>📥</span>

              <div>
                <p className="font-medium text-gray-900">Instant Download</p>

                <p className="mt-1">Download the protected PDF immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectPDF;
