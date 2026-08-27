export type DemoId = "page-tour" | "single-highlight" | "dom-action";
export type CodeExampleId = "product-tour" | "dom-action" | "navigation";

export interface DemoDefinition {
  id: DemoId;
  label: string;
}

export interface CodeExampleDefinition {
  id: CodeExampleId;
  label: string;
  filename: string;
  code: string;
}

export const demos: readonly DemoDefinition[] = [
  { id: "page-tour", label: "Page tour" },
  { id: "single-highlight", label: "Single highlight" },
  { id: "dom-action", label: "DOM action" },
];

export const codeExamples: readonly CodeExampleDefinition[] = [
  {
    id: "product-tour",
    label: "Product tour",
    filename: "onboarding.ts",
    code: `const onboarding = defineScenario({
  id: "onboarding",
  version: 1,
  scenes: [{
    id: "projects",
    match: { pathname: "/projects" },
    steps: [{
      id: "create-project",
      target: "#create-project",
      present: { title: "Create a project" }
    }]
  }]
});

const scenema = createScenema({
  scenarios: [onboarding],
  presenter: createTourPresenter()
});

await scenema.start(onboarding);`,
  },
  {
    id: "dom-action",
    label: "DOM action",
    filename: "actions.ts",
    code: `steps: [
  {
    id: "create-project",
    target: "#create-project",
    present: { title: "Create a project" },
    commit: { click: true }
  },
  {
    id: "project-name",
    target: "#project-name",
    present: { title: "Name the project" },
    commit: {
      type: { value: "Launch workspace" }
    },
    exit: {
      until: { value: "Launch workspace" }
    }
  }
]`,
  },
  {
    id: "navigation",
    label: "Navigation",
    filename: "navigation.ts",
    code: `scenes: [
  {
    id: "projects",
    match: { pathname: "/projects" },
    steps: [{
      id: "open-project",
      target: "#project-link",
      transition: {
        trigger: { click: true },
        to: "project-detail"
      }
    }]
  },
  {
    id: "project-detail",
    match: {
      pathname: "/projects/launch",
      visible: "#project-detail"
    },
    steps: [/* the same scenario continues */]
  }
]`,
  },
];

export function codeExampleById(id: CodeExampleId): CodeExampleDefinition {
  return codeExamples.find((example) => example.id === id)!;
}
