import type { Presenter, PresenterContext, StepPresentation } from "@scenema/core";

export interface TourPresenterOptions {
  document?: Document;
  nextLabel?: string;
  backLabel?: string;
}

export function createTourPresenter(options: TourPresenterOptions = {}): Presenter {
  const document = options.document ?? window.document;
  let host: HTMLElement | null = null;
  let removePositionListeners = () => {};

  const dismiss = () => {
    removePositionListeners();
    removePositionListeners = () => {};
    host?.remove();
    host = null;
  };

  return {
    present(presentation: StepPresentation, context: PresenterContext) {
      dismiss();
      host = document.createElement("div");
      host.dataset.scenemaPresenter = "tour";
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host { all: initial; position: fixed; z-index: 2147483647; inset: 0; pointer-events: none; }
          .card { position: fixed; width: min(320px, calc(100vw - 32px)); padding: 18px; color: #f8fafc;
            background: #111827; border: 1px solid #374151; border-radius: 14px; box-shadow: 0 18px 48px #0005;
            font: 14px/1.45 ui-sans-serif, system-ui, sans-serif; pointer-events: auto; }
          h2 { margin: 0 0 6px; font-size: 16px; } p { margin: 0 0 14px; color: #cbd5e1; }
          footer { display: flex; align-items: center; gap: 8px; } .progress { margin-right: auto; color: #94a3b8; font-size: 12px; }
          button { border: 0; border-radius: 8px; padding: 8px 12px; font: inherit; cursor: pointer; }
          .back { color: #e2e8f0; background: #334155; } .next { color: #111827; background: #f8fafc; font-weight: 650; }
        </style>
        <section class="card" role="dialog" aria-live="polite" aria-labelledby="scenema-title">
          <h2 id="scenema-title"></h2><p></p><footer><span class="progress"></span>
          <button class="back" type="button"></button><button class="next" type="button"></button></footer>
        </section>`;

      root.querySelector("h2")!.textContent = presentation.title;
      const description = root.querySelector("p")!;
      description.textContent = presentation.description ?? "";
      if (!presentation.description) description.remove();
      root.querySelector(".progress")!.textContent = `${context.stepNumber} / ${context.totalSteps}`;
      const back = root.querySelector<HTMLButtonElement>(".back")!;
      back.textContent = options.backLabel ?? "Back";
      back.hidden = !context.canPrevious;
      back.addEventListener("click", context.controls.previous);
      const next = root.querySelector<HTMLButtonElement>(".next")!;
      next.textContent = options.nextLabel ?? (context.stepNumber === context.totalSteps ? "Finish" : "Next");
      next.addEventListener("click", context.controls.proceed);
      document.body.append(host);
      const card = root.querySelector<HTMLElement>(".card")!;
      const updatePosition = () => positionCard(card, context.target, document);
      updatePosition();
      document.defaultView?.addEventListener("resize", updatePosition);
      document.addEventListener("scroll", updatePosition, true);
      removePositionListeners = () => {
        document.defaultView?.removeEventListener("resize", updatePosition);
        document.removeEventListener("scroll", updatePosition, true);
      };
      next.focus();
    },
    dismiss,
  };
}

function positionCard(card: HTMLElement, target: string | undefined, document: Document): void {
  const element = target ? document.querySelector(target) : null;
  if (!element) {
    card.style.left = "50%";
    card.style.top = "50%";
    card.style.transform = "translate(-50%, -50%)";
    return;
  }
  const rect = element.getBoundingClientRect();
  const left = Math.min(Math.max(16, rect.left), Math.max(16, document.defaultView!.innerWidth - 336));
  const top = rect.bottom + 12;
  card.style.left = `${left}px`;
  card.style.top = `${Math.max(16, Math.min(top, document.defaultView!.innerHeight - 180))}px`;
}
