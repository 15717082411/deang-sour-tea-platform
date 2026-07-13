<template>
  <section class="account-layout">
    <aside aria-label="用户中心导航">
      <p class="account-layout__title">
        用户中心
      </p>
      <nav>
        <RouterLink to="/account">
          用户档案
        </RouterLink>
        <RouterLink to="/account/orders">
          我的订单
        </RouterLink>
        <RouterLink to="/account/bookings">
          预约记录
        </RouterLink>
        <RouterLink to="/account/journeys">
          互动配方
        </RouterLink>
        <RouterLink to="/account/after-sales">
          售后服务
        </RouterLink>
      </nav>
    </aside>
    <main><RouterView /></main>
  </section>
</template>

<style scoped>
.account-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: calc(100vh - 64px); }
aside { padding: 24px; border-right: 1px solid var(--color-border); background: var(--color-surface); }
.account-layout__title { margin: 0 0 20px; font-size: 20px; font-weight: 700; }
nav { display: grid; gap: 12px; }
a { display: inline-flex; min-height: 44px; align-items: center; color: var(--color-ink); text-decoration: none; }
main { padding: 32px; }
@media (max-width: 720px) { .account-layout { grid-template-columns: 1fr; } aside { border-right: 0; border-bottom: 1px solid var(--color-border); } nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } main { padding: 20px; } }
</style>
