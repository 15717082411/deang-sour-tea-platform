import { mount } from '@vue/test-utils'
import App from '../App.vue'

it('renders the Deang sour tea product identity', () => {
  expect(mount(App).text()).toContain('德昂族酸茶')
})
