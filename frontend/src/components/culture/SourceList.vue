<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'

export interface PublicSource {
  title: string
  publisher: string
  url: string
  claim?: string
}

defineProps<{ sources: PublicSource[] }>()
</script>

<template>
  <section
    class="source-list"
    aria-labelledby="source-list-title"
  >
    <div class="section-heading section-heading--compact">
      <p class="section-kicker">
        可核验资料
      </p>
      <h2 id="source-list-title">
        来源与依据
      </h2>
    </div>
    <ol class="source-list__items">
      <li
        v-for="source in sources"
        :key="source.url"
        class="source-list__item"
      >
        <div>
          <p class="source-list__publisher">
            {{ source.publisher }}
          </p>
          <a
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`${source.title}（在新窗口打开）`"
          >
            <span>{{ source.title }}</span>
            <ExternalLink
              :size="16"
              aria-hidden="true"
            />
          </a>
          <p
            v-if="source.claim"
            class="source-list__claim"
          >
            支持内容：{{ source.claim }}
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>
