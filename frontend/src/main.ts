import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
})

createApp(App).use(createPinia()).use(router).use(ElementPlus).mount('#app')
