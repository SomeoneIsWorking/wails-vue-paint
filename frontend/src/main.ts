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
    `Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}\n\tStack: ${event.error?.stack.split('\n').join('\n\t     - ')}`
  );
});
app.use(pinia);
app.mount("#app");
