"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { recordDemoMeeting } from "@/lib/cases-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DemoMeetingModalProps = {
  open: boolean;
  caseId: string;
  caseTitle: string;
  localName: string;
  remoteName: string;
  role: "client" | "lawyer";
  onClose: () => void;
  onMeetingRecorded: () => void;
};

type Phase = "connecting" | "in-call" | "summary" | "saving";

const MEETING_DURATION_MS = 5000;

function buildDemoSummary(
  caseTitle: string,
  localName: string,
  remoteName: string,
): string {
  const when = new Date().toLocaleString();
  return `Demo video consultation completed on ${when}.

Case: ${caseTitle}
Participants: ${localName} and ${remoteName}

Summary:
- Connection established and cameras verified
- Reviewed current case status and immediate priorities
- Discussed documents needed and next procedural steps
- Agreed to follow up via secure messaging on Lawway

(Auto-generated demonstration summary — ${MEETING_DURATION_MS / 1000}s demo session)`;
}

export function DemoMeetingModal({
  open,
  caseId,
  caseTitle,
  localName,
  remoteName,
  role,
  onClose,
  onMeetingRecorded,
}: DemoMeetingModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSavedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("connecting");
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [summary, setSummary] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const goToSummary = useCallback(() => {
    stopCamera();
    setPhase("summary");
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setCameraError(
        "Camera access was blocked. Demo continues with a placeholder view.",
      );
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase("connecting");
      setSecondsLeft(5);
      autoSavedRef.current = false;
      return;
    }

    setSummary(buildDemoSummary(caseTitle, localName, remoteName));
    setPhase("connecting");
    setSecondsLeft(5);

    void (async () => {
      await startCamera();
      setPhase("in-call");

      const started = Date.now();
      tickRef.current = setInterval(() => {
        const elapsed = Date.now() - started;
        const left = Math.max(
          0,
          Math.ceil((MEETING_DURATION_MS - elapsed) / 1000),
        );
        setSecondsLeft(left);
        if (elapsed >= MEETING_DURATION_MS) {
          goToSummary();
        }
      }, 200);
    })();

    return () => {
      stopCamera();
    };
  }, [open, caseTitle, localName, remoteName, startCamera, stopCamera, goToSummary]);

  function toggleVideo() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoOn(track.enabled);
  }

  function toggleMic() {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  const saveAndClose = useCallback(async () => {
    setPhase("saving");
    try {
      await recordDemoMeeting(caseId, summary);
      toast.success("Meeting logged on the case timeline");
      onMeetingRecorded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save meeting.");
      setPhase("summary");
      autoSavedRef.current = false;
    }
  }, [caseId, summary, onMeetingRecorded, onClose]);

  useEffect(() => {
    if (phase !== "summary" || autoSavedRef.current) return;
    autoSavedRef.current = true;
    void saveAndClose();
  }, [phase, saveAndClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Video meeting"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-[0_12px_32px_rgba(28,25,23,0.08)]">
        {phase === "summary" || phase === "saving" ? (
          <div className="flex flex-col p-6 sm:p-8">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Meeting ended
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Session summary</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This summary will be saved as a completed meeting on the case file.
            </p>
            <pre className="mt-4 max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
              {summary}
            </pre>
            <p className="mt-4 text-sm text-muted-foreground">
              {phase === "saving"
                ? "Saving completed meeting to the case timeline…"
                : "Meeting saved."}
            </p>
            {phase === "summary" ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void saveAndClose()}
                >
                  Retry save
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {phase === "connecting" ? "Joining meeting…" : "In meeting"}
                </p>
                <p className="text-xs text-muted-foreground">{caseTitle}</p>
              </div>
              {phase === "in-call" ? (
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                  LIVE · {secondsLeft}s demo
                </span>
              ) : null}
            </div>

            <div className="relative aspect-video w-full bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "h-full w-full object-cover",
                  !videoOn && "opacity-30",
                )}
              />
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/80 p-6 text-center text-sm text-background">
                  {cameraError}
                </div>
              ) : null}

              <div className="absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-2 text-sm text-white backdrop-blur-sm">
                You · {localName}
                <span className="ml-2 text-xs text-white/60">
                  ({role === "lawyer" ? "Advocate" : "Client"})
                </span>
              </div>

              <div className="absolute right-4 top-4 flex w-36 flex-col gap-2 sm:w-44">
                <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-muted text-center">
                  <div>
                    <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/15 text-lg font-medium text-foreground">
                      {remoteName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground">{remoteName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-border px-6 py-4">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11 rounded-full"
                onClick={toggleMic}
                aria-label={micOn ? "Mute" : "Unmute"}
              >
                {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11 rounded-full"
                onClick={toggleVideo}
                aria-label={videoOn ? "Stop video" : "Start video"}
              >
                {videoOn ? (
                  <Video className="size-5" />
                ) : (
                  <VideoOff className="size-5" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                className="size-12 rounded-full bg-destructive text-white hover:bg-destructive/90"
                onClick={goToSummary}
                aria-label="End meeting"
              >
                <PhoneOff className="size-5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
