import {createPinia} from "pinia";

const pinia = createPinia();
export * from '@/store/penStore';
export * from '@/store/settings';
export default pinia;