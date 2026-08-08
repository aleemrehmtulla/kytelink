import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { useApp } from "../../lib/app-context";
import { exportCroppedImage } from "../../lib/upload/crop-image";
import { uploadAvatar, type UploadResult } from "../../lib/upload/upload-avatar";

type Phase = "crop" | "uploading" | "optimizing";

export interface AvatarCropperProps {
  open: boolean;
  imageSrc: string | null;
  kyteId: string;
  onClose: () => void;
  onComplete: (result: UploadResult) => void;
}

export function AvatarCropper({ open, imageSrc, kyteId, onClose, onComplete }: AvatarCropperProps) {
  const { api, handleError } = useApp();
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [area, setArea] = useState<Area | null>(null);
  const [phase, setPhase] = useState<Phase>("crop");
  const [progress, setProgress] = useState(0);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  function reset() {
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setPhase("crop");
    setProgress(0);
  }

  async function onSave() {
    if (!imageSrc || !area) return;
    try {
      const blob = await exportCroppedImage(imageSrc, area);
      setPhase("uploading");
      const result = await uploadAvatar(api, kyteId, "AVATAR", blob, (pct) => {
        setProgress(pct);
        if (pct >= 100) setPhase("optimizing");
      });
      onComplete(result);
      reset();
      onClose();
    } catch (error) {
      handleError(error, "Upload failed");
      setPhase("crop");
    }
  }

  const statusLabel =
    phase === "uploading" ? `Uploading — ${progress}%` : phase === "optimizing" ? "Optimizing…" : "";

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Adjust your photo"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{statusLabel}</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button onClick={onSave} loading={phase !== "crop"} disabled={!area}>
              Save photo
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative h-64 w-full overflow-hidden rounded-md bg-foreground">
        {imageSrc ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        ) : null}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="flex-1 accent-accent outline-none"
          aria-label="Zoom"
        />
      </div>
      {phase !== "crop" ? (
        <Progress className="mt-3 h-1.5" value={phase === "optimizing" ? 100 : progress} />
      ) : null}
    </Modal>
  );
}
