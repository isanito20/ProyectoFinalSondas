<template>
  <v-app>
     <v-main class="main-background">
         <!-- Verificar si la ruta actual no es de inicio de sesión o registro -->
         <HelloWorld/>

         <RouterView />
         <Footer />
     </v-main>
  </v-app>
 </template>

 <script setup>
import HelloWorld from '@/components/botonCategorias.vue'
 </script>
 

 <style>
 /* Estilos globales para el componente principal */
 #app {
  height: 100vh;
  display: flex;
  flex-direction: column;
 }
 .main-background {
  background-color: #f4f4f4;
}
 </style>
