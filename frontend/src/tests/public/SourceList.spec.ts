import { mount } from '@vue/test-utils'
import SourceList from '../../components/culture/SourceList.vue'

describe('SourceList', () => {
  it('renders directly accessible source links with safe external-link attributes', () => {
    const wrapper = mount(SourceList, {
      props: {
        sources: [{
          title: '德昂族酸茶制作技艺',
          publisher: '中国非物质文化遗产网·中国非物质文化遗产数字博物馆',
          url: 'https://www.ihchina.cn/project_details/23582/',
        }],
      },
    })

    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('https://www.ihchina.cn/project_details/23582/')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
    expect(link.attributes('rel')).toContain('noreferrer')
    expect(wrapper.text()).toContain('德昂族酸茶制作技艺')
    expect(wrapper.text()).toContain('中国非物质文化遗产网·中国非物质文化遗产数字博物馆')
  })
})
