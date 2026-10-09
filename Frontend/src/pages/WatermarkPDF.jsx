// import { useEffect, useRef, useState } from "react";

// import * as pdfjsLib from "pdfjs-dist";

// import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// const API_URL = "http://localhost:8080";

// function WatermarkPDF() {
//   const [file, setFile] = useState(null);

//   const [pages, setPages] = useState([]);

//   const [pageCount, setPageCount] = useState(0);

//   const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");

//   const [opacity, setOpacity] = useState(30);

//   const [fontSize, setFontSize] = useState(40);

//   const [rotation, setRotation] = useState(-45);

//   const [textPosition, setTextPosition] = useState("center");

//   const [imagePosition, setImagePosition] = useState("center");

//   const [selectedPages, setSelectedPages] = useState("all");

//   const [loading, setLoading] = useState(false);

//   const [previewLoading, setPreviewLoading] = useState(false);

//   const [error, setError] = useState("");

//   const canvasRefs = useRef([]);

//   const [fontFamily, setFontFamily] = useState("Helvetica-Bold");

//   const [textColor, setTextColor] = useState("#777777");

//   const [watermarkImage, setWatermarkImage] = useState(null);

//   const [imagePreview, setImagePreview] = useState("");

//   const [imageOpacity, setImageOpacity] = useState(30);

//   const [imageScale, setImageScale] = useState(30);

//   const [imageRotation, setImageRotation] = useState(0);

//   /*
//    * Load PDF
//    */
//   const loadPDF = async (selectedFile) => {
//     try {
//       setPreviewLoading(true);
//       setError("");

//       const buffer = await selectedFile.arrayBuffer();

//       const pdf = await pdfjsLib.getDocument({
//         data: buffer,
//       }).promise;

//       const renderedPages = [];

//       for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
//         const page = await pdf.getPage(pageNumber);

//         const viewport = page.getViewport({
//           scale: 1.2,
//         });

//         const canvas = document.createElement("canvas");

//         const context = canvas.getContext("2d");

//         canvas.width = viewport.width;

//         canvas.height = viewport.height;

//         await page.render({
//           canvasContext: context,
//           viewport,
//         }).promise;

//         renderedPages.push({
//           pageNumber,
//           canvas,
//         });
//       }

//       setPages(renderedPages);

//       setPageCount(pdf.numPages);
//     } catch (error) {
//       console.error(error);

//       setError("Unable to generate PDF preview.");
//     } finally {
//       setPreviewLoading(false);
//     }
//   };

//   /*
//    * Upload
//    */
//   const handleFileChange = async (event) => {
//     const selectedFile = event.target.files?.[0];

//     if (!selectedFile) {
//       return;
//     }

//     if (selectedFile.type !== "application/pdf") {
//       setError("Please select a PDF file.");

//       return;
//     }

//     setFile(selectedFile);

//     await loadPDF(selectedFile);
//   };

//   /*
//    * Selected pages
//    */
//   const isPageSelected = (index) => {
//     if (selectedPages === "all") {
//       return true;
//     }

//     const pagesArray = selectedPages
//       .split(",")
//       .map((page) => Number(page.trim()));

//     return pagesArray.includes(index + 1);
//   };

//   /*
//    * Preview watermark
//    */
//   useEffect(() => {
//     pages.forEach((pageData, index) => {
//       const canvas = canvasRefs.current[index];

//       if (!canvas) {
//         return;
//       }

//       const source = pageData.canvas;

//       const context = canvas.getContext("2d");

//       canvas.width = source.width;

//       canvas.height = source.height;

//       context.clearRect(0, 0, canvas.width, canvas.height);

//       /*
//        * PDF page
//        */
//       context.drawImage(source, 0, 0);

//       if (watermarkImage && imagePreview && isPageSelected(index)) {
//         const logo = new Image();

//         logo.src = imagePreview;

//         logo.onload = () => {
//           const maxWidth = canvas.width * (imageScale / 100);

//           const maxHeight = canvas.height * (imageScale / 100);

//           const scale = Math.min(
//             maxWidth / logo.width,
//             maxHeight / logo.height,
//           );

//           const drawWidth = logo.width * scale;

//           const drawHeight = logo.height * scale;

//           const margin = 30;

//           let x;
//           let y;

//           // -------------------------
//           // POSITION
//           // -------------------------

//           switch (imagePosition) {
//             case "top-left":
//               x = margin;
//               y = margin;
//               break;

//             case "top-center":
//               x = (canvas.width - drawWidth) / 2;

//               y = margin;
//               break;

//             case "top-right":
//               x = canvas.width - drawWidth - margin;

//               y = margin;
//               break;

//             case "center":
//               x = (canvas.width - drawWidth) / 2;

//               y = (canvas.height - drawHeight) / 2;
//               break;

//             case "bottom-left":
//               x = margin;

//               y = canvas.height - drawHeight - margin;

//               break;

//             case "bottom-center":
//               x = (canvas.width - drawWidth) / 2;

//               y = canvas.height - drawHeight - margin;

//               break;

//             case "bottom-right":
//               x = canvas.width - drawWidth - margin;

//               y = canvas.height - drawHeight - margin;

//               break;

//             default:
//               x = (canvas.width - drawWidth) / 2;

//               y = (canvas.height - drawHeight) / 2;
//           }

//           // -------------------------
//           // DRAW ROTATED IMAGE
//           // -------------------------

//           context.save();

//           context.globalAlpha = imageOpacity / 100;

//           context.translate(x + drawWidth / 2, y + drawHeight / 2);

//           context.rotate((imageRotation * Math.PI) / 180);

//           context.drawImage(
//             logo,
//             -drawWidth / 2,
//             -drawHeight / 2,
//             drawWidth,
//             drawHeight,
//           );

//           context.restore();
//         };
//       }

//       /*
//        * Watermark
//        */
//       if (!isPageSelected(index)) {
//         return;
//       }

//       context.save();

//       context.translate(canvas.width / 2, canvas.height / 2);

//       context.rotate((rotation * Math.PI) / 180);

//       context.globalAlpha = opacity / 100;

//       context.fillStyle = textColor;

//       let previewFont = "Arial";

//       switch (fontFamily) {
//         case "Helvetica":
//           previewFont = "Arial";
//           break;

//         case "Helvetica-Bold":
//           previewFont = "Arial";
//           break;

//         case "Helvetica-Oblique":
//           previewFont = "Arial";
//           break;

//         case "Times-Roman":
//           previewFont = "Times New Roman";
//           break;

//         case "Times-Bold":
//           previewFont = "Times New Roman";
//           break;

//         case "Courier":
//           previewFont = "Courier New";
//           break;

//         case "Courier-Bold":
//           previewFont = "Courier New";
//           break;

//         default:
//           previewFont = "Arial";
//       }

//       const isBold = fontFamily.includes("Bold");

//       const isItalic = fontFamily.includes("Oblique");

//       context.font = `${isItalic ? "italic " : ""}${
//         isBold ? "bold " : ""
//       }${fontSize}px ${previewFont}`;

//       context.textAlign = "center";

//       context.textBaseline = "middle";

//       context.fillText(watermarkText || "CONFIDENTIAL", 0, 0);

//       context.restore();
//     });
//   }, [
//     pages,
//     watermarkText,
//     opacity,
//     fontSize,
//     rotation,
//     textPosition,
//     imagePosition,
//     selectedPages,
//     fontFamily,
//     textColor,
//   ]);

//   /*
//    * Reset
//    */
//   const reset = () => {
//     setFile(null);
//     setPages([]);
//     setPageCount(0);
//     setError("");

//     setWatermarkText("CONFIDENTIAL");

//     setFontFamily("Helvetica-Bold");

//     setTextColor("#777777");

//     setOpacity(30);

//     setFontSize(40);

//     setRotation(-45);

//     setTextPosition("center");

//     setImagePosition("center");

//     setSelectedPages("all");
//   };

//   /*
//    * Generate PDF
//    */
//   const handleWatermark = async () => {
//     if (!file) {
//       setError("Please select a PDF.");

//       return;
//     }

//     if (!watermarkText.trim()) {
//       setError("Please enter watermark text.");

//       return;
//     }

//     try {
//       setLoading(true);
//       setError("");

//       const formData = new FormData();

//       formData.append("file", file);

//       formData.append("type", "image");

//       formData.append("opacity", String(imageOpacity / 100));

//       formData.append("rotation", String(imageRotation));

//       formData.append("textPosition", textPosition);

//       formData.append("imagePosition", imagePosition);

//       formData.append("type", "both");

//       formData.append("pages", selectedPages);

//       formData.append("imageScale", String(imageScale / 100));

//       formData.append("watermarkImage", watermarkImage);

//       const response = await fetch(`${API_URL}/api/pdf/watermark`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         let message = "Failed to watermark PDF.";

//         try {
//           const data = await response.json();

//           message = data.message || message;
//         } catch {}

//         throw new Error(message);
//       }

//       const blob = await response.blob();

//       const url = window.URL.createObjectURL(blob);

//       const link = document.createElement("a");

//       link.href = url;

//       link.download = "watermarked.pdf";

//       document.body.appendChild(link);

//       link.click();

//       link.remove();

//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error(error);

//       setError(error.message || "Something went wrong.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 px-4 py-10">
//       <div className="mx-auto max-w-6xl">
//         <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
//           <h1 className="text-3xl font-bold">Watermark PDF</h1>

//           <p className="mt-2 text-gray-600">
//             Add a custom text watermark to your PDF.
//           </p>

//           {error && (
//             <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
//               {error}
//             </div>
//           )}

//           {!file && (
//             <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
//               <div className="text-5xl">💧</div>

//               <h2 className="mt-4 text-lg font-semibold">Upload PDF</h2>

//               <label className="mt-5 inline-flex cursor-pointer rounded-lg bg-black px-6 py-3 font-semibold text-white">
//                 Select PDF
//                 <input
//                   type="file"
//                   accept="application/pdf"
//                   onChange={handleFileChange}
//                   className="hidden"
//                 />
//               </label>
//             </div>
//           )}

//           {file && (
//             <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
//               {/* Controls */}

//               <div className="space-y-6">
//                 <div>
//                   <label className="text-sm font-semibold">
//                     Watermark Image
//                   </label>

//                   <input
//                     type="file"
//                     accept="image/png,image/jpeg"
//                     onChange={(e) => {
//                       const selected = e.target.files?.[0];

//                       if (!selected) {
//                         return;
//                       }

//                       setWatermarkImage(selected);

//                       setImagePreview(URL.createObjectURL(selected));
//                     }}
//                     className="mt-2 block w-full rounded-lg border p-2 text-sm"
//                   />
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">
//                     Logo Size: {imageScale}%
//                   </label>

//                   <input
//                     type="range"
//                     min="5"
//                     max="80"
//                     value={imageScale}
//                     onChange={(e) => setImageScale(Number(e.target.value))}
//                     className="mt-3 w-full"
//                   />
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">
//                     Logo Opacity: {imageOpacity}%
//                   </label>

//                   <input
//                     type="range"
//                     min="10"
//                     max="100"
//                     value={imageOpacity}
//                     onChange={(e) => setImageOpacity(Number(e.target.value))}
//                     className="mt-3 w-full"
//                   />
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">Logo Rotation</label>

//                   <select
//                     value={imageRotation}
//                     onChange={(e) => setImageRotation(Number(e.target.value))}
//                     className="mt-2 w-full rounded-lg border px-3 py-2"
//                   >
//                     <option value="-45">-45°</option>

//                     <option value="0">0°</option>

//                     <option value="45">45°</option>

//                     <option value="90">90°</option>

//                     <option value="180">180°</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">
//                     Image Position
//                   </label>

//                   <select
//                     value={imagePosition}
//                     onChange={(e) => setImagePosition(e.target.value)}
//                     className="mt-2 w-full rounded-lg border px-3 py-2"
//                   >
//                     <option value="top-left">Top Left</option>
//                     <option value="top-center">Top Center</option>
//                     <option value="top-right">Top Right</option>
//                     <option value="center">Center</option>
//                     <option value="bottom-left">Bottom Left</option>
//                     <option value="bottom-center">Bottom Center</option>
//                     <option value="bottom-right">Bottom Right</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">
//                     Watermark Text
//                   </label>

//                   <input
//                     type="text"
//                     value={watermarkText}
//                     onChange={(e) => setWatermarkText(e.target.value)}
//                     className="mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
//                     placeholder="CONFIDENTIAL"
//                   />
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">
//                     Opacity: {opacity}%
//                   </label>

//                   <input
//                     type="range"
//                     min="10"
//                     max="100"
//                     value={opacity}
//                     onChange={(e) => setOpacity(Number(e.target.value))}
//                     className="mt-3 w-full"
//                   />
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">Font Size</label>

//                   <input
//                     type="number"
//                     min="10"
//                     max="150"
//                     value={fontSize}
//                     onChange={(e) => setFontSize(Number(e.target.value))}
//                     className="mt-2 w-full rounded-lg border px-3 py-2"
//                   />
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">Font Family</label>

//                   <select
//                     value={fontFamily}
//                     onChange={(e) => setFontFamily(e.target.value)}
//                     className="mt-2 w-full rounded-lg border px-3 py-2"
//                   >
//                     <option value="Helvetica">Helvetica</option>

//                     <option value="Helvetica-Bold">Helvetica Bold</option>

//                     <option value="Helvetica-Oblique">Helvetica Oblique</option>

//                     <option value="Times-Roman">Times Roman</option>

//                     <option value="Times-Bold">Times Bold</option>

//                     <option value="Courier">Courier</option>

//                     <option value="Courier-Bold">Courier Bold</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">Text Color</label>

//                   <div className="mt-2 flex gap-3">
//                     <input
//                       type="color"
//                       value={textColor}
//                       onChange={(e) => setTextColor(e.target.value)}
//                       className="h-10 w-14 cursor-pointer rounded border p-1"
//                     />

//                     <input
//                       type="text"
//                       value={textColor}
//                       onChange={(e) => setTextColor(e.target.value)}
//                       placeholder="#777777"
//                       className="flex-1 rounded-lg border px-3 py-2 uppercase"
//                     />
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">Rotation</label>

//                   <select
//                     value={rotation}
//                     onChange={(e) => setRotation(Number(e.target.value))}
//                     className="mt-2 w-full rounded-lg border px-3 py-2"
//                   >
//                     <option value="-45">-45°</option>

//                     <option value="0">0°</option>

//                     <option value="45">45°</option>

//                     <option value="90">90°</option>

//                     <option value="180">180°</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">Text Position</label>

//                   <select
//                     value={textPosition}
//                     onChange={(e) => setTextPosition(e.target.value)}
//                     className="mt-2 w-full rounded-lg border px-3 py-2"
//                   >
//                     <option value="top-left">Top Left</option>
//                     <option value="top-center">Top Center</option>
//                     <option value="top-right">Top Right</option>
//                     <option value="center">Center</option>
//                     <option value="bottom-left">Bottom Left</option>
//                     <option value="bottom-center">Bottom Center</option>
//                     <option value="bottom-right">Bottom Right</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="text-sm font-semibold">Pages</label>

//                   <select
//                     value={selectedPages === "all" ? "all" : "custom"}
//                     onChange={(e) => {
//                       if (e.target.value === "all") {
//                         setSelectedPages("all");
//                       } else {
//                         setSelectedPages("1");
//                       }
//                     }}
//                     className="mt-2 w-full rounded-lg border px-3 py-2"
//                   >
//                     <option value="all">All Pages</option>

//                     <option value="custom">Selected Pages</option>
//                   </select>

//                   {selectedPages !== "all" && (
//                     <input
//                       type="text"
//                       value={selectedPages}
//                       onChange={(e) => setSelectedPages(e.target.value)}
//                       placeholder="Example: 1,3,5"
//                       className="mt-2 w-full rounded-lg border px-3 py-2"
//                     />
//                   )}
//                 </div>

//                 <button
//                   type="button"
//                   onClick={handleWatermark}
//                   disabled={loading}
//                   className="w-full rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:bg-gray-400"
//                 >
//                   {loading ? "Processing..." : "Apply Watermark"}
//                 </button>

//                 <button
//                   type="button"
//                   onClick={reset}
//                   className="w-full rounded-lg border px-5 py-3 font-semibold"
//                 >
//                   Remove PDF
//                 </button>
//               </div>

//               {/* Preview */}

//               <div>
//                 <div className="mb-4 flex items-center justify-between">
//                   <h2 className="font-semibold">PDF Preview</h2>

//                   <span className="text-sm text-gray-500">
//                     {pageCount} pages
//                   </span>
//                 </div>

//                 {previewLoading ? (
//                   <div className="flex h-96 items-center justify-center rounded-xl border bg-gray-50">
//                     Loading preview...
//                   </div>
//                 ) : (
//                   <div className="grid gap-6 sm:grid-cols-2">
//                     {pages.map((page, index) => (
//                       <div
//                         key={page.pageNumber}
//                         className={`rounded-xl border p-3 ${
//                           isPageSelected(index)
//                             ? "border-black"
//                             : "border-gray-200"
//                         }`}
//                       >
//                         <div className="mb-3 flex justify-between text-sm">
//                           <span className="font-medium">
//                             Page {page.pageNumber}
//                           </span>

//                           {isPageSelected(index) && (
//                             <span className="text-gray-500">Watermark</span>
//                           )}
//                         </div>

//                         <div className="overflow-auto rounded-lg bg-gray-100 p-3">
//                           <canvas
//                             ref={(element) => {
//                               canvasRefs.current[index] = element;
//                             }}
//                             className="mx-auto max-w-full rounded bg-white shadow"
//                           />
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default WatermarkPDF;











import { useEffect, useRef, useState } from "react";

import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const API_URL = "http://localhost:8080";

function WatermarkPDF() {
  const [file, setFile] = useState(null);

  const [pages, setPages] = useState([]);

  const [pageCount, setPageCount] = useState(0);

  /*
   * =========================
   * WATERMARK TYPE
   * =========================
   *
   * text  = Text only
   * image = Image only
   * both  = Text + Image
   */

  const [watermarkType, setWatermarkType] =
    useState("both");

  /*
   * =========================
   * TEXT WATERMARK
   * =========================
   */

  const [watermarkText, setWatermarkText] =
    useState("CONFIDENTIAL");

  const [opacity, setOpacity] =
    useState(30);

  const [fontSize, setFontSize] =
    useState(40);

  const [rotation, setRotation] =
    useState(-45);

  const [textPosition, setTextPosition] =
    useState("center");

  const [fontFamily, setFontFamily] =
    useState("Helvetica-Bold");

  const [textColor, setTextColor] =
    useState("#777777");

  /*
   * =========================
   * IMAGE WATERMARK
   * =========================
   */

  const [watermarkImage, setWatermarkImage] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [imageOpacity, setImageOpacity] =
    useState(30);

  const [imageScale, setImageScale] =
    useState(30);

  const [imageRotation, setImageRotation] =
    useState(0);

  const [imagePosition, setImagePosition] =
    useState("center");

  /*
   * =========================
   * GENERAL
   * =========================
   */

  const [selectedPages, setSelectedPages] =
    useState("all");

  const [loading, setLoading] =
    useState(false);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const canvasRefs = useRef([]);

  /*
   * =========================
   * LOAD PDF
   * =========================
   */

  const loadPDF = async (selectedFile) => {
    try {
      setPreviewLoading(true);
      setError("");

      const buffer =
        await selectedFile.arrayBuffer();

      const pdf =
        await pdfjsLib.getDocument({
          data: buffer,
        }).promise;

      const renderedPages = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page =
          await pdf.getPage(pageNumber);

        const viewport =
          page.getViewport({
            scale: 1.2,
          });

        const canvas =
          document.createElement("canvas");

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
        });
      }

      setPages(renderedPages);

      setPageCount(
        pdf.numPages
      );
    } catch (error) {
      console.error(error);

      setError(
        "Unable to generate PDF preview."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  /*
   * =========================
   * PDF UPLOAD
   * =========================
   */

  const handleFileChange =
    async (event) => {
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

      await loadPDF(
        selectedFile
      );
    };

  /*
   * =========================
   * SELECTED PAGES
   * =========================
   */

  const isPageSelected = (
    index
  ) => {
    if (
      selectedPages === "all"
    ) {
      return true;
    }

    const pagesArray =
      selectedPages
        .split(",")
        .map(
          (page) =>
            Number(
              page.trim()
            )
        );

    return pagesArray.includes(
      index + 1
    );
  };

  /*
   * =========================
   * IMAGE POSITION
   * =========================
   */

  const getImagePosition = (
    position,
    canvasWidth,
    canvasHeight,
    drawWidth,
    drawHeight
  ) => {
    const margin = 30;

    let x;
    let y;

    switch (position) {
      case "top-left":
        x = margin;
        y = margin;
        break;

      case "top-center":
        x =
          (canvasWidth -
            drawWidth) /
          2;

        y = margin;
        break;

      case "top-right":
        x =
          canvasWidth -
          drawWidth -
          margin;

        y = margin;
        break;

      case "center":
        x =
          (canvasWidth -
            drawWidth) /
          2;

        y =
          (canvasHeight -
            drawHeight) /
          2;

        break;

      case "bottom-left":
        x = margin;

        y =
          canvasHeight -
          drawHeight -
          margin;

        break;

      case "bottom-center":
        x =
          (canvasWidth -
            drawWidth) /
          2;

        y =
          canvasHeight -
          drawHeight -
          margin;

        break;

      case "bottom-right":
        x =
          canvasWidth -
          drawWidth -
          margin;

        y =
          canvasHeight -
          drawHeight -
          margin;

        break;

      default:
        x =
          (canvasWidth -
            drawWidth) /
          2;

        y =
          (canvasHeight -
            drawHeight) /
          2;
    }

    return {
      x,
      y,
    };
  };

  /*
   * =========================
   * TEXT POSITION
   * =========================
   */

  const getTextPosition = (
    position,
    canvasWidth,
    canvasHeight,
    textWidth,
    textHeight
  ) => {
    const margin = 30;

    let x;
    let y;

    switch (position) {
      case "top-left":
        x = margin;
        y =
          margin +
          textHeight / 2;

        break;

      case "top-center":
        x =
          canvasWidth / 2;

        y =
          margin +
          textHeight / 2;

        break;

      case "top-right":
        x =
          canvasWidth -
          margin;

        y =
          margin +
          textHeight / 2;

        break;

      case "center":
        x =
          canvasWidth / 2;

        y =
          canvasHeight / 2;

        break;

      case "bottom-left":
        x = margin;

        y =
          canvasHeight -
          margin -
          textHeight / 2;

        break;

      case "bottom-center":
        x =
          canvasWidth / 2;

        y =
          canvasHeight -
          margin -
          textHeight / 2;

        break;

      case "bottom-right":
        x =
          canvasWidth -
          margin;

        y =
          canvasHeight -
          margin -
          textHeight / 2;

        break;

      default:
        x =
          canvasWidth / 2;

        y =
          canvasHeight / 2;
    }

    return {
      x,
      y,
    };
  };

  /*
   * =========================
   * PREVIEW WATERMARK
   * =========================
   */

  useEffect(() => {
    let cancelled = false;

    const renderPreviews =
      async () => {
        for (
          let index = 0;
          index < pages.length;
          index++
        ) {
          if (cancelled) {
            return;
          }

          const pageData =
            pages[index];

          const canvas =
            canvasRefs.current[index];

          if (!canvas) {
            continue;
          }

          const source =
            pageData.canvas;

          const context =
            canvas.getContext("2d");

          canvas.width =
            source.width;

          canvas.height =
            source.height;

          context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          /*
           * =====================
           * PDF PAGE
           * =====================
           */

          context.drawImage(
            source,
            0,
            0
          );

          /*
           * If page isn't selected,
           * don't draw watermark.
           */

          if (
            !isPageSelected(index)
          ) {
            continue;
          }

          /*
           * =====================
           * IMAGE PREVIEW
           * =====================
           */

          if (
            (watermarkType ===
              "image" ||
              watermarkType ===
                "both") &&
            watermarkImage &&
            imagePreview
          ) {
            await new Promise(
              (resolve) => {
                const logo =
                  new Image();

                logo.onload = () => {
                  if (cancelled) {
                    resolve();
                    return;
                  }

                  const maxWidth =
                    canvas.width *
                    (imageScale /
                      100);

                  const maxHeight =
                    canvas.height *
                    (imageScale /
                      100);

                  const scale =
                    Math.min(
                      maxWidth /
                        logo.width,

                      maxHeight /
                        logo.height
                    );

                  const drawWidth =
                    logo.width *
                    scale;

                  const drawHeight =
                    logo.height *
                    scale;

                  const coordinates =
                    getImagePosition(
                      imagePosition,

                      canvas.width,

                      canvas.height,

                      drawWidth,

                      drawHeight
                    );

                  context.save();

                  context.globalAlpha =
                    imageOpacity /
                    100;

                  context.translate(
                    coordinates.x +
                      drawWidth /
                        2,

                    coordinates.y +
                      drawHeight /
                        2
                  );

                  context.rotate(
                    (imageRotation *
                      Math.PI) /
                      180
                  );

                  context.drawImage(
                    logo,

                    -drawWidth /
                      2,

                    -drawHeight /
                      2,

                    drawWidth,

                    drawHeight
                  );

                  context.restore();

                  resolve();
                };

                logo.onerror = () => {
                  resolve();
                };

                logo.src =
                  imagePreview;
              }
            );
          }

          /*
           * =====================
           * TEXT PREVIEW
           * =====================
           */

          if (
            watermarkType ===
              "text" ||
            watermarkType ===
              "both"
          ) {
            context.save();

            /*
             * Font mapping
             */

            let previewFont =
              "Arial";

            switch (
              fontFamily
            ) {
              case "Helvetica":
                previewFont =
                  "Arial";
                break;

              case "Helvetica-Bold":
                previewFont =
                  "Arial";
                break;

              case "Helvetica-Oblique":
                previewFont =
                  "Arial";
                break;

              case "Times-Roman":
                previewFont =
                  "Times New Roman";
                break;

              case "Times-Bold":
                previewFont =
                  "Times New Roman";
                break;

              case "Courier":
                previewFont =
                  "Courier New";
                break;

              case "Courier-Bold":
                previewFont =
                  "Courier New";
                break;

              default:
                previewFont =
                  "Arial";
            }

            const isBold =
              fontFamily.includes(
                "Bold"
              );

            const isItalic =
              fontFamily.includes(
                "Oblique"
              );

            context.font =
              `${
                isItalic
                  ? "italic "
                  : ""
              }${
                isBold
                  ? "bold "
                  : ""
              }${fontSize}px ${previewFont}`;

            context.textAlign =
              "center";

            context.textBaseline =
              "middle";

            const text =
              watermarkText ||
              "CONFIDENTIAL";

            const metrics =
              context.measureText(
                text
              );

            const textWidth =
              metrics.width;

            const textHeight =
              fontSize;

            const coordinates =
              getTextPosition(
                textPosition,

                canvas.width,

                canvas.height,

                textWidth,

                textHeight
              );

            context.globalAlpha =
              opacity / 100;

            context.fillStyle =
              textColor;

            context.translate(
              coordinates.x,
              coordinates.y
            );

            context.rotate(
              (rotation *
                Math.PI) /
                180
            );

            context.fillText(
              text,
              0,
              0
            );

            context.restore();
          }
        }
      };

    renderPreviews();

    return () => {
      cancelled = true;
    };
  }, [
    pages,

    watermarkType,

    watermarkText,

    opacity,

    fontSize,

    rotation,

    textPosition,

    selectedPages,

    fontFamily,

    textColor,

    watermarkImage,

    imagePreview,

    imageOpacity,

    imageScale,

    imageRotation,

    imagePosition,
  ]);

  /*
   * =========================
   * IMAGE SELECT
   * =========================
   */

  const handleImageChange =
    (event) => {
      const selected =
        event.target.files?.[0];

      if (!selected) {
        return;
      }

      if (
        ![
          "image/png",
          "image/jpeg",
          "image/jpg",
        ].includes(
          selected.type
        )
      ) {
        setError(
          "Please select PNG or JPG image."
        );

        return;
      }

      setWatermarkImage(
        selected
      );

      const previewURL =
        URL.createObjectURL(
          selected
        );

      setImagePreview(
        previewURL
      );

      /*
       * Automatically select image
       * when image is uploaded.
       */

      if (
        watermarkType ===
        "text"
      ) {
        setWatermarkType(
          "both"
        );
      }
    };

  /*
   * =========================
   * RESET
   * =========================
   */

  const reset = () => {
    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setFile(null);

    setPages([]);

    setPageCount(0);

    setError("");

    /*
     * Text
     */

    setWatermarkText(
      "CONFIDENTIAL"
    );

    setFontFamily(
      "Helvetica-Bold"
    );

    setTextColor(
      "#777777"
    );

    setOpacity(30);

    setFontSize(40);

    setRotation(-45);

    setTextPosition(
      "center"
    );

    /*
     * Image
     */

    setWatermarkImage(
      null
    );

    setImagePreview("");

    setImageOpacity(30);

    setImageScale(30);

    setImageRotation(0);

    setImagePosition(
      "center"
    );

    /*
     * General
     */

    setWatermarkType(
      "both"
    );

    setSelectedPages(
      "all"
    );

    canvasRefs.current = [];
  };

  /*
   * =========================
   * GENERATE PDF
   * =========================
   */

  const handleWatermark =
    async () => {
      if (!file) {
        setError(
          "Please select a PDF."
        );

        return;
      }

      /*
       * Text validation
       */

      if (
        (watermarkType ===
          "text" ||
          watermarkType ===
            "both") &&
        !watermarkText.trim()
      ) {
        setError(
          "Please enter watermark text."
        );

        return;
      }

      /*
       * Image validation
       */

      if (
        (watermarkType ===
          "image" ||
          watermarkType ===
            "both") &&
        !watermarkImage
      ) {
        setError(
          "Please select a watermark image."
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

        /*
         * =====================
         * TYPE
         * =====================
         */

        formData.append(
          "type",
          watermarkType
        );

        /*
         * =====================
         * TEXT
         * =====================
         */

        formData.append(
          "text",
          watermarkText
        );

        formData.append(
          "opacity",
          String(
            opacity / 100
          )
        );

        formData.append(
          "fontSize",
          String(fontSize)
        );

        formData.append(
          "rotation",
          String(rotation)
        );

        formData.append(
          "fontFamily",
          fontFamily
        );

        formData.append(
          "color",
          textColor
        );

        formData.append(
          "textPosition",
          textPosition
        );

        /*
         * =====================
         * IMAGE
         * =====================
         */

        if (
          watermarkImage
        ) {
          formData.append(
            "watermarkImage",
            watermarkImage
          );
        }

        formData.append(
          "imageOpacity",
          String(
            imageOpacity / 100
          )
        );

        formData.append(
          "imageScale",
          String(
            imageScale / 100
          )
        );

        formData.append(
          "imageRotation",
          String(
            imageRotation
          )
        );

        formData.append(
          "imagePosition",
          imagePosition
        );

        /*
         * =====================
         * PAGES
         * =====================
         */

        formData.append(
          "pages",
          selectedPages
        );

        /*
         * =====================
         * API
         * =====================
         */

        const response =
          await fetch(
            `${API_URL}/api/pdf/watermark`,
            {
              method: "POST",
              body: formData,
            }
          );

        if (!response.ok) {
          let message =
            "Failed to watermark PDF.";

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
          "watermarked.pdf";

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
   * =========================
   * UI
   * =========================
   */

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">

          <h1 className="text-3xl font-bold">
            Watermark PDF
          </h1>

          <p className="mt-2 text-gray-600">
            Add custom text and image
            watermarks to your PDF.
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!file && (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">

              <div className="text-5xl">
                💧
              </div>

              <h2 className="mt-4 text-lg font-semibold">
                Upload PDF
              </h2>

              <label className="mt-5 inline-flex cursor-pointer rounded-lg bg-black px-6 py-3 font-semibold text-white">
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
            <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">

              {/* =========================
                  CONTROLS
              ========================= */}

              <div className="space-y-6">

                {/* Watermark Type */}

                <div>
                  <label className="text-sm font-semibold">
                    Watermark Type
                  </label>

                  <select
                    value={
                      watermarkType
                    }
                    onChange={(e) =>
                      setWatermarkType(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border px-3 py-2"
                  >
                    <option value="text">
                      Text Only
                    </option>

                    <option value="image">
                      Image Only
                    </option>

                    <option value="both">
                      Text + Image
                    </option>
                  </select>
                </div>

                {/* =====================
                    IMAGE CONTROLS
                ===================== */}

                {(
                  watermarkType ===
                    "image" ||
                  watermarkType ===
                    "both"
                ) && (
                  <>
                    <div>
                      <label className="text-sm font-semibold">
                        Watermark Image
                      </label>

                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={
                          handleImageChange
                        }
                        className="mt-2 block w-full rounded-lg border p-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Logo Size:{" "}
                        {imageScale}%
                      </label>

                      <input
                        type="range"
                        min="5"
                        max="80"
                        value={
                          imageScale
                        }
                        onChange={(e) =>
                          setImageScale(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="mt-3 w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Logo Opacity:{" "}
                        {imageOpacity}%
                      </label>

                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={
                          imageOpacity
                        }
                        onChange={(e) =>
                          setImageOpacity(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="mt-3 w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Logo Rotation
                      </label>

                      <select
                        value={
                          imageRotation
                        }
                        onChange={(e) =>
                          setImageRotation(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="mt-2 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="-45">
                          -45°
                        </option>

                        <option value="0">
                          0°
                        </option>

                        <option value="45">
                          45°
                        </option>

                        <option value="90">
                          90°
                        </option>

                        <option value="180">
                          180°
                        </option>
                      </select>
                    </div>

                    {/* IMAGE POSITION */}

                    <div>
                      <label className="text-sm font-semibold">
                        Image Position
                      </label>

                      <select
                        value={
                          imagePosition
                        }
                        onChange={(e) =>
                          setImagePosition(
                            e.target.value
                          )
                        }
                        className="mt-2 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="top-left">
                          Top Left
                        </option>

                        <option value="top-center">
                          Top Center
                        </option>

                        <option value="top-right">
                          Top Right
                        </option>

                        <option value="center">
                          Center
                        </option>

                        <option value="bottom-left">
                          Bottom Left
                        </option>

                        <option value="bottom-center">
                          Bottom Center
                        </option>

                        <option value="bottom-right">
                          Bottom Right
                        </option>
                      </select>
                    </div>
                  </>
                )}

                {/* =====================
                    TEXT CONTROLS
                ===================== */}

                {(
                  watermarkType ===
                    "text" ||
                  watermarkType ===
                    "both"
                ) && (
                  <>
                    <div>
                      <label className="text-sm font-semibold">
                        Watermark Text
                      </label>

                      <input
                        type="text"
                        value={
                          watermarkText
                        }
                        onChange={(e) =>
                          setWatermarkText(
                            e.target.value
                          )
                        }
                        className="mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
                        placeholder="CONFIDENTIAL"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Opacity:{" "}
                        {opacity}%
                      </label>

                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={opacity}
                        onChange={(e) =>
                          setOpacity(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="mt-3 w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Font Size
                      </label>

                      <input
                        type="number"
                        min="10"
                        max="150"
                        value={
                          fontSize
                        }
                        onChange={(e) =>
                          setFontSize(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="mt-2 w-full rounded-lg border px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Font Family
                      </label>

                      <select
                        value={
                          fontFamily
                        }
                        onChange={(e) =>
                          setFontFamily(
                            e.target.value
                          )
                        }
                        className="mt-2 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="Helvetica">
                          Helvetica
                        </option>

                        <option value="Helvetica-Bold">
                          Helvetica Bold
                        </option>

                        <option value="Helvetica-Oblique">
                          Helvetica Oblique
                        </option>

                        <option value="Times-Roman">
                          Times Roman
                        </option>

                        <option value="Times-Bold">
                          Times Bold
                        </option>

                        <option value="Courier">
                          Courier
                        </option>

                        <option value="Courier-Bold">
                          Courier Bold
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Text Color
                      </label>

                      <div className="mt-2 flex gap-3">

                        <input
                          type="color"
                          value={
                            textColor
                          }
                          onChange={(e) =>
                            setTextColor(
                              e.target.value
                            )
                          }
                          className="h-10 w-14 cursor-pointer rounded border p-1"
                        />

                        <input
                          type="text"
                          value={
                            textColor
                          }
                          onChange={(e) =>
                            setTextColor(
                              e.target.value
                            )
                          }
                          placeholder="#777777"
                          className="flex-1 rounded-lg border px-3 py-2 uppercase"
                        />

                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold">
                        Rotation
                      </label>

                      <select
                        value={
                          rotation
                        }
                        onChange={(e) =>
                          setRotation(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="mt-2 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="-45">
                          -45°
                        </option>

                        <option value="0">
                          0°
                        </option>

                        <option value="45">
                          45°
                        </option>

                        <option value="90">
                          90°
                        </option>

                        <option value="180">
                          180°
                        </option>
                      </select>
                    </div>

                    {/* TEXT POSITION */}

                    <div>
                      <label className="text-sm font-semibold">
                        Text Position
                      </label>

                      <select
                        value={
                          textPosition
                        }
                        onChange={(e) =>
                          setTextPosition(
                            e.target.value
                          )
                        }
                        className="mt-2 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="top-left">
                          Top Left
                        </option>

                        <option value="top-center">
                          Top Center
                        </option>

                        <option value="top-right">
                          Top Right
                        </option>

                        <option value="center">
                          Center
                        </option>

                        <option value="bottom-left">
                          Bottom Left
                        </option>

                        <option value="bottom-center">
                          Bottom Center
                        </option>

                        <option value="bottom-right">
                          Bottom Right
                        </option>
                      </select>
                    </div>
                  </>
                )}

                {/* =====================
                    PAGES
                ===================== */}

                <div>
                  <label className="text-sm font-semibold">
                    Pages
                  </label>

                  <select
                    value={
                      selectedPages ===
                      "all"
                        ? "all"
                        : "custom"
                    }
                    onChange={(e) => {
                      if (
                        e.target.value ===
                        "all"
                      ) {
                        setSelectedPages(
                          "all"
                        );
                      } else {
                        setSelectedPages(
                          "1"
                        );
                      }
                    }}
                    className="mt-2 w-full rounded-lg border px-3 py-2"
                  >
                    <option value="all">
                      All Pages
                    </option>

                    <option value="custom">
                      Selected Pages
                    </option>
                  </select>

                  {selectedPages !==
                    "all" && (
                    <input
                      type="text"
                      value={
                        selectedPages
                      }
                      onChange={(e) =>
                        setSelectedPages(
                          e.target.value
                        )
                      }
                      placeholder="Example: 1,3,5"
                      className="mt-2 w-full rounded-lg border px-3 py-2"
                    />
                  )}
                </div>

                {/* =====================
                    APPLY
                ===================== */}

                <button
                  type="button"
                  onClick={
                    handleWatermark
                  }
                  disabled={loading}
                  className="w-full rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:bg-gray-400"
                >
                  {loading
                    ? "Processing..."
                    : "Apply Watermark"}
                </button>

                {/* =====================
                    RESET
                ===================== */}

                <button
                  type="button"
                  onClick={reset}
                  className="w-full rounded-lg border px-5 py-3 font-semibold"
                >
                  Remove PDF
                </button>

              </div>

              {/* =========================
                  PREVIEW
              ========================= */}

              <div>

                <div className="mb-4 flex items-center justify-between">

                  <h2 className="font-semibold">
                    PDF Preview
                  </h2>

                  <span className="text-sm text-gray-500">
                    {pageCount} pages
                  </span>

                </div>

                {previewLoading ? (
                  <div className="flex h-96 items-center justify-center rounded-xl border bg-gray-50">
                    Loading preview...
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">

                    {pages.map(
                      (
                        page,
                        index
                      ) => (
                        <div
                          key={
                            page.pageNumber
                          }
                          className={`rounded-xl border p-3 ${
                            isPageSelected(
                              index
                            )
                              ? "border-black"
                              : "border-gray-200"
                          }`}
                        >

                          <div className="mb-3 flex justify-between text-sm">

                            <span className="font-medium">
                              Page{" "}
                              {
                                page.pageNumber
                              }
                            </span>

                            {isPageSelected(
                              index
                            ) && (
                              <span className="text-gray-500">
                                Watermark
                              </span>
                            )}

                          </div>

                          <div className="overflow-auto rounded-lg bg-gray-100 p-3">

                            <canvas
                              ref={(
                                element
                              ) => {
                                canvasRefs.current[
                                  index
                                ] =
                                  element;
                              }}
                              className="mx-auto max-w-full rounded bg-white shadow"
                            />

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default WatermarkPDF;