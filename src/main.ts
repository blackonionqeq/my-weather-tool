import { mount } from 'svelte'
import App from './App.svelte'
import './styles/global.css'

if (import.meta.env.DEV) {
  import('eruda').then((module) => {
    module.default.init()
  })
}

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
