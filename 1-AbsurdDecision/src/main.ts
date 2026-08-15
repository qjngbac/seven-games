import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";

// 全局错误处理：任何渲染/运行错误都不让游戏白屏，给出可读信息（文档 §6.3 / §10.1）。
window.addEventListener("error", (e) => {
  console.error("[AbsurdDecision] 运行时错误：", e.message);
});

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
