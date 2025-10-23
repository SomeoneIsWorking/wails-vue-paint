import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import { Log } from "../wailsjs/go/main/App";

const app = createApp(App);
const pinia = createPinia();

console.log = (...args) => Log(args.join(", "));
app.use(pinia);
app.mount("#app");
