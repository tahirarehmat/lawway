"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Captions,
} from "lucide-react";
import { recordDemoMeeting } from "@/lib/cases-api";
import {
  addIceCandidate,
  appendTranscriptLine,
  createPeerConnection,
  endVideoCall,
  findActiveCallForCase,
  listenToCall,
  listenToIceCandidates,
  markCallConnected,
  refreshCallOffer,
  setCallAnswer,
  setSpeakerInterim,
  startVideoCall,
  type VideoCallDoc,
  type VideoCallInterim,
  type VideoCallTranscriptLine,
} from "@/lib/videoCallFirebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type VideoCallModalProps = {
  open: boolean;
  caseId: string;
  caseTitle: string;
  clientId: string;
  lawyerId: string;
  clientName: string;
  lawyerName: string;
  localUserId: string;
  localName: string;
  remoteName: string;
  role: "client" | "lawyer";
  mode?: "video" | "voice";
  /** Join an existing incoming call */
  joinCallId?: string | null;
  onClose: () => void;
  onMeetingRecorded: () => void;
};

type Phase = "connecting" | "in-call" | "transcript" | "saving";

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((ev: {
    resultIndex: number;
    results: {
      length: number;
      [i: number]: { isFinal: boolean; 0: { transcript: string } };
    };
  }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): SpeechRec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function mediaErrorName(err: unknown): string {
  if (err && typeof err === "object" && "name" in err) {
    return String((err as { name?: string }).name ?? "");
  }
  return "";
}

function friendlyMediaError(err: unknown): string {
  const name = mediaErrorName(err);
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera or microphone was found on this device. You can still join and wait for the other party.";
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera/microphone permission was blocked. Allow access in the browser, or continue without local media.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Camera or microphone is already in use by another app.";
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return "Could not access camera/microphone.";
}

async function tryGetUserMedia(
  constraints: MediaStreamConstraints,
): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    return null;
  }
}

/**
 * Request camera and mic separately. Combined {audio,video} often throws
 * NotFoundError when only one device is missing, which wrongly looks like
 * "camera not found" even when the webcam works.
 */
async function acquireLocalMedia(
  preferVideo: boolean,
): Promise<{ stream: MediaStream | null; warning: string | null; videoEnabled: boolean }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      stream: null,
      warning: "This browser does not support camera/microphone access.",
      videoEnabled: false,
    };
  }

  let videoStream: MediaStream | null = null;
  let audioStream: MediaStream | null = null;
  const warnings: string[] = [];

  if (preferVideo) {
    // Ideal constraints first, then plain video:true
    videoStream =
      (await tryGetUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })) ??
      (await tryGetUserMedia({ video: true, audio: false }));

    if (!videoStream) {
      warnings.push("Camera unavailable — continuing without local video.");
    }
  }

  audioStream =
    (await tryGetUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    })) ?? (await tryGetUserMedia({ audio: true, video: false }));

  if (!audioStream) {
    warnings.push("Microphone unavailable — continuing without local audio.");
  }

  const tracks = [
    ...(videoStream?.getVideoTracks() ?? []),
    ...(audioStream?.getAudioTracks() ?? []),
  ];

  // Stop unused sibling tracks from the other stream object
  if (videoStream && audioStream) {
    // tracks already copied onto combined stream below
  }

  if (tracks.length === 0) {
    videoStream?.getTracks().forEach((t) => t.stop());
    audioStream?.getTracks().forEach((t) => t.stop());
    return {
      stream: null,
      warning:
        warnings.join(" ") ||
        "No camera or microphone available. You can still join the call.",
      videoEnabled: false,
    };
  }

  const combined = new MediaStream(tracks);

  // Stop any leftover tracks that weren't added (shouldn't happen)
  videoStream?.getAudioTracks().forEach((t) => t.stop());
  audioStream?.getVideoTracks().forEach((t) => t.stop());

  return {
    stream: combined,
    warning: warnings.length > 0 ? warnings.join(" ") : null,
    videoEnabled: combined.getVideoTracks().length > 0,
  };
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function buildTranscriptSummary(input: {
  caseTitle: string;
  localName: string;
  remoteName: string;
  lines: VideoCallTranscriptLine[];
  startedAtMs: number | null;
  endedAtMs: number | null;
  endedByName: string | null;
}): string {
  const when = new Date(input.endedAtMs ?? Date.now()).toLocaleString();
  const durationSec =
    input.startedAtMs && input.endedAtMs
      ? Math.max(1, Math.round((input.endedAtMs - input.startedAtMs) / 1000))
      : null;

  const header = [
    `Video consultation completed on ${when}.`,
    ``,
    `Case: ${input.caseTitle}`,
    `Participants: ${input.localName} and ${input.remoteName}`,
    durationSec != null ? `Duration: ${formatElapsed(durationSec)}` : null,
    input.endedByName ? `Ended by: ${input.endedByName}` : null,
    ``,
    `— System transcript —`,
    ``,
  ]
    .filter(Boolean)
    .join("\n");

  if (input.lines.length === 0) {
    return `${header}(No speech was captured. Enable microphone permissions and speak during the call for a live transcript.)`;
  }

  const body = input.lines
    .map((line) => {
      const t = new Date(line.at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return `[${t}] ${line.speakerName}: ${line.text}`;
    })
    .join("\n");

  return `${header}${body}`;
}

export function VideoCallModal({
  open,
  caseId,
  caseTitle,
  clientId,
  lawyerId,
  clientName,
  lawyerName,
  localUserId,
  localName,
  remoteName,
  role,
  mode = "video",
  joinCallId = null,
  onClose,
  onMeetingRecorded,
}: VideoCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const pipDragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<VideoCallTranscriptLine[]>([]);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const recognitionActiveRef = useRef(false);
  const endingRef = useRef(false);
  const savedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const unsubCallRef = useRef<(() => void) | null>(null);
  const unsubIceRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("connecting");
  const [elapsed, setElapsed] = useState(0);
  const [videoOn, setVideoOn] = useState(mode === "video");
  const [micOn, setMicOn] = useState(true);
  const [statusLabel, setStatusLabel] = useState("Connecting…");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [remoteStreamReady, setRemoteStreamReady] = useState(false);
  const [lines, setLines] = useState<VideoCallTranscriptLine[]>([]);
  const [interimText, setInterimText] = useState("");
  const [remoteInterims, setRemoteInterims] = useState<VideoCallInterim[]>([]);
  const [summary, setSummary] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  /** Self-view PiP position (px from stage top-left). null = default top-right. */
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null);
  const [pipDragging, setPipDragging] = useState(false);
  const interimWriteAtRef = useRef(0);

  const cleanupMedia = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    recognitionActiveRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;

    unsubCallRef.current?.();
    unsubCallRef.current = null;
    unsubIceRef.current?.();
    unsubIceRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const startRecognition = useCallback(() => {
    const rec = getSpeechRecognition();
    if (!rec) {
      setSpeechSupported(false);
      return;
    }
    setSpeechSupported(true);

    // Stop any previous instance
    recognitionActiveRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }

    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;
    recognitionActiveRef.current = true;

    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text = result[0]?.transcript?.trim() ?? "";
        if (!text) continue;
        if (result.isFinal) {
          setInterimText("");
          const callId = callIdRef.current;
          if (!callId) continue;
          void appendTranscriptLine(callId, {
            speakerId: localUserId,
            speakerName: localName,
            text,
            at: Date.now(),
          }).catch(() => undefined);
        } else {
          interim += `${text} `;
        }
      }
      const partial = interim.trim();
      setInterimText(partial);
      const callId = callIdRef.current;
      if (!callId) return;
      const now = Date.now();
      // Throttle live interim sync so Firestore keeps up
      if (now - interimWriteAtRef.current < 350 && partial) return;
      interimWriteAtRef.current = now;
      void setSpeakerInterim(callId, localUserId, localName, partial).catch(
        () => undefined,
      );
    };

    rec.onerror = (ev) => {
      const err = ev.error ?? "";
      // These are normal; recognition restarts on onend
      if (
        err === "no-speech" ||
        err === "aborted" ||
        err === "audio-capture"
      ) {
        return;
      }
      if (err === "not-allowed") {
        setSpeechSupported(false);
        recognitionActiveRef.current = false;
      }
    };

    rec.onend = () => {
      if (!recognitionActiveRef.current) return;
      // Small delay avoids rapid restart loops in Chrome
      window.setTimeout(() => {
        if (!recognitionActiveRef.current) return;
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }, 250);
    };

    try {
      rec.start();
      setShowCaptions(true);
    } catch {
      /* already started */
    }
  }, [localName, localUserId]);

  const stopRecognition = useCallback(() => {
    recognitionActiveRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setInterimText("");
    const callId = callIdRef.current;
    if (callId) {
      void setSpeakerInterim(callId, localUserId, localName, "").catch(
        () => undefined,
      );
    }
  }, [localName, localUserId]);

  const applyCallTranscript = useCallback(
    (call: VideoCallDoc) => {
      const sorted = [...call.transcript].sort((a, b) => a.at - b.at);
      transcriptRef.current = sorted;
      setLines(sorted);
      const others = Object.values(call.interim ?? {}).filter(
        (row) => row.speakerId !== localUserId && row.text.trim(),
      );
      setRemoteInterims(others);
    },
    [localUserId],
  );

  const attachPeerHandlers = useCallback(
    (pc: RTCPeerConnection, callId: string) => {
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        void addIceCandidate(callId, localUserId, ev.candidate.toJSON()).catch(
          () => undefined,
        );
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams[0];
        if (remoteVideoRef.current && stream) {
          remoteVideoRef.current.srcObject = stream;
          void remoteVideoRef.current.play().catch(() => undefined);
        }
        setRemoteStreamReady(true);
        setStatusLabel("Connected");
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatusLabel("Connected");
          setRemoteStreamReady(true);
          if (!startedAtRef.current) {
            startedAtRef.current = Date.now();
            void markCallConnected(callId).catch(() => undefined);
          }
        } else if (pc.connectionState === "connecting") {
          setStatusLabel("Connecting peer…");
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          setStatusLabel("Connection interrupted");
        }
      };

      unsubIceRef.current?.();
      unsubIceRef.current = listenToIceCandidates(
        callId,
        localUserId,
        (candidate) => {
          void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(
            () => undefined,
          );
        },
      );
    },
    [localUserId],
  );

  const finishToTranscript = useCallback(
    (call: VideoCallDoc | null) => {
      cleanupMedia();
      const endedAt = call?.endedAtMs ?? Date.now();
      const startedAt = call?.startedAtMs ?? startedAtRef.current;
      const transcript = call?.transcript ?? transcriptRef.current;
      setLines(transcript);
      setSummary(
        buildTranscriptSummary({
          caseTitle,
          localName,
          remoteName,
          lines: transcript,
          startedAtMs: startedAt,
          endedAtMs: endedAt,
          endedByName: call?.endedByName ?? localName,
        }),
      );
      setPhase("transcript");
    },
    [caseTitle, cleanupMedia, localName, remoteName],
  );

  const hangUp = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    const callId = callIdRef.current;
    try {
      if (callId) {
        await endVideoCall({
          callId,
          endedById: localUserId,
          endedByName: localName,
        });
      }
    } catch {
      finishToTranscript(null);
    }
  }, [finishToTranscript, localName, localUserId]);

  const saveTranscript = useCallback(
    async (andClose: boolean) => {
      if (!savedRef.current) {
        setPhase("saving");
        try {
          await recordDemoMeeting(caseId, summary, {
            startedAtMs: startedAtRef.current,
            endedAtMs: Date.now(),
          });
          savedRef.current = true;
          toast.success("Call transcript saved to the case timeline");
          onMeetingRecorded();
          setPhase("transcript");
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Failed to save transcript.",
          );
          setPhase("transcript");
          return;
        }
      }
      if (andClose) onClose();
    },
    [caseId, onClose, onMeetingRecorded, summary],
  );

  // Persist once when transcript is ready; keep UI open until user closes
  useEffect(() => {
    if (phase !== "transcript" || savedRef.current || !summary) return;
    const t = setTimeout(() => {
      void saveTranscript(false);
    }, 400);
    return () => clearTimeout(t);
  }, [phase, saveTranscript, summary]);

  useEffect(() => {
    if (!open) {
      cleanupMedia();
      setPhase("connecting");
      setElapsed(0);
      setLines([]);
      setInterimText("");
      setRemoteInterims([]);
      setSummary("");
      setRemoteStreamReady(false);
      setCameraError(null);
      setStatusLabel("Connecting…");
      setPipPos(null);
      setPipDragging(false);
      setShowCaptions(true);
      setSpeechSupported(true);
      endingRef.current = false;
      savedRef.current = false;
      callIdRef.current = null;
      transcriptRef.current = [];
      startedAtRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setPhase("connecting");
        setStatusLabel(
          mode === "voice" ? "Starting voice call…" : "Starting video call…",
        );

        const media = await acquireLocalMedia(mode === "video");
        if (cancelled) {
          media.stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (media.warning) {
          setCameraError(media.warning);
        } else {
          setCameraError(null);
        }
        setVideoOn(media.videoEnabled);
        setMicOn(Boolean(media.stream?.getAudioTracks().length));

        localStreamRef.current = media.stream;
        if (localVideoRef.current && media.stream && media.videoEnabled) {
          localVideoRef.current.srcObject = media.stream;
          await localVideoRef.current.play().catch(() => undefined);
        } else if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }

        const pc = createPeerConnection();
        pcRef.current = pc;

        if (media.stream) {
          media.stream
            .getTracks()
            .forEach((track) => pc.addTrack(track, media.stream!));
        } else {
          // Still receive remote audio/video even without local devices
          pc.addTransceiver("audio", { direction: "recvonly" });
          if (mode === "video") {
            pc.addTransceiver("video", { direction: "recvonly" });
          }
        }

        let callToJoin =
          joinCallId != null ? null : await findActiveCallForCase(caseId);

        if (joinCallId) {
          const active = await findActiveCallForCase(caseId);
          if (active) callToJoin = active;
        }

        if (
          callToJoin &&
          callToJoin.starterId !== localUserId &&
          callToJoin.offer &&
          callToJoin.status !== "ended"
        ) {
          const callId = callToJoin.callId;
          callIdRef.current = callId;
          attachPeerHandlers(pc, callId);

          await pc.setRemoteDescription(
            new RTCSessionDescription(callToJoin.offer),
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await setCallAnswer(callId, answer);
          startedAtRef.current = Date.now();
          setStatusLabel("Connected");
          setPhase("in-call");
          startRecognition();

          unsubCallRef.current = listenToCall(callId, (call) => {
            if (!call) return;
            applyCallTranscript(call);
            if (call.status === "ended") {
              finishToTranscript(call);
            }
          });
        } else if (callToJoin && callToJoin.starterId === localUserId) {
          // Own ringing call — never reuse stored SDP; create a fresh offer
          const callId = callToJoin.callId;
          callIdRef.current = callId;
          attachPeerHandlers(pc, callId);

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await refreshCallOffer(callId, offer);

          setStatusLabel("Waiting for other party…");
          setPhase("in-call");
          startRecognition();

          unsubCallRef.current = listenToCall(callId, (call) => {
            if (!call) return;
            applyCallTranscript(call);
            if (call.answer && pc.remoteDescription == null) {
              void pc
                .setRemoteDescription(new RTCSessionDescription(call.answer))
                .then(() => {
                  setStatusLabel("Connected");
                  startedAtRef.current = call.startedAtMs ?? Date.now();
                })
                .catch(() => undefined);
            }
            if (call.status === "ended") {
              finishToTranscript(call);
            }
          });
        } else {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const call = await startVideoCall({
            caseId,
            caseTitle,
            clientId,
            lawyerId,
            clientName,
            lawyerName,
            starterId: localUserId,
            starterRole: role,
            mode,
            offer,
          });
          if (cancelled) return;

          if (call.starterId !== localUserId && call.offer) {
            const callId = call.callId;
            callIdRef.current = callId;
            attachPeerHandlers(pc, callId);
            await pc.setRemoteDescription(
              new RTCSessionDescription(call.offer),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await setCallAnswer(callId, answer);
            startedAtRef.current = Date.now();
            setStatusLabel("Connected");
            setPhase("in-call");
            startRecognition();
            unsubCallRef.current = listenToCall(callId, (c) => {
              if (!c) return;
              applyCallTranscript(c);
              if (c.status === "ended") finishToTranscript(c);
            });
          } else {
            const callId = call.callId;
            callIdRef.current = callId;
            attachPeerHandlers(pc, callId);
            setStatusLabel(`Calling ${remoteName}…`);
            setPhase("in-call");
            startRecognition();

            unsubCallRef.current = listenToCall(callId, (c) => {
              if (!c) return;
              applyCallTranscript(c);
              if (c.answer && pc.remoteDescription == null) {
                void pc
                  .setRemoteDescription(new RTCSessionDescription(c.answer))
                  .then(() => {
                    setStatusLabel("Connected");
                    startedAtRef.current = c.startedAtMs ?? Date.now();
                  })
                  .catch(() => undefined);
              }
              if (c.status === "ended") {
                finishToTranscript(c);
              }
            });
          }
        }

        const startTick = Date.now();
        tickRef.current = setInterval(() => {
          const base = startedAtRef.current ?? startTick;
          setElapsed(Math.floor((Date.now() - base) / 1000));
        }, 500);
      } catch (err) {
        console.error(err);
        setCameraError(friendlyMediaError(err));
        setPhase("in-call");
        setStatusLabel("Call setup failed — try again or hang up");
        toast.error("Could not start the call. Check devices and try again.");
      }
    })();

    return () => {
      cancelled = true;
      cleanupMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per open
  }, [open, joinCallId]);

  function clampPipPos(x: number, y: number): { x: number; y: number } {
    const stage = stageRef.current;
    const pip = pipRef.current;
    if (!stage || !pip) return { x, y };
    const maxX = Math.max(0, stage.clientWidth - pip.offsetWidth);
    const maxY = Math.max(0, stage.clientHeight - pip.offsetHeight);
    return {
      x: Math.min(maxX, Math.max(0, x)),
      y: Math.min(maxY, Math.max(0, y)),
    };
  }

  function placePipDefault() {
    const stage = stageRef.current;
    const pip = pipRef.current;
    if (!stage || !pip) return;
    const margin = 16;
    setPipPos(
      clampPipPos(
        stage.clientWidth - pip.offsetWidth - margin,
        88,
      ),
    );
  }

  function onPipPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const pip = pipRef.current;
    const stage = stageRef.current;
    if (!pip || !stage) return;

    // Ensure we have an explicit position before dragging
    let current = pipPos;
    if (!current) {
      const stageRect = stage.getBoundingClientRect();
      const pipRect = pip.getBoundingClientRect();
      current = {
        x: pipRect.left - stageRect.left,
        y: pipRect.top - stageRect.top,
      };
      setPipPos(current);
    }

    pip.setPointerCapture(e.pointerId);
    pipDragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - (stage.getBoundingClientRect().left + current.x),
      offsetY: e.clientY - (stage.getBoundingClientRect().top + current.y),
    };
    setPipDragging(true);
  }

  function onPipPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = pipDragRef.current;
    const stage = stageRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !stage) return;
    const stageRect = stage.getBoundingClientRect();
    setPipPos(
      clampPipPos(
        e.clientX - stageRect.left - drag.offsetX,
        e.clientY - stageRect.top - drag.offsetY,
      ),
    );
  }

  function onPipPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const drag = pipDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    pipDragRef.current = null;
    setPipDragging(false);
    try {
      pipRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  // Default PiP to top-right once the call stage is visible
  useEffect(() => {
    if (!open || phase === "transcript" || phase === "saving" || mode !== "video") {
      return;
    }
    if (pipPos != null) return;
    const id = requestAnimationFrame(() => placePipDefault());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, mode, videoOn]);

  function toggleVideo() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoOn(track.enabled);
  }

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
      if (track.enabled) {
        startRecognition();
      } else {
        stopRecognition();
      }
      return;
    }
    // No MediaStream mic track — still toggle recognition for system default mic
    if (micOn) {
      setMicOn(false);
      stopRecognition();
    } else {
      setMicOn(true);
      startRecognition();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex h-dvh w-screen flex-col bg-card"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "voice" ? "Voice call" : "Video call"}
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        {phase === "transcript" || phase === "saving" ? (
          <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col p-6 sm:p-10">
            <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
              Call ended
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              System transcript
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Full call transcript is saved to this case timeline. The call stays
              open until you or the other party hang up — never auto-closes.
            </p>
            <pre className="mt-4 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
              {summary}
            </pre>
            <p className="mt-4 text-sm text-muted-foreground">
              {phase === "saving"
                ? "Saving transcript to the case…"
                : "Transcript ready."}
            </p>
            {phase === "transcript" ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => void saveTranscript(true)}
                >
                  {savedRef.current ? "Close" : "Save & close"}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden bg-black">
              {/* Main stage — always full area */}
              {mode === "video" ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    !remoteStreamReady && "opacity-0",
                  )}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex size-24 items-center justify-center rounded-full bg-primary/20 text-3xl font-semibold text-primary">
                      {remoteName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-white/80">{remoteName}</p>
                    <p className="mt-1 text-xs text-white/50">{statusLabel}</p>
                  </div>
                </div>
              )}

              {!remoteStreamReady && mode === "video" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full bg-white/10 text-2xl font-medium text-white">
                      {remoteName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-white/80">{remoteName}</p>
                    <p className="mt-1 text-xs text-white/50">{statusLabel}</p>
                    <p className="mt-3 max-w-xs text-xs text-white/40">
                      Waiting for the other party to join. Call stays open until
                      someone hangs up.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Top bar floating on call */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 pt-4 pb-10 sm:px-6">
                <div className="pointer-events-auto rounded-xl bg-black/40 px-3 py-2 backdrop-blur-md">
                  <p className="text-sm font-medium text-white">
                    {phase === "connecting"
                      ? "Joining…"
                      : mode === "voice"
                        ? "Voice call"
                        : "Video call"}
                  </p>
                  <p className="text-xs text-white/70">
                    {caseTitle} · {statusLabel}
                  </p>
                </div>
                {phase === "in-call" ? (
                  <span className="pointer-events-auto rounded-full bg-red-500/90 px-3 py-1 text-xs font-medium text-white shadow">
                    LIVE · {formatElapsed(elapsed)}
                  </span>
                ) : null}
              </div>

              {cameraError ? (
                <div className="absolute inset-x-0 top-[4.5rem] z-20 mx-4 rounded-lg bg-destructive/90 px-4 py-2 text-center text-xs text-white sm:mx-6">
                  {cameraError}
                </div>
              ) : null}

              {/* Draggable self preview (PiP) */}
              {mode === "video" ? (
                <div
                  ref={pipRef}
                  onPointerDown={onPipPointerDown}
                  onPointerMove={onPipPointerMove}
                  onPointerUp={onPipPointerUp}
                  onPointerCancel={onPipPointerUp}
                  className={cn(
                    "absolute z-20 w-32 touch-none overflow-hidden rounded-xl border border-white/25 bg-black shadow-lg select-none sm:w-44",
                    pipDragging ? "cursor-grabbing" : "cursor-grab",
                    pipPos == null && "top-20 right-4 sm:top-24 sm:right-6",
                  )}
                  style={
                    pipPos != null
                      ? { left: pipPos.x, top: pipPos.y, right: "auto" }
                      : undefined
                  }
                  title="Drag to move"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "pointer-events-none aspect-video w-full object-cover",
                      !videoOn && "opacity-40",
                    )}
                  />
                  <p className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">
                    You · {localName}
                  </p>
                </div>
              ) : null}

              {/* Transcript overlay — toggled by captions button */}
              {showCaptions ? (
                <aside className="absolute top-20 bottom-28 left-4 z-30 flex w-[min(100%-2rem,20rem)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/75 shadow-xl backdrop-blur-md sm:top-24 sm:bottom-32 sm:left-6">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-wide text-[var(--gold,#f5b73c)] uppercase">
                      Live transcript
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCaptions(false)}
                      className="rounded-md px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 text-xs">
                    {!speechSupported ? (
                      <p className="text-amber-200/90">
                        Live speech recognition needs Chrome/Edge with mic
                        permission. Allow the mic, then unmute to resume.
                      </p>
                    ) : null}
                    {lines.length === 0 &&
                    !interimText &&
                    remoteInterims.length === 0 ? (
                      <p className="text-white/50">
                        Speak now — captions appear here in real time for both
                        parties.
                      </p>
                    ) : null}
                    {lines.map((line) => (
                      <p key={line.id} className="text-white/90">
                        <span className="font-medium text-[var(--gold,#f5b73c)]">
                          {line.speakerName}:
                        </span>{" "}
                        {line.text}
                      </p>
                    ))}
                    {remoteInterims.map((row) => (
                      <p
                        key={`remote-interim-${row.speakerId}`}
                        className="text-sky-200/90 italic"
                      >
                        <span className="font-medium">{row.speakerName}:</span>{" "}
                        {row.text}
                      </p>
                    ))}
                    {interimText ? (
                      <p className="text-white/50 italic">
                        {localName}: {interimText}
                      </p>
                    ) : null}
                  </div>
                </aside>
              ) : null}

              {/* Always-on live caption strip (even if side pane closed) */}
              {(interimText ||
                remoteInterims.length > 0 ||
                lines[lines.length - 1]) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-28 z-30 flex justify-center px-4 sm:bottom-32">
                  <div className="max-w-2xl rounded-xl bg-black/70 px-4 py-2 text-center text-sm text-white shadow-lg backdrop-blur-sm">
                    {interimText ? (
                      <p>
                        <span className="font-semibold text-[var(--gold,#f5b73c)]">
                          {localName}:
                        </span>{" "}
                        {interimText}
                      </p>
                    ) : remoteInterims[0] ? (
                      <p>
                        <span className="font-semibold text-sky-300">
                          {remoteInterims[0].speakerName}:
                        </span>{" "}
                        {remoteInterims[0].text}
                      </p>
                    ) : lines[lines.length - 1] ? (
                      <p>
                        <span className="font-semibold text-[var(--gold,#f5b73c)]">
                          {lines[lines.length - 1]!.speakerName}:
                        </span>{" "}
                        {lines[lines.length - 1]!.text}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Floating call controls on the video */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-4 pt-16 pb-6 sm:pb-8">
                <div className="pointer-events-auto flex items-center gap-3 px-2 py-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-12 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    onClick={toggleMic}
                    aria-label={micOn ? "Mute" : "Unmute"}
                  >
                    {micOn ? (
                      <Mic className="size-5" />
                    ) : (
                      <MicOff className="size-5" />
                    )}
                  </Button>
                  {mode === "video" ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-12 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                      onClick={toggleVideo}
                      aria-label={videoOn ? "Stop video" : "Start video"}
                    >
                      {videoOn ? (
                        <Video className="size-5" />
                      ) : (
                        <VideoOff className="size-5" />
                      )}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className={cn(
                      "size-12 rounded-full border-white/20 text-white hover:text-white",
                      showCaptions
                        ? "bg-[var(--gold,#f5b73c)] text-black hover:bg-[var(--gold,#f5b73c)]/90 hover:text-black"
                        : "bg-white/10 hover:bg-white/20",
                    )}
                    onClick={() => setShowCaptions((v) => !v)}
                    aria-label={
                      showCaptions ? "Hide transcript" : "Show transcript"
                    }
                    aria-pressed={showCaptions}
                    title={
                      showCaptions ? "Hide transcript" : "Show transcript"
                    }
                  >
                    <Captions className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="size-14 rounded-full bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => void hangUp()}
                    aria-label="End call"
                  >
                    <PhoneOff className="size-5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
