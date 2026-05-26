// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router' // <-- Añade esto

const app = createApp(App)

app.use(vuetify)
app.use(router) // <-- Añade esto
app.mount('#app')