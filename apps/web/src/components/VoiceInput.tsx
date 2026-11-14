import { copy } from "../copy.js";
import {
  useSpeechRecognition,
  type SpeechStatus,
} from "../hooks/useSpeechRecognition.js";

const statusMessages: Record<SpeechStatus, string> = {
  idle: "",
  listening: copy.voice.listening,
  added: copy.voice.added,
  no_speech: copy.voice.noSpeech,
  denied: copy.voice.denied,
  failed: copy.voice.failed,
};

export function VoiceInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled: boolean;
}) {
  const speech = useSpeechRecognition(onTranscript);
  if (!speech.supported) return null;

  return (
    <div className="voice-input">
      <button
        type="button"
        className="secondary-button"
        aria-pressed={speech.listening}
        disabled={disabled}
        onClick={speech.listening ? speech.stop : speech.start}
      >
        {speech.listening ? copy.voice.stop : copy.voice.start}
      </button>
      <p className="form-hint">{copy.voice.note}</p>
      <p className="form-hint" role="status">
        {statusMessages[speech.status]}
      </p>
    </div>
  );
}
