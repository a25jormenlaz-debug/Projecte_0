let preguntesPartida = [];
let sessionId = null;
let intervalTemps = null;

let estatDeLaPartida = {
  contadorPreguntes: 0,
  respostesUsuari: [],
  temps: 0
};

comprovarUsuari();

// Formulari del nom
document.getElementById("formNom").addEventListener("submit", function (event) {
  event.preventDefault();
  const nom = document.getElementById("inputNom").value.trim();
  if (nom !== "") {
    localStorage.setItem("nom", nom);
    mostrarSalutacio(nom);
  }
});

// Botó per esborrar el nom
document.getElementById("btnEsborrar").addEventListener("click", function () {
  localStorage.removeItem("nom");
  mostrarFormulari();
});

// Delegació d'esdeveniments a les respostes
document.getElementById("partida").addEventListener("click", function (event) {
  if (event.target.classList.contains("boto-resposta")) {
    const indexResposta = Number(event.target.dataset.index);
    respondre(indexResposta);
  }
});

// Botó "Enviar resultats": envia les respostes al servidor
document.getElementById("btnEnviar").addEventListener("click", function () {
  fetch('/finalitza', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId,
      respostes: estatDeLaPartida.respostesUsuari
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        document.getElementById("partida").innerHTML = `<p>Error: ${data.error}</p>`;
        return;
      }
            document.getElementById("partida").innerHTML =
        `<p class="alert alert-success fs-5 mb-0">Has encertat ${data.correctes} de ${data.total} preguntes en ${estatDeLaPartida.temps} segons.</p>`;
      document.getElementById("btnEnviar").classList.add("hidden");
    });
});

function comprovarUsuari() {
  const nom = localStorage.getItem("nom");
  if (nom) {
    mostrarSalutacio(nom);
  } else {
    mostrarFormulari();
  }
}

function mostrarSalutacio(nom) {
  document.getElementById("formNom").classList.add("hidden");
  document.getElementById("salutacio").classList.remove("hidden");
  document.getElementById("joc").classList.remove("hidden");
  document.getElementById("textSalutacio").textContent = `Hola, ${nom}!`;
  iniciarPartida();
}

function mostrarFormulari() {
  clearInterval(intervalTemps);
  document.getElementById("formNom").classList.remove("hidden");
  document.getElementById("salutacio").classList.add("hidden");
  document.getElementById("joc").classList.add("hidden");
  document.getElementById("inputNom").value = "";
}

function iniciarPartida() {
  fetch('/getPreguntes?num=10')
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        document.getElementById("partida").innerHTML = `<p>Error: ${data.error}</p>`;
        return;
      }

      sessionId = data.sessionId;
      preguntesPartida = data.questions;

      estatDeLaPartida.contadorPreguntes = 0;
      estatDeLaPartida.respostesUsuari = [];
      estatDeLaPartida.temps = 0;

      document.getElementById("btnEnviar").classList.add("hidden");
      renderitzarMarcador();
      renderitzarTemps();
      iniciarTemporitzador();
      mostrarPregunta();
    });
}

function iniciarTemporitzador() {
  clearInterval(intervalTemps);
  intervalTemps = setInterval(function () {
    estatDeLaPartida.temps++;
    renderitzarTemps();
  }, 1000);
}

function mostrarPregunta() {
  const pregunta = preguntesPartida[estatDeLaPartida.contadorPreguntes];
  const divPartida = document.getElementById("partida");

  let html = `
    <h2 class="h4 mb-3">${pregunta.question}</h2>
    <img src="${pregunta.image}" alt="Bandera" class="img-fluid mb-3 border" style="max-height: 150px;">
    <div class="d-grid gap-2">
  `;

  for (let i = 0; i < pregunta.answers.length; i++) {
    html += `<button class="btn btn-outline-primary boto-resposta" data-index="${i}">${pregunta.answers[i]}</button>`;
  }

  html += `</div>`;
  divPartida.innerHTML = html;
}

function respondre(indexResposta) {
  estatDeLaPartida.respostesUsuari.push(indexResposta);
  estatDeLaPartida.contadorPreguntes++;
  renderitzarMarcador();

  if (estatDeLaPartida.contadorPreguntes < preguntesPartida.length) {
    mostrarPregunta();
  } else {
    clearInterval(intervalTemps);
        document.getElementById("partida").innerHTML =
      `<p class="fs-5 mb-0">Has respost totes les preguntes en ${estatDeLaPartida.temps} segons!</p>`;
    document.getElementById("btnEnviar").classList.remove("hidden");
  }
}

function renderitzarMarcador() {
  document.getElementById("marcador").innerHTML =
    `Preguntes respostes: ${estatDeLaPartida.contadorPreguntes} de ${preguntesPartida.length}`;
}

function renderitzarTemps() {
  document.getElementById("temps").innerHTML = `Temps: ${estatDeLaPartida.temps} s`;
}