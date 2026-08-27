export type ExampleId = "highlight" | "click" | "type" | "navigation";

export interface ExampleDefinition {
  id: ExampleId;
  label: string;
  title: string;
  description: string;
  path: string;
  code: string;
}

export const examples: readonly ExampleDefinition[] = [
  {
    id: "highlight",
    label: "Highlight",
    title: "Put one element in focus",
    description: "Point to a stable target while the rest of the interface stays in context.",
    path: "/examples/highlight",
    code: `defineScenario({
  id: "feature-highlight",
  scenes: [{
    id: "home",
    match: { pathname: "/" },
    steps: [{
      id: "highlight",
      target: "#highlight-example-target",
      present: {
        title: "A new feature",
        description: "Keep the product in context."
      }
    }]
  }]
})`,
  },
  {
    id: "click",
    label: "Click",
    title: "Perform the next click",
    description: "Wait for the visitor, then click the real control and let the interface respond.",
    path: "/examples/click",
    code: `steps: [{
  id: "run-action",
  target: "#click-example-action",
  present: {
    title: "Run the action"
  },
  commit: { click: true },
  exit: {
    until: { visible: "#action-complete" }
  }
}]`,
  },
  {
    id: "type",
    label: "Type",
    title: "Type into the real field",
    description: "Fill a product field through the same DOM target a person would use.",
    path: "/examples/type",
    code: `steps: [{
  id: "workspace-name",
  target: "#type-example-input",
  present: {
    title: "Name the workspace"
  },
  commit: {
    type: { value: "Launch workspace" }
  },
  exit: {
    until: { value: "Launch workspace" }
  }
}]`,
  },
  {
    id: "navigation",
    label: "Navigate",
    title: "Continue across a new route",
    description: "Prepare the transition, change the pathname, and continue the same sequence.",
    path: "/examples/navigation",
    code: `steps: [{
  id: "open-next-route",
  target: "#navigation-example-action",
  present: {
    title: "Continue to the next route"
  },
  transition: {
    trigger: { click: true },
    to: "navigation-complete"
  }
}]`,
  },
];

export function exampleById(id: ExampleId): ExampleDefinition {
  return examples.find((example) => example.id === id)!;
}

export function exampleFromPath(path: string): ExampleId {
  return examples.find((example) => example.path === path)?.id ?? "highlight";
}

export function isExamplePath(path: string): boolean {
  return path === "/" || examples.some((example) => example.path === path);
}
