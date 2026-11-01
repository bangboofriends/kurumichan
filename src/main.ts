import {createApp} from "vue";
// @ts-ignore
import App from "./App.vue";
import 'virtual:uno.css';
import "@/main.css";
import pinia from '@/store'
import {useSettingsStore} from '@/store'
import router from "@/router";

console.log("kurumichan v1.0\n老实写白板，很枯燥吧？");

const app = createApp(App);
app.use(pinia);
app.use(router);

// 启动时尝试读取本地 settings.json（失败则使用默认值）
useSettingsStore().loadFromDisk();

app.mount("#app");
