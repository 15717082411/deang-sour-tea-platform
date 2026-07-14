<script setup lang="ts">
import { Eye, FilePlus2, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import FilterBar from '../../components/workspace/FilterBar.vue'
import type { ContentArticle, ContentInput, ContentSource } from '../../domain/types'
import { useAdminStore } from '../../stores/admin'

const admin = useAdminStore()
const keyword = ref('')
const status = ref('ALL')
const editorOpen = ref(false)
const preview = ref<ContentArticle | null>(null)
const statusOptions = [{ label: '全部状态', value: 'ALL' }, { label: '已发布', value: 'PUBLISHED' }, { label: '草稿', value: 'DRAFT' }]
const blankSource = (): ContentSource => ({ title: '', publisher: '', url: '', claim: '' })
const blankForm = (): ContentInput => ({ title: '', slug: '', category: '', summary: '', body: '', cover: '', sources: [blankSource()], published: false })
const form = reactive<ContentInput>(blankForm())
const localError = ref<string | null>(null)
const contents = computed(() => admin.contents.filter((content) => {
  const matches = `${content.title}${content.slug}${content.category}${content.summary}`.toLowerCase().includes(keyword.value.trim().toLowerCase())
  const matchesStatus = status.value === 'ALL' || (status.value === 'PUBLISHED' ? content.published : !content.published)
  return matches && matchesStatus
}))

onMounted(() => { void admin.loadContents().catch(() => undefined) })

function newContent() {
  Object.assign(form, blankForm())
  delete form.id
  editorOpen.value = true
  localError.value = null
}

function editContent(content: ContentArticle) {
  Object.assign(form, globalThis.structuredClone(toRaw(content)))
  editorOpen.value = true
  localError.value = null
}

function addSource() { form.sources.push(blankSource()) }
function removeSource(index: number) {
  if (form.sources.length > 1) form.sources.splice(index, 1)
}

async function save(published = form.published) {
  localError.value = null
  try {
    const saved = await admin.saveContent({ ...globalThis.structuredClone(toRaw(form)), published })
    Object.assign(form, globalThis.structuredClone(saved))
    editorOpen.value = false
  } catch (error) {
    localError.value = error instanceof Error ? error.message : '内容保存失败'
  }
}

async function togglePublished(content: ContentArticle) {
  try {
    await admin.saveContent({ ...content, published: !content.published })
  } catch {
    // Store error is rendered below.
  }
}
</script>

<template>
  <article class="workspace-page">
    <header class="workspace-page__header">
      <div>
        <p class="workspace-eyebrow">
          科普内容
        </p><h1>文化内容管理</h1><p>维护德昂族酸茶专题正文、封面和可核验来源。</p>
      </div><button
        type="button"
        class="workspace-button workspace-button--primary"
        @click="newContent"
      >
        <FilePlus2 :size="18" />新建内容
      </button>
    </header>
    <FilterBar
      v-model="keyword"
      v-model:status="status"
      :status-options="statusOptions"
      placeholder="搜索标题、路径或分类"
    />
    <p
      v-if="admin.feedback"
      class="workspace-alert workspace-alert--success"
      role="status"
    >
      {{ admin.feedback }}
    </p>
    <p
      v-if="admin.error"
      class="workspace-alert"
      role="alert"
    >
      {{ admin.error }}
    </p>
    <section
      v-if="admin.loading && admin.contents.length === 0"
      class="workspace-state"
    >
      正在加载内容…
    </section>
    <section
      v-else-if="contents.length === 0"
      class="workspace-empty"
    >
      <FilePlus2 :size="28" /><h2>没有符合条件的内容</h2>
    </section>
    <section
      v-else
      class="admin-content-list"
    >
      <article
        v-for="content in contents"
        :key="content.id"
        class="admin-content-item"
      >
        <img
          :src="content.cover"
          :alt="`${content.title}封面`"
        ><div><span :class="['workspace-status', content.published ? 'workspace-status--approved' : 'workspace-status--draft']">{{ content.published ? '已发布' : '草稿' }}</span><h2>{{ content.title }}</h2><p>{{ content.category }} · /culture/{{ content.slug }}</p><small>{{ content.summary }}</small><span>{{ content.sources.length }} 条来源</span></div><div class="admin-content-actions">
          <button
            type="button"
            class="workspace-icon-button"
            title="预览"
            aria-label="预览内容"
            @click="preview = content"
          >
            <Eye :size="18" />
          </button><button
            type="button"
            class="workspace-icon-button"
            title="编辑"
            aria-label="编辑内容"
            @click="editContent(content)"
          >
            <Pencil :size="18" />
          </button><button
            type="button"
            class="workspace-button"
            :disabled="admin.pendingOperations > 0"
            @click="togglePublished(content)"
          >
            {{ content.published ? '取消发布' : '发布' }}
          </button>
        </div>
      </article>
    </section>

    <Teleport to="body">
      <div
        v-if="editorOpen"
        class="admin-modal-backdrop"
        @click.self="editorOpen = false"
      >
        <section
          class="admin-content-editor"
          role="dialog"
          aria-modal="true"
          aria-labelledby="content-editor-title"
        >
          <header>
            <div>
              <p class="workspace-eyebrow">
                内容编辑
              </p><h2 id="content-editor-title">
                {{ form.id ? '编辑酸茶内容' : '新建酸茶内容' }}
              </h2>
            </div><button
              type="button"
              class="workspace-icon-button"
              aria-label="关闭内容编辑器"
              @click="editorOpen = false"
            >
              <X :size="18" />
            </button>
          </header>
          <form
            class="workspace-form admin-content-form"
            @submit.prevent="save(false)"
          >
            <div class="workspace-form__grid">
              <label>标题<input
                v-model="form.title"
                maxlength="80"
              ></label>
              <label>访问路径<input
                v-model="form.slug"
                placeholder="lowercase-slug"
              ></label>
              <label>分类<input v-model="form.category"></label>
              <label>封面地址<input v-model="form.cover"></label>
              <label class="workspace-form__wide">摘要<textarea
                v-model="form.summary"
                rows="3"
              /></label>
              <label class="workspace-form__wide">正文<textarea
                v-model="form.body"
                rows="10"
              /></label>
            </div>
            <section class="admin-source-editor">
              <div class="workspace-section__heading">
                <div>
                  <p class="workspace-eyebrow">
                    事实来源
                  </p><h3>来源元数据</h3>
                </div><button
                  type="button"
                  class="workspace-button"
                  @click="addSource"
                >
                  <Plus :size="17" />添加来源
                </button>
              </div>
              <fieldset
                v-for="(source, index) in form.sources"
                :key="index"
              >
                <legend>来源 {{ index + 1 }}</legend><label>标题<input v-model="source.title"></label><label>发布机构<input v-model="source.publisher"></label><label class="admin-source-editor__wide">网址<input
                  v-model="source.url"
                  type="url"
                ></label><label class="admin-source-editor__wide">支持内容<textarea
                  v-model="source.claim"
                  rows="2"
                /></label><button
                  type="button"
                  class="workspace-icon-button"
                  :disabled="form.sources.length === 1"
                  aria-label="删除来源"
                  title="删除来源"
                  @click="removeSource(index)"
                >
                  <Trash2 :size="17" />
                </button>
              </fieldset>
            </section>
            <p
              v-if="localError"
              class="workspace-alert"
              role="alert"
            >
              {{ localError }}
            </p>
            <footer>
              <button
                type="submit"
                class="workspace-button"
                :disabled="admin.pendingOperations > 0"
              >
                保存草稿
              </button><button
                type="button"
                class="workspace-button workspace-button--primary"
                :disabled="admin.pendingOperations > 0"
                @click="save(true)"
              >
                保存并发布
              </button>
            </footer>
          </form>
        </section>
      </div>

      <div
        v-if="preview"
        class="admin-modal-backdrop"
        @click.self="preview = null"
      >
        <article
          class="admin-content-preview"
          role="dialog"
          aria-modal="true"
          aria-labelledby="content-preview-title"
        >
          <button
            type="button"
            class="workspace-icon-button"
            aria-label="关闭预览"
            @click="preview = null"
          >
            <X :size="18" />
          </button><img
            :src="preview.cover"
            :alt="`${preview.title}封面`"
          ><p class="workspace-eyebrow">
            {{ preview.category }} · {{ preview.published ? '公开预览' : '草稿预览' }}
          </p><h2 id="content-preview-title">
            {{ preview.title }}
          </h2><p>{{ preview.summary }}</p><div class="admin-content-preview__body">
            <p
              v-for="paragraph in preview.body.split('\n\n').filter(Boolean)"
              :key="paragraph"
            >
              {{ paragraph }}
            </p>
          </div><h3>事实来源</h3><ol>
            <li
              v-for="source in preview.sources"
              :key="source.url"
            >
              <strong>{{ source.title }}</strong><span>{{ source.publisher }}</span><p>{{ source.claim }}</p>
            </li>
          </ol>
        </article>
      </div>
    </Teleport>
  </article>
</template>
