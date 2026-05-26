// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/index.vue' // Esta será tu página del mapa

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router