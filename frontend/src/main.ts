import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/tokens.css'
import './styles/base.css'
import './styles/public.css'
import './styles/commerce.css'
import './styles/account.css'
import './styles/workspace.css'
import './styles/admin.css'
import App from './App.vue'
import { initializeRepositoryMode } from './config/runtime'
import { createAppRouter } from './router'
import { useAppStore } from './stores/app'

const pinia = createPinia()
const router = createAppRouter(pinia)
const appStore = useAppStore(pinia)

createApp(App).use(pinia).use(router).mount('#app')
void initializeRepositoryMode(() => appStore.detectApi())
