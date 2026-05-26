<template>
  <div class="jersey-font">
    <v-app-bar app class="anime-style-bar" height="120" flat>
      <v-container class="d-flex align-center fill-height">
        <div class="logo-container" style="cursor: pointer;">
          <img src="@/assets/sierralogo.png" alt="Logo" class="logo-img" />
        </div>
        <v-spacer></v-spacer>
        <div class="d-flex align-center">
          <v-btn class="nav-btn" text @click="generarPDF">
            <img :src="pdfIcon" class="icon-red-pdf" alt="PDF Icon" /> 
            <span>DESCARGAR INFORME</span>
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>
  </div>
</template>

<script setup>
import { jsPDF } from "jspdf";
import pdfIcon from '@/assets/file-pdf-box.svg'; 

// Recibimos los datos actuales y el histórico desde tu index.vue
const props = defineProps(['datosSensores', 'historial']); 

const generarPDF = () => {
  const doc = new jsPDF();
  const fecha = new Date().toLocaleString();

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INFORME TÉRMICO - PROYECTO FRÍO", 20, 20);
  doc.setFontSize(10);
  doc.text(`Fecha de reporte: ${fecha}`, 20, 30);
  doc.line(20, 35, 190, 35);

  // 1. Estado Actual
  let y = 50;
  doc.setFontSize(14);
  doc.text("Estado actual de los sensores:", 20, y);
  y += 10;
  
  // Usamos los datos recibidos (o los de ejemplo si aún no hay datos)
  const lista = props.datosSensores || [
    { titulo: "2º Grado Medio", sensor: "Aula Principal", temp: 24.2 },
    { titulo: "1º Grado Medio", sensor: "Zona Deportiva", temp: 21.5 },
    { titulo: "1º Grado Superior", sensor: "Laboratorio", temp: 22.8 }
  ];

  lista.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${item.titulo}:`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${item.temp}°C (${item.sensor})`, 70, y);
    y += 10;
  });

  // 2. Histórico
  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Historial de registros:", 20, y);
  y += 10;
  
  doc.setFontSize(10);
  // Si hay histórico, lo pintamos; si no, avisamos
  if (props.historial && props.historial.length > 0) {
    props.historial.slice(-15).forEach((reg) => { // Últimos 15 registros
      doc.text(`${reg.hora} - Temp: ${reg.temp}°C en ${reg.ubicacion}`, 20, y);
      y += 7;
    });
  } else {
    doc.text("No hay datos históricos acumulados aún.", 20, y);
  }

  doc.save("Informe_Termico_Completo.pdf");
};
</script>

<style scoped>
.anime-style-bar { background-color: #000000 !important; color: white !important; }
.logo-img { width: 120px; }
.nav-btn { color: #9ca3af !important; text-transform: none; font-size: 16px; }
.icon-red-pdf { width: 50px; height: 50px; margin-right: 15px; filter: invert(12%) sepia(87%) saturate(7441%) hue-rotate(357deg) brightness(96%) contrast(113%); }
</style>