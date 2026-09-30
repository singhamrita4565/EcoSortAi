import { useRef, useState, useCallback } from "react";

function ImageUploader({ onImageSelected }) {
  const fileInputRef   = useRef(null);
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const streamRef      = useRef(null);

  const [preview,     setPreview]     = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [mode,        setMode]        = useState("idle"); // "idle" | "camera" | "done"
  const [cameraError, setCameraError] = useState(null);

  // ──────────────────────────────────────────────
  // FILE HELPERS
  // ──────────────────────────────────────────────

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    setMode("done");
    onImageSelected(file);
  };

  const handleInputChange  = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ──────────────────────────────────────────────
  // RESET
  // ──────────────────────────────────────────────

  const reset = useCallback(() => {
    stopStream();
    setPreview(null);
    setMode("idle");
    setCameraError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImageSelected(null);
  }, [onImageSelected]);

  // ──────────────────────────────────────────────
  // CAMERA
  // ──────────────────────────────────────────────

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async () => {
    setCameraError(null);
    setMode("camera");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      // wait a tick so the video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 50);

    } catch (err) {
      console.error("Camera error:", err);
      const msg =
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : err.name === "NotFoundError"
          ? "No camera found on this device."
          : "Could not access camera. Try uploading a file instead.";
      setCameraError(msg);
      setMode("idle");
    }
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    stopStream();

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
      const url  = URL.createObjectURL(blob);
      setPreview(url);
      setMode("done");
      onImageSelected(file);
    }, "image/jpeg", 0.92);
  };

  const closeCamera = () => {
    stopStream();
    setMode("idle");
    setCameraError(null);
  };

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────

  /* ---- IMAGE PREVIEW ---- */
  if (mode === "done" && preview) {
    return (
      <div className="uploader-wrapper">
        <div className="image-preview-box">
          <img src={preview} alt="Selected waste" />
          <div className="preview-actions">
            <button className="remove-btn" type="button" onClick={reset}>
              Remove Image
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- LIVE CAMERA ---- */
  if (mode === "camera") {
    return (
      <div className="uploader-wrapper">
        {/* hidden canvas for capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="camera-box">
          <video
            ref={videoRef}
            className="camera-feed"
            autoPlay
            playsInline
            muted
          />

          <div className="camera-controls">
            <button
              className="camera-cancel-btn"
              type="button"
              onClick={closeCamera}
              title="Cancel"
            >
              ✕ Cancel
            </button>

            <button
              className="camera-capture-btn"
              type="button"
              onClick={capturePhoto}
              title="Take Photo"
            >
              📸 Capture
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- IDLE: Upload / Drag / Camera ---- */
  return (
    <div className="uploader-wrapper">

      {cameraError && (
        <div className="camera-error">
          ⚠️ {cameraError}
        </div>
      )}

      <div
        className={dragging ? "upload-box dragging" : "upload-box"}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <div className="upload-icon">📁</div>

        <h3>Upload Waste Image</h3>

        <p>
          Drag &amp; drop an image here, or use one of the options below
        </p>

        <span>Supported: JPG, JPEG, PNG, WEBP</span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleInputChange}
        />

        {/* Two action buttons side by side */}
        <div className="upload-actions">

          <button
            className="browse-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current.click();
            }}
          >
            📂 Browse File
          </button>

          <button
            className="camera-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCamera();
            }}
          >
            📷 Use Camera
          </button>

        </div>

      </div>

    </div>
  );
}

export default ImageUploader;