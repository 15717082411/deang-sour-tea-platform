<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sanitizeRedirect } from '../../router/redirect'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const phone = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.register({ username: username.value, password: password.value, phone: phone.value })
    await router.replace(sanitizeRedirect(route.query.redirect) ?? '/account')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '注册失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <form @submit.prevent="submit">
      <h1>注册账户</h1>
      <p v-if="error" role="alert">{{ error }}</p>
      <label>用户名<input v-model.trim="username" name="username" autocomplete="username" required /></label>
      <label>密码<input v-model="password" name="password" type="password" autocomplete="new-password" required /></label>
      <label>手机号<input v-model.trim="phone" name="phone" autocomplete="tel" required /></label>
      <button type="submit" :disabled="submitting">{{ submitting ? '注册中' : '注册' }}</button>
      <RouterLink to="/login">已有账户，去登录</RouterLink>
    </form>
  </main>
</template>

<style scoped>
.auth-page { display: grid; min-height: calc(100vh - 104px); padding: 32px 16px; place-items: center; }
form { display: grid; width: min(100%, 400px); padding: 28px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); gap: 16px; }
h1 { margin: 0; }
label { display: grid; gap: 6px; }
input, button { min-height: 44px; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 4px; }
button { border-color: #526632; background: #526632; color: #fff; cursor: pointer; }
[role="alert"] { margin: 0; color: #a23325; }
</style>
