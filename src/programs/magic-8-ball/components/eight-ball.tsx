import type { Answer } from "../data/answers";

type EightBallProps = {
  /** null shows the "8" side, before the first question. */
  answer: Answer | null;
  shaking: boolean;
  /** Changes on every shake, to restart the reveal animation. */
  revealKey: number;
};

/**
 * The ball, drawn with CSS: glossy black sphere, and either the white "8"
 * or the dark window with the blue answer die floating up in it.
 */
export function EightBall({ answer, shaking, revealKey }: EightBallProps) {
  return (
    <div
      aria-hidden
      className={`relative aspect-square w-[min(100cqw,100cqh,15rem)] rounded-full bg-[radial-gradient(circle_at_32%_28%,#6b6b6b_0%,#262626_18%,#0a0a0a_48%,#000_70%)] shadow-[4px_6px_10px_rgb(0_0_0/0.45)] ${
        shaking ? "animate-ball-shake motion-reduce:animate-none" : ""
      }`}
    >
      {/* Highlight */}
      <div className="absolute top-[9%] left-[18%] h-[16%] w-[26%] -rotate-[25deg] rounded-full bg-white/25 blur-[3px]" />

      {answer === null ? (
        // The "8" side.
        <div className="absolute inset-[29%] flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_40%_35%,#fff_0%,#e8e8e8_70%,#cfcfcf_100%)] shadow-[inset_-2px_-3px_5px_rgb(0_0_0/0.25)] [container-type:size]">
          <span className="font-[Arial,Helvetica,sans-serif] text-[62cqmin] leading-none font-bold text-black">
            8
          </span>
        </div>
      ) : (
        // The answer window.
        <div className="absolute inset-[24%] flex items-center justify-center overflow-hidden rounded-full border-4 border-[#1a1a1a] bg-[radial-gradient(circle_at_50%_45%,#0b1a3a_0%,#050b1c_60%,#02040a_100%)] shadow-[inset_0_0_12px_#000]">
          {!shaking && (
            <div
              key={revealKey}
              className="flex aspect-[1/0.87] w-[88%] animate-answer-reveal items-start justify-center bg-[linear-gradient(180deg,#3b5bdb,#1c35a8)] px-[14%] pt-[9%] [clip-path:polygon(0_0,100%_0,50%_100%)] motion-reduce:animate-none"
            >
              <span className="text-center text-[10px] leading-[1.15] font-bold tracking-wide text-[#dfe6ff] uppercase [text-shadow:0_0_3px_#9db1ff]">
                {answer.text}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
