// NUEVO LINK ASIGNADO
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZc3mIbD6Q83gohbWp-uTE3jjZVGLSAPqBErfFNn-sMWLi4EwsFg43Kki5WfXfJpFuEw/exec';

let currentStudentName = '', currentRoomCode = '', currentExamData = [];
let timeRemaining = 0, timerInterval;
let myLastPuntaje = 0, myLastRespuestas = {};

// ===== ESTADO DEL JUEGO (PARA PENALIZACIONES) =====
let gameState = {
  penalidadTrampa: 0
};

// ===== SISTEMA DE TEMÁTICAS ESTACIONALES =====
function applySeasonalTheme() {
  const month = new Date().getMonth() + 1; // Enero es 1, Octubre 10, Diciembre 12
  const body = document.body;
  const title = document.getElementById('app-title');
  
  body.className = ''; // Limpiar temas
  if (month === 10) {
    body.classList.add('theme-halloween');
    title.innerText = "🎃 EvaluaPro Halloween 🦇";
  } else if (month === 12) {
    body.classList.add('theme-christmas');
    title.innerText = "🎄 EvaluaPro Navideño ❄️";
  } else if (month >= 9 && month <= 11) { // Septiembre (Primavera sur)
    body.classList.add('theme-spring');
    title.innerText = "🌻 EvaluaPro Primavera 🦋";
  } else {
    body.classList.add('theme-default');
    title.innerText = "Plataforma de Evaluación";
  }
}
window.onload = applySeasonalTheme;

// ===== UTILIDADES =====
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
}
function showLoader(show) { document.getElementById('loader').style.display = show ? 'flex' : 'none'; }

async function postData(payload) {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (error) {
    alert("Error de conexión con el servidor.");
    showLoader(false);
  }
}

// ===== DOCENTE =====
function loginTeacher() {
  const pass = document.getElementById('teacher-pass').value;
  if (pass === 'T47P16I') {
    document.getElementById('teacher-pass').value = '';
    renderQuestionsForm();
    showView('view-teacher-dashboard');
  } else alert('Contraseña incorrecta');
}

function renderQuestionsForm() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    container.innerHTML += `
      <div class="q-block">
        <h4>Pregunta ${i}</h4>
        <select id="q${i}-type" onchange="toggleQuestionType(${i})" class="mb-2 font-bold text-indigo-700 bg-indigo-50">
          <option value="multiple">Opción Múltiple</option>
          <option value="text">Respuesta Abierta (Texto)</option>
        </select>
        
        <input type="text" id="q${i}-text" placeholder="Texto de la Pregunta" required>
        
        <!-- Opciones para Opción Múltiple -->
        <div id="q${i}-multiple-options">
          <input type="text" id="q${i}-oA" placeholder="A)" required>
          <input type="text" id="q${i}-oB" placeholder="B)" required>
          <input type="text" id="q${i}-oC" placeholder="C)" required>
          <input type="text" id="q${i}-oD" placeholder="D)" required>
          <select id="q${i}-correct" required>
            <option value="A">Clave: A</option><option value="B">Clave: B</option>
            <option value="C">Clave: C</option><option value="D">Clave: D</option>
          </select>
        </div>
        
        <!-- Mensaje para Respuesta Abierta -->
        <div id="q${i}-text-options" class="hidden">
          <p class="text-sm text-gray-600 italic mb-2">El alumno responderá con un cuadro de texto. Esta pregunta debe ser revisada manualmente por el docente en el PDF.</p>
        </div>
      </div>`;
  }
}

// Nueva función para alternar la vista del creador de preguntas
function toggleQuestionType(index) {
  const type = document.getElementById(`q${index}-type`).value;
  const multipleDiv = document.getElementById(`q${index}-multiple-options`);
  const textDiv = document.getElementById(`q${index}-text-options`);
  
  if (type === 'text') {
    multipleDiv.classList.add('hidden');
    textDiv.classList.remove('hidden');
    // Quitar "required" de las opciones ocultas para que deje guardar
    ['oA', 'oB', 'oC', 'oD', 'correct'].forEach(id => {
      document.getElementById(`q${index}-${id}`).removeAttribute('required');
    });
  } else {
    multipleDiv.classList.remove('hidden');
    textDiv.classList.add('hidden');
    // Volver a requerir
    ['oA', 'oB', 'oC', 'oD', 'correct'].forEach(id => {
      document.getElementById(`q${index}-${id}`).setAttribute('required', 'true');
    });
  }
}

async function submitExamCreation() {
  const code = document.getElementById('exam-code').value.trim();
  const mins = document.getElementById('exam-time').value;
  if (!code || !mins) return alert("Faltan datos.");

  let preguntas = [];
  for (let i = 1; i <= 5; i++) {
    const tipo = document.getElementById(`q${i}-type`).value;
    
    if (tipo === 'multiple') {
      preguntas.push({
        id: i, 
        tipo: 'multiple',
        texto: document.getElementById(`q${i}-text`).value,
        opciones: {
          A: document.getElementById(`q${i}-oA`).value, B: document.getElementById(`q${i}-oB`).value,
          C: document.getElementById(`q${i}-oC`).value, D: document.getElementById(`q${i}-oD`).value
        },
        correcta: document.getElementById(`q${i}-correct`).value
      });
    } else {
      preguntas.push({
        id: i, 
        tipo: 'text',
        texto: document.getElementById(`q${i}-text`).value,
        opciones: null,
        correcta: 'MANUAL'
      });
    }
  }

  showLoader(true);
  const res = await postData({ action: 'crear_examen', codigoSala: code, minutos: mins, preguntas: preguntas });
  showLoader(false);
  if (res && res.status === 'success') { alert(`Sala ${code} lista.`); }
}

async function downloadTeacherReport() {
  const code = document.getElementById('report-code').value.trim();
  if(!code) return alert("Ingresa un código de sala.");

  showLoader(true);
  const res = await postData({ action: 'obtener_resultados', codigoSala: code });
  showLoader(false);

  if (res && res.status === 'success' && res.resultados.length > 0) {
    generarPDFDocente(code, res.resultados, res.examen);
  } else {
    alert("No hay resultados o la sala no existe.");
  }
}

// ===== GENERACIÓN DE PDF CALIFICADO (ROBUSTO) =====
function generarPDFDocente(codigoSala, resultados, examen) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  if (!resultados || resultados.length === 0) {
      alert("No hay resultados de alumnos para esta sala.");
      return;
  }

  resultados.forEach((res, index) => {
    if (index > 0) doc.addPage(); 

    // Cabecera del examen tipo físico
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text("Evaluación Escrita Calificada", 105, 20, null, null, "center");
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Alumno: ${res.alumno || 'Desconocido'}`, 20, 35);
    doc.text(`Código de Sala: ${codigoSala}`, 20, 42);
    
    // Nota gigante en la esquina superior derecha
    doc.setFontSize(16);
    doc.setTextColor(192, 57, 43); 
    doc.setFont("helvetica", "bold");
    doc.text(`NOTA FINAL: ${res.puntaje || 0} / 20`, 130, 38);
    
    doc.setDrawColor(200);
    doc.line(20, 48, 190, 48);

    let y = 60; 
    
    examen.forEach((q, qIndex) => {
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      
      const preguntaTexto = q.texto ? q.texto : "Pregunta no encontrada";
      const splitQuestion = doc.splitTextToSize(`${qIndex + 1}. ${preguntaTexto}`, 170);
      doc.text(splitQuestion, 20, y);
      y += (splitQuestion.length * 6);
      
      doc.setFont("helvetica", "normal");
      const respAlumno = res.respuestas ? res.respuestas[q.id] : "Sin responder";
      
      if (q.tipo === 'multiple' || !q.tipo) {
          const esCorrecto = (respAlumno === q.correcta);
          const opcionesDisponibles = q.opciones || {}; 
          const textoAlternativaAlumno = opcionesDisponibles[respAlumno] ? opcionesDisponibles[respAlumno] : "";
          const textoRespAlumno = (respAlumno && respAlumno !== "Sin responder" && !respAlumno.startsWith("ANULADA")) ? `${respAlumno}) ${textoAlternativaAlumno}` : respAlumno;
          
          if (respAlumno && respAlumno.startsWith("ANULADA")) {
              doc.setTextColor(192, 57, 43);
              const splitAnulada = doc.splitTextToSize(`Respuesta: ${respAlumno}`, 165);
              doc.text(splitAnulada, 25, y);
              y += (splitAnulada.length * 6) + 4;
          } else if (esCorrecto) {
            doc.setTextColor(39, 174, 96);
            const splitResp = doc.splitTextToSize(`Respuesta: ${textoRespAlumno}   ( ✓ Correcto )`, 165);
            doc.text(splitResp, 25, y);
            y += (splitResp.length * 6) + 2;
          } else {
            doc.setTextColor(192, 57, 43);
            const splitResp = doc.splitTextToSize(`Respuesta: ${textoRespAlumno}   ( X Incorrecto )`, 165);
            doc.text(splitResp, 25, y);
            y += (splitResp.length * 6);
            doc.setTextColor(0, 0, 0);
            doc.text(`Clave correcta: ${q.correcta}) ${opcionesDisponibles[q.correcta] || ''}`, 25, y);
            y += 8;
          }
      } else {
          // Pregunta Abierta
          doc.setTextColor(41, 128, 185); // Azul para diferenciar respuestas manuales
          doc.text(`Respuesta libre del alumno:`, 25, y);
          y += 6;
          doc.setTextColor(0, 0, 0);
          const splitLibre = doc.splitTextToSize(`"${respAlumno}"`, 160);
          doc.text(splitLibre, 25, y);
          y += (splitLibre.length * 6) + 4;
          doc.setTextColor(142, 68, 173); // Morado para nota manual
          doc.text(`[   ] Evaluación Manual Docente`, 25, y);
          y += 8;
      }
      
      if (y > 270) { doc.addPage(); y = 20; }
    });
  });

  doc.save(`Examenes_Calificados_Sala_${codigoSala}.pdf`);
}

// Variables para control de paginación y tiempo individual
let currentQuestionIndex = 0;
let timePerQuestion = 0;
let totalQuestions = 0;
let resTempMinutos = 0;
let temporalRespuestas = {};

// ===== NUEVAS VARIABLES ANTI-TRAMPA =====
let cheatWarnings = 0;
let isExamActive = false;

// ===== ALUMNO =====
async function loginStudent() {
  const name = document.getElementById('student-name').value.trim();
  const code = document.getElementById('student-code').value.trim();
  if (!name || !code) return alert("Completa tus datos.");

  showLoader(true);
  const res = await postData({ action: 'ingresar_sala', codigoSala: code });
  showLoader(false);

  if (res && res.status === 'success') {
    currentStudentName = name; currentRoomCode = code; currentExamData = res.examen;
    resTempMinutos = res.minutos; // Guardamos los minutos totales
    startExam();
  } else alert("Sala inactiva.");
}

function startExam() {
  document.getElementById('display-student').innerText = currentStudentName;
  
  // Dividir el tiempo total en partes iguales (minutos a segundos)
  totalQuestions = currentExamData.length;
  const totalSeconds = parseInt(resTempMinutos) * 60; 
  timePerQuestion = Math.floor(totalSeconds / totalQuestions);
  
  currentQuestionIndex = 0;
  temporalRespuestas = {}; // Reiniciar respuestas
  
  // INICIAR VIGILANCIA ANTI-TRAMPA
  cheatWarnings = 0;
  isExamActive = true;
  gameState.penalidadTrampa = 0; // Reiniciar penalizaciones
  
  showView('view-exam');
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const container = document.getElementById('student-questions-container');
  container.innerHTML = '';
  
  clearInterval(timerInterval);
  timeRemaining = timePerQuestion;
  updateTimerDisplay();

  const q = currentExamData[currentQuestionIndex];
  
  const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  document.getElementById('exam-progress').style.width = `${progressPercent}%`;

  let interactableHTML = '';
  
  if (q.tipo === 'multiple' || !q.tipo) {
    const opciones = q.opciones || {};
    interactableHTML = `
      <label class="option-label" onclick="selectOption(this)"><input type="radio" name="resp_${q.id}" value="A" style="display:none;"> A) ${opciones.A || ''}</label>
      <label class="option-label" onclick="selectOption(this)"><input type="radio" name="resp_${q.id}" value="B" style="display:none;"> B) ${opciones.B || ''}</label>
      <label class="option-label" onclick="selectOption(this)"><input type="radio" name="resp_${q.id}" value="C" style="display:none;"> C) ${opciones.C || ''}</label>
      <label class="option-label" onclick="selectOption(this)"><input type="radio" name="resp_${q.id}" value="D" style="display:none;"> D) ${opciones.D || ''}</label>
    `;
  } else {
    interactableHTML = `
      <textarea id="resp_text_${q.id}" rows="6" class="w-full border-2 border-indigo-300 rounded-lg p-3 text-gray-700 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Escribe tu respuesta aquí..."></textarea>
    `;
  }

  container.innerHTML = `
    <div class="question-container active">
      <h4 style="color: var(--accent); margin-bottom: 15px;">Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}</h4>
      <p style="font-size: 18px; margin-bottom: 20px;"><strong>${q.texto}</strong></p>
      ${interactableHTML}
    </div>`;

  if (currentQuestionIndex < totalQuestions - 1) {
    document.getElementById('btn-next-question').style.display = 'block';
    document.getElementById('btn-finish-exam').style.display = 'none';
  } else {
    document.getElementById('btn-next-question').style.display = 'none';
    document.getElementById('btn-finish-exam').style.display = 'block';
  }

  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      if (currentQuestionIndex < totalQuestions - 1) nextQuestion(); 
      else finishExam(); 
    }
  }, 1000);
}

function updateTimerDisplay() {
  let m = Math.floor(timeRemaining / 60);
  let s = timeRemaining % 60;
  document.getElementById('timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Resaltar visualmente la opción seleccionada por el alumno
function selectOption(labelElement) {
  const container = document.getElementById('student-questions-container');
  const labels = container.querySelectorAll('.option-label');
  labels.forEach(l => {
    l.classList.remove('selected');
    l.style.backgroundColor = '#fff';
    l.style.borderColor = '#ccc';
  });
  
  labelElement.classList.add('selected');
  labelElement.querySelector('input').checked = true;
}

function nextQuestion() {
  const q = currentExamData[currentQuestionIndex];
  if (q.tipo === 'multiple' || !q.tipo) {
    const seleccion = document.querySelector(`input[name="resp_${q.id}"]:checked`);
    temporalRespuestas[q.id] = seleccion ? seleccion.value : "Sin responder";
  } else {
    const textoArea = document.getElementById(`resp_text_${q.id}`);
    temporalRespuestas[q.id] = textoArea ? textoArea.value.trim() : "Sin responder";
  }

  currentQuestionIndex++;
  renderCurrentQuestion();
}

async function finishExam() {
  // 1. BLOQUEAR EL BOTÓN INMEDIATAMENTE
  const btnFinish = document.getElementById('btn-finish-exam');
  if (btnFinish.disabled) return; 
  
  btnFinish.disabled = true; 
  const originalText = btnFinish.innerHTML;
  btnFinish.innerHTML = '⏳ Enviando Evaluación...';
  
  clearInterval(timerInterval);
  isExamActive = false; // DETENER VIGILANCIA ANTI-TRAMPA
  
  // Guardar la respuesta de la última pregunta en pantalla
  const q = currentExamData[currentQuestionIndex];
  if (q.tipo === 'multiple' || !q.tipo) {
    const seleccion = document.querySelector(`input[name="resp_${q.id}"]:checked`);
    temporalRespuestas[q.id] = seleccion ? seleccion.value : "Sin responder";
  } else {
    const textoArea = document.getElementById(`resp_text_${q.id}`);
    temporalRespuestas[q.id] = textoArea ? textoArea.value.trim() : "Sin responder";
  }

  let puntaje = 0;

  // Evaluar las respuestas acumuladas vs la clave
  currentExamData.forEach(pregunta => {
    if (pregunta.tipo === 'multiple' || !pregunta.tipo) {
      const valor = temporalRespuestas[pregunta.id];
      if (valor === pregunta.correcta) puntaje += 4; 
    }
  });

  // Aplicar las penalizaciones acumuladas por trampa
  if (gameState.penalidadTrampa) {
      puntaje += gameState.penalidadTrampa;
  }

  // Asegurar que el puntaje no sea negativo
  if (puntaje < 0) puntaje = 0;

  showLoader(true);
  
  try {
      const res = await postData({
        action: 'enviar_examen', codigoSala: currentRoomCode,
        nombreAlumno: currentStudentName, respuestas: temporalRespuestas, puntaje: puntaje
      });
      showLoader(false);

      if (res && res.status === 'success') {
        myLastPuntaje = puntaje;
        myLastRespuestas = temporalRespuestas;
        
        document.getElementById('final-score-number').innerText = puntaje;
        showView('view-result');
      } else {
        throw new Error("El servidor devolvió un error al guardar el examen.");
      }
  } catch (error) {
      // 2. REHABILITAR EL BOTÓN SI EL ENVÍO FALLA
      showLoader(false);
      btnFinish.disabled = false;
      btnFinish.innerHTML = originalText;
      alert("Error de conexión al enviar su evaluación. Su internet podría estar fallando. Por favor, intente enviarlo nuevamente.");
  }
}

// ===== DESCARGA DE EXAMEN EN BLANCO =====
async function downloadBlankExam() {
  const code = document.getElementById('report-code').value.trim();
  if(!code) return alert("Ingresa un código de sala para descargar el examen en blanco.");

  showLoader(true);
  // Reutilizamos el endpoint de obtener_resultados porque nos devuelve el 'examen' íntegro
  const res = await postData({ action: 'obtener_resultados', codigoSala: code });
  showLoader(false);

  if (res && res.status === 'success' && res.examen) {
    generarPDFExamenBlanco(code, res.examen);
  } else {
    alert("La sala no existe o no tiene un examen registrado.");
  }
}

// ===== GENERACIÓN DE PDF EXAMEN EN BLANCO (ROBUSTO) =====
function generarPDFExamenBlanco(codigoSala, examen) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  if (!examen || examen.length === 0) {
      alert("El examen no tiene preguntas registradas.");
      return;
  }

  // Cabecera del examen físico
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Examen de Evaluación", 105, 20, null, null, "center");
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Nombre del Alumno: __________________________________________________", 20, 35);
  doc.text(`Código de Sala: ${codigoSala}`, 20, 45);
  doc.text("Fecha: _____________________", 130, 45);
  
  doc.setDrawColor(0);
  doc.line(20, 52, 190, 52);

  let y = 65;
  
  // Imprimir preguntas y alternativas completas
  examen.forEach((q, qIndex) => {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    
    // Pregunta
    const preguntaTexto = q.texto ? q.texto : "Pregunta no encontrada";
    const splitQuestion = doc.splitTextToSize(`${qIndex + 1}. ${preguntaTexto}`, 170);
    doc.text(splitQuestion, 20, y);
    y += (splitQuestion.length * 6) + 2;
    
    // Alternativas completas (solo para opción múltiple)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    if (q.tipo === 'multiple' || !q.tipo) {
      const opcionesClaves = ['A', 'B', 'C', 'D'];
      const opcionesDisponibles = q.opciones || {}; 
      
      opcionesClaves.forEach(opt => {
        const textoOpcion = `${opt}) ${opcionesDisponibles[opt] ? opcionesDisponibles[opt] : '_________'}`;
        const splitOpcion = doc.splitTextToSize(textoOpcion, 160);
        doc.text(splitOpcion, 25, y);
        y += (splitOpcion.length * 6) + 2;
      });
    } else {
      // Pregunta abierta: líneas para escribir
      doc.text("Respuesta:", 25, y);
      y += 8;
      for (let l = 0; l < 4; l++) {
        doc.line(25, y, 185, y);
        y += 8;
      }
    }
    
    y += 8; // Espacio extra entre preguntas
    
    // Salto de página preventivo para evitar que se corte el texto
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`Examen_Blanco_Sala_${codigoSala}.pdf`);
}

// ===== MOTOR ANTI-TRAMPAS (REGISTRO TÉCNICO DETALLADO) =====
// 1. Detectar si minimiza o cambia de pestaña
document.addEventListener("visibilitychange", () => {
  if (document.hidden && isExamActive) {
    handleCheatWarning("El navegador fue minimizado o se cambió a una pestaña oculta.");
  }
});

// 2. Detectar si abre otra app en pantalla dividida o pierde el foco
window.addEventListener("blur", () => {
  if (isExamActive) {
    handleCheatWarning("El examen perdió el foco principal (posible apertura de otra aplicación, menú del celular o pantalla dividida).");
  }
});

// 3. Bloqueos de teclado y mouse (solo activos durante el examen)
document.addEventListener('contextmenu', event => { if(isExamActive) event.preventDefault(); });
document.addEventListener('copy', event => { if(isExamActive) event.preventDefault(); });
document.addEventListener('paste', event => { if(isExamActive) event.preventDefault(); });

function handleCheatWarning(motivo) {
  cheatWarnings++;
  
  // PRIMERA INFRACCIÓN: Solo advertencia
  if (cheatWarnings === 1) {
    alert(`¡ADVERTENCIA ANTI-TRAMPA (1/2)!\nDetalle: ${motivo}\n\nEstá prohibido salir de la ventana de la evaluación. A tu próxima infracción, la pregunta en la que estés será ANULADA y se restarán 2 puntos de tu calificación global.`);
    return;
  }

  // SEGUNDA Y TERCERA INFRACCIÓN: Anulación documentada
  const qActual = currentExamData[currentQuestionIndex];
  temporalRespuestas[qActual.id] = `ANULADA (${motivo})`;

  if (!gameState.penalidadTrampa) gameState.penalidadTrampa = 0;
  gameState.penalidadTrampa -= 2;

  if (cheatWarnings === 2) {
    alert(`¡ADVERTENCIA ANTI-TRAMPA (2/2)!\nDetalle: ${motivo}\n\nLa pregunta actual ha sido ANULADA y se han RESTADO 2 puntos de tu calificación global. A tu próxima infracción tu examen será cancelado por completo.`);
    
    if (currentQuestionIndex < totalQuestions - 1) {
      clearInterval(timerInterval);
      currentQuestionIndex++;
      renderCurrentQuestion();
    } else {
      finishExam(); 
    }
  } 
  else if (cheatWarnings >= 3) {
    alert(`¡INFRACCIÓN CRÍTICA!\nDetalle: ${motivo}\n\nHas superado el límite de advertencias permitidas. Tu evaluación ha sido cancelada.\nSe han descontado 2 puntos adicionales por esta infracción.`);
    finishExam(); 
  }
}

// Registro PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}