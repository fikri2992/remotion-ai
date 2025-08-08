import { Composition } from "remotion";
import { HelloWorld} from "./HelloWorld";
import { SlidingWindowScene, slidingWindowCompSchema } from "./scenes/SlidingWindow/Scene";
import { SlidingWindowExplainer, slidingWindowExplainerSchema, computeExplainerDuration } from "./scenes/SlidingWindow/Explainer";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={300}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: "Render Server Template",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />
      <Composition
        id="SlidingWindow"
        component={SlidingWindowScene}
        schema={slidingWindowCompSchema}
        durationInFrames={720}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          s: "abcabcbb",
          frameOffset: 0,
        }}
      />
      <Composition
        id="LongestSubstringExplainer"
        component={SlidingWindowExplainer}
        schema={slidingWindowExplainerSchema}
        durationInFrames={computeExplainerDuration(["abcabcbb", "bbbbb", "pwwkew"], 60) }
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Longest Substring Without Repeating Characters",
          intro: "We use the Sliding Window technique. Move right to expand, move left to remove duplicates.",
          examples: ["abcabcbb", "bbbbb", "pwwkew"],
        }}
      />
    </>
  );
};
