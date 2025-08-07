import { Composition } from "remotion";
import { HelloWorld, helloWorldCompSchema } from "./HelloWorld";
import { CameraSystem, cameraSystemSchema } from "./CameraSystem";
import { CameraSystem as CameraSystemEnhanced, cameraSystemSchema as cameraSystemEnhancedSchema } from "./CameraSystemEnhanced";
import { ArrayVisualization, arrayVisualizationSchema } from "./ArrayVisualization";
import { ArrayVisualizationEnhanced, arrayVisualizationEnhancedSchema } from "./ArrayVisualizationEnhanced";
import { GraphVisualization, graphVisualizationSchema } from "./GraphVisualization";
import { LinkedListVisualization, linkedListVisualizationSchema } from "./LinkedListVisualization";
import { RecursionVisualization, recursionVisualizationSchema } from "./RecursionVisualization";
import { CarFleetVisualization, carFleetVisualizationSchema } from "./CarFleetVisualization";
import { CarFleetVisualizationEnhanced, carFleetVisualizationEnhancedSchema } from "./CarFleetVisualizationEnhanced";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        // You can take the "id" to render a video:
        // npx remotion render HelloWorld
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={800}
        fps={30}
        width={1920}
        height={1080}
        // You can override these props for each render:
        // https://www.remotion.dev/docs/parametrized-rendering
        schema={helloWorldCompSchema}
        defaultProps={{
          titleText: "Render Server Template",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />
      <Composition
        id="CameraSystem"
        component={CameraSystem}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={cameraSystemSchema}
        defaultProps={{
          backgroundColor: "#1a1a2e",
          targetX: 0,
          targetY: 0,
          zoom: 1,
          duration: 300,
        }}
      />
      <Composition
        id="CameraSystemEnhanced"
        component={CameraSystemEnhanced}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
        schema={cameraSystemEnhancedSchema}
        defaultProps={{
          backgroundColor: "#0a0a0a",
          theme: "cyberpunk",
          duration: 360,
        }}
      />
      <Composition
        id="ArrayVisualization"
        component={ArrayVisualization}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
        schema={arrayVisualizationSchema}
        defaultProps={{
          array: [64, 34, 25, 12, 22, 11, 90, 5, 77, 30],
          title: "Algorithm Visualization",
          algorithm: "bubble-sort",
          speed: 1,
        }}
      />
      <Composition
        id="ArrayVisualizationEnhanced"
        component={ArrayVisualizationEnhanced}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
        schema={arrayVisualizationEnhancedSchema}
        defaultProps={{
          array: [64, 34, 25, 12, 22, 11, 90, 5, 77, 30],
          title: "Enhanced Array Visualization",
          algorithm: "bubble-sort",
          speed: 1,
          theme: "dark",
          showCode: true,
          showIndices: true,
          showLegend: true,
          elementSize: 80,
          animationStyle: "smooth",
        }}
      />
      <Composition
        id="LinkedListVisualization"
        component={LinkedListVisualization}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
        schema={linkedListVisualizationSchema}
        defaultProps={{
          title: 'Linked List Visualization',
          nodes: [
            { id: '1', value: 10, next: '2' },
            { id: '2', value: 20, next: '3' },
            { id: '3', value: 30, next: '4' },
            { id: '4', value: 40 },
          ],
          operations: [
            { type: 'traverse' },
            { type: 'search', value: 30 },
            { type: 'insert', value: 25, position: 2 },
            { type: 'delete', position: 1 },
          ],
          theme: 'light' as const,
          speed: 1,
          showCode: true,
          showPointers: true,
        }}
      />
      <Composition
        id="RecursionVisualization"
        component={RecursionVisualization}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
        schema={recursionVisualizationSchema}
        defaultProps={{
          title: 'Recursion Visualization',
          algorithm: 'factorial' as const,
          input: 5,
          theme: 'light' as const,
          speed: 1,
          showCode: true,
          showCallStack: true,
        }}
      />
      <Composition
        id="GraphVisualization"
        component={GraphVisualization}
        durationInFrames={480}
        fps={30}
        width={1920}
        height={1080}
        schema={graphVisualizationSchema}
        defaultProps={{
          nodes: [
            { id: 'A', label: 'A', x: 300, y: 250 },
            { id: 'B', label: 'B', x: 500, y: 200 },
            { id: 'C', label: 'C', x: 700, y: 250 },
            { id: 'D', label: 'D', x: 400, y: 400 },
            { id: 'E', label: 'E', x: 600, y: 400 },
          ],
          edges: [
            { from: 'A', to: 'B', weight: 4, directed: false },
            { from: 'A', to: 'D', weight: 2, directed: false },
            { from: 'B', to: 'C', weight: 3, directed: false },
            { from: 'B', to: 'E', weight: 1, directed: false },
            { from: 'C', to: 'E', weight: 5, directed: false },
            { from: 'D', to: 'E', weight: 6, directed: false },
          ],
          title: "Graph Traversal Visualization",
          algorithm: "dfs",
          theme: "light",
          speed: 1,
          showWeights: true,
          showLabels: true,
          nodeSize: 60,
          animationStyle: "smooth",
        }}
      />
      <Composition
        id="CarFleetVisualization"
        component={CarFleetVisualization}
        durationInFrames={720}
        fps={30}
        width={1920}
        height={1080}
        schema={carFleetVisualizationSchema}
        defaultProps={{
          title: 'Car Fleet Problem - Step by Step',
          target: 12,
          cars: [
            { id: 0, position: 10, speed: 2 },
            { id: 1, position: 8, speed: 4 },
            { id: 2, position: 0, speed: 1 },
            { id: 3, position: 5, speed: 1 },
            { id: 4, position: 3, speed: 3 },
          ],
          theme: 'light' as const,
          speed: 1,
          showCode: true,
          showCalculations: true,
          phaseDuration: 10,
        }}
      />
      <Composition
        id="CarFleetVisualizationEnhanced"
        component={CarFleetVisualizationEnhanced}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        schema={carFleetVisualizationEnhancedSchema}
        defaultProps={{
          title: 'Car Fleet Problem - Enhanced with Camera',
          target: 12,
          cars: [
            { id: 0, position: 10, speed: 2 },
            { id: 1, position: 8, speed: 4 },
            { id: 2, position: 0, speed: 1 },
            { id: 3, position: 5, speed: 1 },
            { id: 4, position: 3, speed: 3 },
          ],
          theme: 'light' as const,
          speed: 1,
          showCode: true,
          showCalculations: true,
          phaseDuration: 10,
          aspectRatio: 'landscape' as const,
          useCamera: true,
        }}
      />
      <Composition
        id="CarFleetVisualizationPortrait"
        component={CarFleetVisualizationEnhanced}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        schema={carFleetVisualizationEnhancedSchema}
        defaultProps={{
          title: 'Car Fleet Problem - Mobile',
          target: 12,
          cars: [
            { id: 0, position: 10, speed: 2 },
            { id: 1, position: 8, speed: 4 },
            { id: 2, position: 0, speed: 1 },
            { id: 3, position: 5, speed: 1 },
            { id: 4, position: 3, speed: 3 },
          ],
          theme: 'light' as const,
          speed: 1,
          showCode: true,
          showCalculations: true,
          phaseDuration: 10,
          aspectRatio: 'portrait' as const,
          useCamera: true,
        }}
      />
    </>
  );
};
