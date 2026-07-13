import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/public.css'
import './styles/commerce.css'
import './styles/account.css'
import App from './App.vue'
import { createAppRouter } from './router'

const pinia = createPinia()
const router = createAppRouter(pinia)

createApp(App).use(pinia).use(router).use(ElementPlus).mount('#app')
