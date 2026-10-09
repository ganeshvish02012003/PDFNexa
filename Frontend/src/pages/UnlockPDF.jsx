import React, {
  useRef,
  useState,
} from "react";

const UnlockPDF = () => {
  /*
   * =====================================================
   * STATE
   * =====================================================
   */

  const [file, setFile] =
    useState(null);

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

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

    /*
     * PDF validation
     */

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

    setFile(selectedFile);
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

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  /*
   * =====================================================
   * UNLOCK PDF
   * =====================================================
   */

  const handleUnlock = async () => {
    setError("");
    setSuccess("");

    /*
     * File validation
     */

    if (!file) {
      setError(
        "Please select a PDF file."
      );

      return;
    }

    /*
     * Password validation
     */

    if (!password) {
      setError(
        "Please enter the PDF password."
      );

      return;
    }

    try {
      setLoading(true);

      /*
       * =================================================
       * FORM DATA
       * =================================================
       */

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "password",
        password
      );

      /*
       * =================================================
       * API REQUEST
       * =================================================
       */

      const response =
        await fetch(
          "http://localhost:8080/api/pdf/unlock",
          {
            method: "POST",

            /*
             * IMPORTANT
             *
             * credentials must be
             * "include", not true.
             */

            credentials: "include",

            body: formData,
          }
        );

      /*
       * =================================================
       * ERROR RESPONSE
       * =================================================
       */

      if (!response.ok) {
        let message =
          "Failed to unlock PDF.";

        try {
          const data =
            await response.json();

          if (data?.message) {
            message =
              data.message;
          }
        } catch {
          // Response was not JSON
        }

        throw new Error(
          message
        );
      }

      /*
       * =================================================
       * GET PDF BLOB
       * =================================================
       */

      const blob =
        await response.blob();

      if (
        !blob ||
        blob.size === 0
      ) {
        throw new Error(
          "Unlocked PDF is empty."
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
        "unlocked.pdf";

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      /*
       * Release blob URL
       */

      window.URL.revokeObjectURL(
        downloadUrl
      );

      /*
       * =================================================
       * SUCCESS
       * =================================================
       */

      setSuccess(
        "PDF unlocked successfully!"
      );
    } catch (error) {
      console.error(
        "Unlock PDF Error:",
        error
      );

      setError(
        error?.message ||
          "Failed to unlock PDF."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">

      <div className="mx-auto max-w-3xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8 text-center">

          <h1 className="text-3xl font-bold text-slate-900">
            Unlock PDF
          </h1>

          <p className="mt-2 text-slate-500">
            Remove password protection from
            your PDF file.
          </p>

        </div>

        {/* =================================================
            MAIN CARD
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
                🔐
              </div>

              <h2 className="text-lg font-semibold text-slate-800">
                Upload Protected PDF
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Click to select your PDF
              </p>

              <p className="mt-1 text-xs text-slate-400">
                PDF files only
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
              PASSWORD
          ================================================= */}

          {file && (
            <div className="mt-6">

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                PDF Password
              </label>

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter PDF password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) =>
                        !value
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-500 hover:text-slate-800"
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

              <p className="mt-2 text-xs text-slate-400">
                Enter the password used to open
                the protected PDF.
              </p>

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

          {/* =================================================
              UNLOCK BUTTON
          ================================================= */}

          {file && (
            <button
              type="button"
              onClick={
                handleUnlock
              }
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Unlocking PDF...
                </>
              ) : (
                <>
                  🔓 Unlock PDF
                </>
              )}
            </button>
          )}

        </div>

        {/* =================================================
            INFO
        ================================================= */}

        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">

          <p className="font-semibold">
            🔒 Your PDF password
          </p>

          <p className="mt-1 text-blue-700">
            The password is used only to unlock
            the uploaded PDF. The original
            protected PDF is not modified.
          </p>

        </div>

      </div>

    </div>
  );
};

export default UnlockPDF;