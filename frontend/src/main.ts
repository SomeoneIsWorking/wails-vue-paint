import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import { Log } from "../wailsjs/go/main/App";

const app = createApp(App);
const pinia = createPinia();

console.log = (...args) => Log(args.join(", "));
window.addEventListener("error", (event) => {
  Log(
    `Error: ${event.message} at ${event.filename}:${event.lineno}:${
      event.colno
    }\n\tStack: ${event.error?.stack.split("\n").join("\n\t     - ")}`
  );
});
app.config.errorHandler = (err, _vm, info) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const formattedStack = error.stack?.split("\n").join("\n\t     - ");
  Log(`Error: ${error.message}\n\tInfo: ${info}\n\tStack: ${formattedStack}`);
};
app.use(pinia);
app.mount("#app");
