import {createRouter, createWebHistory, type RouteRecordRaw} from "vue-router";

const routes: RouteRecordRaw[] = [
    {
        path: '/dmb',
        name: 'dmbwb',
        component: () => import("@/pages/DefaultMaybe.vue"),
        meta: {title: "白板"}
    },
    {
        path: '/debugs/testdraw',
        name: 'nwb',
        component: () => import("@/pages/DrawTest.vue"),
        meta: {title: "白板"}
    },
    {
        path: '/debugs/testtap',
        name: 'ttt1',
        component: () => import("@/pages/TapTest.vue"),
        meta: {title: "白板"}
    },
    {
        path: '/homework',
        name: 'hwb',
        component: () => import("@/pages/HomeWorkBoard.vue"),
        meta: {title: "作业板"}
    },
    {
        path: '/',
        name: 'whiteboard',
        component: () => import("@/pages/WhiteBoard.vue"),
        meta: {title: "白板"}
    },

// 必须放最后！！！！！！
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import("@/pages/NotFoundFallback.vue")
    }
];

const router = createRouter({history: createWebHistory(import.meta.env.BASE_URL), routes});
export default router;