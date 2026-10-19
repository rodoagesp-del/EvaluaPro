// NUEVO LINK ASIGNADO
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZc3mIbD6Q83gohbWp-uTE3jjZVGLSAPqBErfFNn-sMWLi4EwsFg43Kki5WfXfJpFuEw/exec';

let currentStudentName = '', currentRoomCode = '', currentExamData = [];
let timeRemaining = 0, timerInterval;
let myLastPuntaje = 0, myLastRespuestas = {};

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
        <input type="text" id="q${i}-text" placeholder="Pregunta" required>
        <input type="text" id="q${i}-oA" placeholder="A)" required>
        <input type="text" id="q${i}-oB" placeholder="B)" required>
        <input type="text" id="q${i}-oC" placeholder="C)" required>
        <input type="text" id="q${i}-oD" placeholder="D)" required>
        <select id="q${i}-correct" required>
          <option value="A">Clave: A</option><option value="B">Clave: B</option>
          <option value="C">Clave: C</option><option value="D">Clave: D</option>
        </select>
      </div>`;
  }
}

async function submitExamCreation() {
  const code = document.getElementById('exam-code').value.trim();
  const mins = document.getElementById('exam-time').value;
  if (!code || !mins) return alert("Faltan datos.");

  let preguntas = [];
  for (let i = 1; i <= 5; i++) {
    preguntas.push({
      id: i, texto: document.getElementById(`q${i}-text`).value,
      opciones: {
        A: document.getElementById(`q${i}-oA`).value, B: document.getElementById(`q${i}-oB`).value,
        C: document.getElementById(`q${i}-oC`).value, D: document.getElementById(`q${i}-oD`).value
      },
      correcta: document.getElementById(`q${i}-correct`).value
    });
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
      
      const respAlumnoClave = res.respuestas ? res.respuestas[q.id] : null;
      const esCorrecto = (respAlumnoClave === q.correcta);
      
      // Protección contra datos antiguos
      const opcionesDisponibles = q.opciones || {}; 
      const textoAlternativaAlumno = opcionesDisponibles[respAlumnoClave] ? opcionesDisponibles[respAlumnoClave] : "";
      const textoAlternativaCorrecta = opcionesDisponibles[q.correcta] ? opcionesDisponibles[q.correcta] : "";

      // Obtener el texto completo de las alternativas
      const textoRespAlumno = (respAlumnoClave && respAlumnoClave !== "Sin responder") 
                              ? `${respAlumnoClave}) ${textoAlternativaAlumno}` 
                              : 'Sin marcar';
      const textoRespCorrecta = `${q.correcta}) ${textoAlternativaCorrecta}`;
      
      if (esCorrecto) {
        doc.setTextColor(39, 174, 96); // Verde para correcto
        const splitResp = doc.splitTextToSize(`Respuesta del alumno: ${textoRespAlumno}   ( ✓ Correcto )`, 165);
        doc.text(splitResp, 25, y);
        y += (splitResp.length * 6) + 4;
      } else {
        doc.setTextColor(192, 57, 43); // Rojo para incorrecto
        const splitResp = doc.splitTextToSize(`Respuesta del alumno: ${textoRespAlumno}   ( X Incorrecto )`, 165);
        doc.text(splitResp, 25, y);
        y += (splitResp.length * 6) + 2;
        
        doc.setTextColor(0, 0, 0); // Negro para mostrar corrección
        const splitCorr = doc.splitTextToSize(`La respuesta correcta era: ${textoRespCorrecta}`, 165);
        doc.text(splitCorr, 25, y);
        y += (splitCorr.length * 6) + 4;
      }
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  });

  doc.save(`Examenes_Calificados_Sala_${codigoSala}.pdf`);
}

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
    timeRemaining = parseInt(res.minutos) * 60;
    startExam();
  } else alert("Sala inactiva.");
}

function startExam() {
  document.getElementById('display-student').innerText = currentStudentName;
  const container = document.getElementById('student-questions-container');
  container.innerHTML = '';

  currentExamData.forEach(q => {
    container.innerHTML += `
      <div class="question-item">
        <h4>${q.id}. ${q.texto}</h4>
        <label class="option-label"><input type="radio" name="resp_${q.id}" value="A"> A) ${q.opciones.A}</label>
        <label class="option-label"><input type="radio" name="resp_${q.id}" value="B"> B) ${q.opciones.B}</label>
        <label class="option-label"><input type="radio" name="resp_${q.id}" value="C"> C) ${q.opciones.C}</label>
        <label class="option-label"><input type="radio" name="resp_${q.id}" value="D"> D) ${q.opciones.D}</label>
      </div>`;
  });

  showView('view-exam');
  
  timerInterval = setInterval(() => {
    timeRemaining--;
    let m = Math.floor(timeRemaining / 60);
    let s = timeRemaining % 60;
    document.getElementById('timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    if (timeRemaining <= 0) finishExam();
  }, 1000);
}

async function finishExam() {
  clearInterval(timerInterval);
  let respuestas = {};
  let puntaje = 0;

  currentExamData.forEach(q => {
    const seleccion = document.querySelector(`input[name="resp_${q.id}"]:checked`);
    const valor = seleccion ? seleccion.value : "Sin responder";
    respuestas[q.id] = valor;
    if (valor === q.correcta) puntaje += 4; 
  });

  showLoader(true);
  const res = await postData({
    action: 'enviar_examen', codigoSala: currentRoomCode,
    nombreAlumno: currentStudentName, respuestas: respuestas, puntaje: puntaje
  });
  showLoader(false);

  if (res && res.status === 'success') {
    // Guardar para referencia interna
    myLastPuntaje = puntaje;
    myLastRespuestas = respuestas;
    
    // Mostrar nota gigante
    document.getElementById('final-score-number').innerText = puntaje;
    showView('view-result');
  } else alert("Error al enviar.");
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
    
    // Alternativas completas
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const opcionesClaves = ['A', 'B', 'C', 'D'];
    const opcionesDisponibles = q.opciones || {}; 
    
    opcionesClaves.forEach(opt => {
      const textoOpcion = `${opt}) ${opcionesDisponibles[opt] ? opcionesDisponibles[opt] : '_________'}`;
      const splitOpcion = doc.splitTextToSize(textoOpcion, 160);
      doc.text(splitOpcion, 25, y);
      y += (splitOpcion.length * 6) + 2;
    });
    
    y += 8; // Espacio extra entre preguntas
    
    // Salto de página preventivo para evitar que se corte el texto
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`Examen_Blanco_Sala_${codigoSala}.pdf`);
}

// Registro PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}