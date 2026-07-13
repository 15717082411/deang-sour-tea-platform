import { config } from '@vue/test-utils'

config.global.stubs = {
  RouterView: true,
  transition: false,
  'transition-group': false,
}
