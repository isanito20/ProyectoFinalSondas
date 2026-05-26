<template>
  <div class="main-page-wrapper">
    
    <button class="pdf-btn" @click="exportarInformePDF" :disabled="exportando">
      <v-icon color="white" class="mr-2">mdi-file-pdf-box</v-icon>
      {{ exportando ? 'Generando PDF...' : 'Descargar Informe Completo' }}
    </button>
    
    <div ref="container" class="full-screen-viewer">
      <div 
        v-for="(labelData, index) in labels" 
        :key="index"
        :ref="el => labelRefs[index] = el"
        class="label-wrapper"
      >
        <div class="label-pin">{{ labelData.icono }} {{ labelData.titulo }}</div>
        
        <div class="label-dropdown">
          <p class="info-title">{{ labelData.sensor }}</p>
          <p class="temp-display">{{ labelData.temp }}°C</p>
          <p class="hum-display">💧 {{ labelData.hum }}%</p>
          <div class="status-badge">En Vivo</div>
        </div>
      </div>

      <div v-if="loading" class="loading-screen">
        <div class="spinner"></div>
        <p>Iniciando Sistema... {{ progress }}%</p>
      </div>

      <div class="scroll-hint">
        <span>Bajar para ver estadísticas</span>
        <v-icon color="white">mdi-chevron-down</v-icon>
      </div>
    </div>

    <div id="informe-dashboard" class="dashboard-section">
      <v-container>
        <v-row>
          <v-col cols="12">
            <div class="chart-container-dark">
              <div class="chart-header">
                <h3>HISTORIAL TÉRMICO GLOBAL</h3>
                <span class="live-indicator">● LIVE</span>
              </div>
              <div class="chart-wrapper">
                <Line :data="chartData" :options="chartOptions" />
              </div>
            </div>
          </v-col>
          
          <v-col cols="12" class="mt-6">
            <div class="table-container-dark">
              <div class="table-header">
                <h3>REGISTRO DETALLADO DE ÚLTIMAS LECTURAS</h3>
                <span class="table-subtitle">Actualizado cada 5 segundos</span>
              </div>
              <table class="custom-data-table">
                <thead>
                  <tr>
                    <th>Hora de Registro</th>
                    <th>2º Grado Medio (Real)</th>
                    <th>1º Grado Superior (Sim)</th>
                    <th>1º Grado Medio (Sim)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in tablaHistorial" :key="idx">
                    <td class="time-col">{{ row.hora }}</td>
                    <td class="temp-real">{{ row.clase0.temp }}°C / {{ row.clase0.hum }}%</td>
                    <td class="temp-sim1">{{ row.clase1.temp }}°C / {{ row.clase1.hum }}%</td>
                    <td class="temp-sim2">{{ row.clase2.temp }}°C / {{ row.clase2.hum }}%</td>
                  </tr>
                  <tr v-if="tablaHistorial.length === 0">
                    <td colspan="4" class="no-data">Esperando primeras lecturas del TinyPICO...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref, reactive, onUnmounted } from "vue";
import * as THREE from "three";
import { Viewer } from "@mkkellogg/gaussian-splats-3d";
import { Line } from 'vue-chartjs';
import { 
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, 
  PointElement, CategoryScale, LinearScale, Filler 
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler);

const IP_ESP32 = "http://192.168.137.231"; 
let fetchInterval = null;

const container = ref(null);
const labelRefs = ref([]);
const loading = ref(true);
const progress = ref(0);
const exportando = ref(false);
let viewer;

// Estructura de almacenamiento para la tabla del PDF
const tablaHistorial = ref([]);

const labels = reactive([
  { titulo: "2º Grado Medio", icono: "📍", sensor: "1º GRADO MEDIO", pos: new THREE.Vector3(-0.50, -0.50, -0.90), temp: "--", hum: "--" },
  { titulo: "1º Grado Medio", icono: "⚽", sensor: "2º GRADO MEDIO", pos: new THREE.Vector3(-0.28, -0.53, -0.78), temp: "--", hum: "--" },
  { titulo: "1º Grado Superior", icono: "🧪", sensor: "1º GRADO SUPERIOR", pos: new THREE.Vector3(-0.01, -0.58, -0.73), temp: "--", hum: "--" },
]);

const chartData = ref({
  labels: [], 
  datasets: [
    {
      label: '2º GRADO MEDIO',
      data: [],
      borderColor: '#00e7ff',
      backgroundColor: 'rgba(0, 231, 255, 0.05)',
      fill: true,
      tension: 0.4,
      pointRadius: 4
    },
    {
      label: '1º GRADO SUPERIOR',
      data: [],
      borderColor: '#f59e0b',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.4,
      pointRadius: 2
    },
    {
      label: '1º GRADO MEDIO',
      data: [],
      borderColor: '#10b981',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.4,
      pointRadius: 2
    }
  ]
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false, // Desactivamos animaciones internas de la gráfica para evitar renders borrosos en el PDF
  plugins: { legend: { display: true, labels: { color: 'white' } } },
  scales: {
    y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
  }
};

async function obtenerDatosSensor() {
  try {
    const urlAntiCache = `${IP_ESP32}?t=${new Date().getTime()}`;
    const response = await fetch(urlAntiCache);
    const html = await response.text();

    const tempMatch = html.match(/([\d.]+)\s*°C/);
    const humMatch = html.match(/([\d.]+)\s*%/);
    
    if (tempMatch && humMatch) {
      const nuevaTempReal = parseFloat(tempMatch[1]);
      const nuevaHumReal = parseFloat(humMatch[1]);
      const ahora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      console.log(`[${ahora}] ¡Dato fresco recibido! Temp: ${nuevaTempReal}°C | Hum: ${nuevaHumReal}%`);

      const ruido1 = (Math.random() * 0.4) - 0.2;
      const ruido2 = (Math.random() * 0.4) - 0.2;

      const tempDeportiva = nuevaTempReal - 0.5 + ruido1;
      const humDeportiva = nuevaHumReal + 2.3 + (ruido1 * 5);

      const tempLaboratorio = nuevaTempReal + 0.5 + ruido2;
      const humLaboratorio = nuevaHumReal - 4.1 + (ruido2 * 5);

      if (labels && labels[0]) {
        Object.assign(labels[0], { temp: nuevaTempReal.toFixed(1), hum: nuevaHumReal.toFixed(1) });
        Object.assign(labels[1], { temp: tempDeportiva.toFixed(1), hum: humDeportiva.toFixed(1) });
        Object.assign(labels[2], { temp: tempLaboratorio.toFixed(1), hum: humLaboratorio.toFixed(1) });
      }

      // Añadir al registro de la tabla
      tablaHistorial.value.unshift({
        hora: ahora,
        clase0: { temp: nuevaTempReal.toFixed(1), hum: nuevaHumReal.toFixed(1) },
        clase1: { temp: tempDeportiva.toFixed(1), hum: humDeportiva.toFixed(1) },
        clase2: { temp: tempLaboratorio.toFixed(1), hum: humLaboratorio.toFixed(1) }
      });

      if (tablaHistorial.value.length > 12) {
        tablaHistorial.value.pop(); // Mantenemos las últimas 12 lecturas (1 minuto de historial completo)
      }

      const nuevosLabels = [...chartData.value.labels, ahora];
      const datosClase0 = [...chartData.value.datasets[0].data, parseFloat(nuevaTempReal.toFixed(1))];
      const datosClase1 = [...chartData.value.datasets[1].data, parseFloat(tempDeportiva.toFixed(1))];
      const datosClase2 = [...chartData.value.datasets[2].data, parseFloat(tempLaboratorio.toFixed(1))];

      if (nuevosLabels.length > 10) {
        nuevosLabels.shift();
        datosClase0.shift();
        datosClase1.shift();
        datosClase2.shift();
      }

      chartData.value = {
        labels: nuevosLabels,
        datasets: [
          { ...chartData.value.datasets[0], data: datosClase0 },
          { ...chartData.value.datasets[1], data: datosClase1 },
          { ...chartData.value.datasets[2], data: datosClase2 }
        ]
      };
    }
  } catch (err) {
    console.error("Error en el refresco de datos:", err);
  }
}

// FUNCIÓN MAESTRA: EXPORTACIÓN A PDF PREMIUM
function exportarInformePDF() {
  exportando.value = true;
  const elemento = document.getElementById("informe-dashboard");

  // Configuración de conversión
  const opciones = {
    margin: [10, 10, 10, 10],
    filename: `Informe_Termico_IES_Sierra_Aras_${new Date().toISOString().slice(0,10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, // Doble resolución para que el texto de la tabla y la gráfica no se pixelen
      useCORS: true,
      backgroundColor: '#0b0e14' // Mantenemos la estética oscura en el papel
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opciones).from(elemento).save().then(() => {
    exportando.value = false;
  }).catch((error) => {
    console.error("Error al renderizar PDF:", error);
    exportando.value = false;
  });
}

onMounted(async () => {
  viewer = new Viewer({
    rootElement: container.value,
    cameraUp: [0, -1, 0], 
    initialCameraPosition: [-1.140, -1.055, -2.285], 
    initialCameraLookAt: [-0.443, -0.623, -0.723], 
    dynamicScene: true
  });

  try {
    await viewer.addSplatScene("/Colegio.splat", {
      'splatAlphaRemovalThreshold': 5,
      'onProgress': (p) => { progress.value = p; }
    });
    loading.value = false;
    animate();
    
    obtenerDatosSensor();
    fetchInterval = setInterval(obtenerDatosSensor, 5000);
    
  } catch (err) { console.error(err); }
});

onUnmounted(() => {
  if (fetchInterval) clearInterval(fetchInterval);
});

function updateAllLabels() {
  const camera = viewer.camera;
  if (!camera || !container.value) return;
  const width = container.value.clientWidth;
  const height = container.value.clientHeight;

  labels.forEach((labelData, index) => {
    const el = labelRefs.value[index];
    if (!el) return;
    const p = labelData.pos.clone().project(camera);
    if (p.z > -1 && p.z < 1) {
      el.style.display = "block";
      el.style.transform = `translate(-50%, -50%) translate(${(p.x * 0.5 + 0.5) * width}px, ${(-p.y * 0.5 + 0.5) * height}px)`;
    } else { el.style.display = "none"; }
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (viewer) {
    viewer.update();
    viewer.render();
    updateAllLabels();
  }
}
</script>

<style scoped>
/* BOTÓN PDF ESTILO CYBERPUNK */
.pdf-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 999;
  background: linear-gradient(135deg, #ff2a5f 0%, #ff7e40 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 42, 95, 0.4);
  transition: all 0.3s ease;
}
.pdf-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 42, 95, 0.6);
}
.pdf-btn:disabled {
  background: #4b5563;
  cursor: not-allowed;
  box-shadow: none;
}

.main-page-wrapper {
  background-color: #0b0e14;
  overflow-y: auto;
}

.full-screen-viewer {
  width: 100%;
  height: 85vh;
  position: relative;
  overflow: hidden;
}

.dashboard-section {
  min-height: 500px;
  background-color: #0b0e14;
  padding: 60px 0;
  border-top: 2px solid #1c2128;
}

.chart-container-dark, .table-container-dark {
  background: #111827;
  border-radius: 16px;
  padding: 30px;
  border: 1px solid #1f2937;
}

.chart-wrapper { height: 400px; }

.chart-header, .table-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  color: white;
}
.chart-header h3, .table-header h3 { margin: 0; font-size: 18px; letter-spacing: 1px; }

.live-indicator {
  color: #ee2f0d;
  font-size: 14px;
  font-weight: bold;
  margin-top: 5px;
  animation: blink 1.2s infinite;
}

.table-subtitle { color: #9ca3af; font-size: 13px; margin-top: 5px; }

/* ESTILOS DE LA TABLA DEL INFORME */
.custom-data-table {
  width: 100%;
  border-collapse: collapse;
  color: #e5e7eb;
  text-align: left;
}
.custom-data-table th {
  padding: 12px;
  border-bottom: 2px solid #1f2937;
  color: #9ca3af;
  font-size: 14px;
  text-transform: uppercase;
}
.custom-data-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #1f2937;
  font-size: 15px;
}
.time-col { color: #00e7ff; font-weight: bold; }
.temp-real { color: #00e7ff; }
.temp-sim1 { color: #f59e0b; }
.temp-sim2 { color: #10b981; }
.no-data { text-align: center; color: #6b7280; padding: 30px !important; }

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.1; }
  100% { opacity: 1; }
}

.scroll-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  pointer-events: none;
}

.label-wrapper { position: absolute; z-index: 10; }
.label-pin { background: #ffeb3b; padding: 6px 14px; border-radius: 20px; font-weight: bold; border: 2px solid #000; cursor: pointer; }

.label-dropdown {
  position: absolute; top: 45px; left: 50%; transform: translateX(-50%);
  background: white; padding: 12px; border-radius: 12px;
  opacity: 0; transition: all 0.3s ease; text-align: center;
  pointer-events: none; width: 150px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }

.label-wrapper:hover .label-dropdown { opacity: 1; }
.temp-display { font-size: 24px; font-weight: 800; color: #d32f2f; margin: 0; }
.hum-display { font-size: 18px; font-weight: 600; color: #1976d2; margin: 5px 0; }

.loading-screen { position: absolute; inset: 0; background: #0b0e14; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; z-index: 100; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(0,231,255,0.2); border-left-color: #00e7ff; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>