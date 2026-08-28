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
  version: 2,
  steps: [
    step("create-project", (s) => {
      s.cursor.move("#create-project");
      s.present({
        target: "#create-project",
        title: "Create a project"
      });
    })
  ]
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
  step("create-project", (s) => {
    s.present({
      target: "#create-project",
      title: "Create a project"
    });
    s.click("#create-project");
  }),
  step("project-name", (s) => {
    s.present({
      target: "#project-name",
      title: "Name the project"
    });
    s.type("#project-name", "Launch workspace");
    s.waitFor.value("#project-name", "Launch workspace");
  })
]`,
  },
  {
    id: "navigation",
    label: "Navigation",
    filename: "navigation.ts",
    code: `steps: [
  step("open-project", (s) => {
    s.present({
      target: "#project-link",
      title: "Open the project"
    });
    s.navigate.click("#project-link");
  }),
  step("project-detail", {
    ready: all(
      pathname("/projects/launch"),
      visible("#project-detail")
    )
  }, (s) => {
    s.present({
      target: "#project-detail",
      title: "Project detail"
    });
  })
]`,
  },
];

export function codeExampleById(id: CodeExampleId): CodeExampleDefinition {
  return codeExamples.find((example) => example.id === id)!;
}
