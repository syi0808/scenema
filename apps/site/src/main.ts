import { mount } from "svelte";

import App from "./App.svelte";
import "./styles.css";

const app = mount(App, {
  target: document.querySelector<HTMLDivElement>("#app")!,
});

export default app;
